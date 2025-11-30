// Restore MongoDB from S3 tar.gz created by backup_mongo_to_s3.js
// It downloads the latest (or specified) archive, extracts JSONL per collection,
// and imports them into the target database. Optional: clear collections before.
//
// Required env:
// - MONGODB_URI
// - S3_BUCKET, S3_REGION, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY
// Optional env:
// - S3_PREFIX (default: mongo_backups)
// - BACKUP_DB_NAME (if MONGODB_URI lacks db path)
// - S3_OBJECT_KEY (if you want to restore a specific key)
// - CLEAR_BEFORE_RESTORE=true (drops or empties collections before import)

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const readline = require('readline');
const { MongoClient } = require('mongodb');
const { S3Client, ListObjectsV2Command, GetObjectCommand } = require('@aws-sdk/client-s3');

function log(msg) { console.log(`[restore] ${msg}`); }

async function main() {
  const mongoUri = process.env.MONGODB_URI;
  const s3Bucket = process.env.S3_BUCKET;
  const s3Region = process.env.S3_REGION || 'us-east-1';
  const s3KeyPrefix = (process.env.S3_PREFIX || 'mongo_backups').replace(/\/+$/, '');
  const dbName = process.env.BACKUP_DB_NAME || extractDbName(mongoUri);
  const objectKeyProvided = process.env.S3_OBJECT_KEY || null;
  const clearBefore = (process.env.CLEAR_BEFORE_RESTORE || '').toLowerCase() === 'true';

  if (!mongoUri || !s3Bucket || !process.env.S3_ACCESS_KEY_ID || !process.env.S3_SECRET_ACCESS_KEY) {
    throw new Error('Missing required env vars: MONGODB_URI, S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY');
  }
  if (!dbName) {
    throw new Error('Could not determine target database name. Set BACKUP_DB_NAME or include DB in MONGODB_URI.');
  }

  const s3 = new S3Client({
    region: s3Region,
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
    }
  });

  const key = objectKeyProvided || await resolveLatestKey(s3, s3Bucket, `${s3KeyPrefix}/${dbName}/`);
  if (!key) throw new Error('No backup archive found in S3 for the given prefix/db.');
  log(`Using S3 object key: ${key}`);

  const tmpDir = path.join(process.cwd(), 'tmp_restore');
  fs.mkdirSync(tmpDir, { recursive: true });
  const tarName = path.basename(key);
  const tarPath = path.join(tmpDir, tarName);

  await downloadToFile(s3, s3Bucket, key, tarPath);
  const extractDir = path.join(tmpDir, `${dbName}_${Date.now()}`);
  fs.mkdirSync(extractDir, { recursive: true });
  await extractTarGz(tarPath, extractDir);
  log(`Extracted to: ${extractDir}`);

  const client = new MongoClient(mongoUri);
  await client.connect();
  const db = client.db(dbName);

  const files = fs.readdirSync(extractDir).filter(f => f.endsWith('.jsonl'));
  log(`Found ${files.length} collections to import`);

  for (const file of files) {
    const collectionName = path.basename(file, '.jsonl');
    const filePath = path.join(extractDir, file);
    log(`Importing ${collectionName} from ${filePath}`);
    const collection = db.collection(collectionName);
    if (clearBefore) {
      try {
        log(`Clearing collection ${collectionName} before import`);
        await collection.deleteMany({});
      } catch (e) {
        log(`Warning: could not clear ${collectionName}: ${e.message}`);
      }
    }
    await importJsonl(collection, filePath);
  }

  await client.close();
  log('Restore completed successfully');
}

async function resolveLatestKey(s3, bucket, prefix) {
  log(`Listing S3 objects with prefix: ${prefix}`);
  let token = undefined;
  let latest = null;
  do {
    const resp = await s3.send(new ListObjectsV2Command({ Bucket: bucket, Prefix: prefix, ContinuationToken: token }));
    const contents = resp.Contents || [];
    for (const obj of contents) {
      if (!obj.Key.endsWith('.tar.gz')) continue;
      if (!latest || new Date(obj.LastModified) > new Date(latest.LastModified)) {
        latest = obj;
      }
    }
    token = resp.IsTruncated ? resp.NextContinuationToken : undefined;
  } while (token);
  return latest?.Key || null;
}

async function downloadToFile(s3, bucket, key, destPath) {
  log(`Downloading s3://${bucket}/${key} to ${destPath}`);
  const resp = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  await streamToFile(resp.Body, destPath);
}

function streamToFile(stream, destPath) {
  return new Promise((resolve, reject) => {
    const ws = fs.createWriteStream(destPath);
    stream.pipe(ws);
    ws.on('finish', resolve);
    ws.on('error', reject);
    stream.on('error', reject);
  });
}

function extractTarGz(tarPath, outDir) {
  return new Promise((resolve, reject) => {
    const tar = spawn('tar', ['-xzf', tarPath, '-C', outDir], { stdio: 'inherit' });
    tar.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`tar exited with code ${code}`));
    });
  });
}

async function importJsonl(collection, filePath) {
  const rl = readline.createInterface({ input: fs.createReadStream(filePath), crlfDelay: Infinity });
  const batch = [];
  const BATCH_SIZE = 1000;
  let total = 0;
  for await (const line of rl) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const doc = JSON.parse(trimmed);
      batch.push(doc);
      if (batch.length >= BATCH_SIZE) {
        await collection.insertMany(batch, { ordered: false });
        total += batch.length;
        batch.length = 0;
      }
    } catch (e) {
      // Skip malformed lines
    }
  }
  if (batch.length > 0) {
    await collection.insertMany(batch, { ordered: false });
    total += batch.length;
  }
  log(`Imported ${total} documents into ${collection.collectionName}`);
}

function extractDbName(uri) {
  try {
    const u = new URL(uri);
    const dbFromPath = u.pathname.replace(/^\//, '');
    return dbFromPath || null;
  } catch (_) {
    return null;
  }
}

main().catch(err => {
  console.error('[restore] Error:', err);
  process.exit(1);
});