#!/usr/bin/env node
// Aggregate empty equipment_applications events from JSONL log
const fs = require('fs');
const path = require('path');

const LOG = path.join(__dirname, '..', 'reports', 'empty_equipment_applications.jsonl');

function readLines(file) {
  try {
    return fs.readFileSync(file, 'utf8').split(/\r?\n/).filter(Boolean);
  } catch (e) {
    console.error('Log file not found:', file);
    process.exit(1);
  }
}

function aggregate(lines) {
  const byCode = new Map();
  const bySource = new Map();
  const byDuty = new Map();
  for (const line of lines) {
    let obj; try { obj = JSON.parse(line); } catch (_) { continue; }
    const code = String(obj.code || obj.query || '').toUpperCase();
    const source = String(obj.source || 'UNKNOWN').toUpperCase();
    const duty = String(obj.duty || 'UNKNOWN').toUpperCase();
    byCode.set(code, (byCode.get(code) || 0) + 1);
    bySource.set(source, (bySource.get(source) || 0) + 1);
    byDuty.set(duty, (byDuty.get(duty) || 0) + 1);
  }
  const toArray = (m) => Array.from(m.entries()).sort((a,b)=>b[1]-a[1]);
  return { byCode: toArray(byCode), bySource: toArray(bySource), byDuty: toArray(byDuty) };
}

function printReport(agg) {
  console.log('=== Empty equipment_applications report ===');
  console.log('\nTop codes:');
  for (const [code, count] of agg.byCode.slice(0, 25)) {
    console.log(`  ${code}: ${count}`);
  }
  console.log('\nBy source:');
  for (const [source, count] of agg.bySource) {
    console.log(`  ${source}: ${count}`);
  }
  console.log('\nBy duty:');
  for (const [duty, count] of agg.byDuty) {
    console.log(`  ${duty}: ${count}`);
  }
}

const lines = readLines(LOG);
const agg = aggregate(lines);
printReport(agg);