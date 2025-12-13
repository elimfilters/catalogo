// Self-Heal Rules Cron
// Procesa data/errorLog.json, detecta patrones repetidos y escribe reglas aprendidas en skuRules.json
const fs = require('fs');
const path = require('path');
const https = require('https');
const { URL } = require('url');

const LOG_PATH = path.join(__dirname, '..', 'data', 'errorLog.json');
const SKU_RULES_PATH = path.join(__dirname, '..', 'config', 'skuRules.json');

function normalize(s) {
  return String(s || '').trim().toUpperCase();
}

function readJSONSafe(p, fallback) {
  try {
    const raw = fs.readFileSync(p, 'utf8');
    return JSON.parse(raw || JSON.stringify(fallback));
  } catch (_) {
    return fallback;
  }
}

function writeJSONPretty(p, obj) {
  fs.writeFileSync(p, JSON.stringify(obj, null, 2), 'utf8');
}

function extractPrefixToken(entry) {
  const sig = String(entry.family_inference_signals || '');
  const m = sig.match(/prefix:([^|]+)/i);
  let token = m ? m[1] : '';
  token = normalize(token);
  if (!token || token === 'NONE') {
    const code = normalize(entry.failed_query_code || '');
    // Heurística: si es numérico largo, usar marcador 'LONG_NUMERIC'
    if (/^\d{5,}$/.test(code)) return 'LONG_NUMERIC';
    // Si hay letras iniciales de 1-4 y luego dígitos, tomar ese prefijo literal
    const m2 = code.match(/^([A-Z]{1,4}\d{1,3})/);
    if (m2) return normalize(m2[1]);
  }
  return token;
}

function groupFailuresByPrefix(failures) {
  const groups = new Map();
  for (const f of failures) {
    const token = extractPrefixToken(f);
    if (!token) continue;
    const sugg = normalize(f.suggested_family_duty || '');
    if (!groups.has(token)) groups.set(token, new Map());
    const g = groups.get(token);
    g.set(sugg, (g.get(sugg) || 0) + 1);
  }
  return groups;
}

function pickDominantSuggestion(distMap) {
  let best = null; let bestCount = 0; let total = 0;
  for (const [s, c] of distMap) { total += c; if (c > bestCount) { best = s; bestCount = c; } }
  const confidence = total > 0 ? bestCount / total : 0;
  return { suggestion: best, count: bestCount, total, confidence };
}

function countFailuresInWindow(failures, startMs, endMs) {
  let count = 0;
  for (const f of failures) {
    const t = Date.parse(String(f.error_timestamp || ''));
    if (!isNaN(t) && t >= startMs && t < endMs) count++;
  }
  return count;
}

function postWebhook(url, payload) {
  return new Promise((resolve, reject) => {
    try {
      const u = new URL(url);
      const data = Buffer.from(JSON.stringify(payload));
      const opts = {
        method: 'POST',
        hostname: u.hostname,
        path: u.pathname + (u.search || ''),
        port: u.port || (u.protocol === 'https:' ? 443 : 80),
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': data.length,
        },
      };
      const req = https.request(opts, (res) => {
        res.on('data', () => {});
        res.on('end', resolve);
      });
      req.on('error', reject);
      req.write(data);
      req.end();
    } catch (e) { reject(e); }
  });
}

function buildSlackBlocks() {
  return [
    {
      type: 'header',
      text: { type: 'plain_text', text: '🚨 ACCIÓN REQUERIDA: ESTABILIZACIÓN DEL APRENDIZAJE CRON 📈' }
    },
    {
      type: 'section',
      fields: [
        { type: 'mrkdwn', text: '*Razón:* La densidad de fallos ha caído un 80% o más en las últimas 48 horas.' },
        { type: 'mrkdwn', text: '*Servicio:* `self-heal-cron`' },
        { type: 'mrkdwn', text: '*Ventana de Medición:* Cumplió la reducción de fallos entre t‑96h y t‑48h.' }
      ]
    },
    {
      type: 'context',
      elements: [
        { type: 'mrkdwn', text: '👉 **FAVOR DE CAMBIAR `SELF_HEAL_THRESHOLD` de 3 a 5** para la fase de robustez a largo plazo.' }
      ]
    }
  ];
}

async function notifyStabilization(lastCount, prevCount) {
  const url = process.env.SELF_HEAL_WEBHOOK_URL;
  const msg = '🚨 AVISO DE ESTABILIZACIÓN DEL CATÁLOGO (Umbral al 99.9%) 🛡️';
  if (!url) {
    console.log('ℹ️ SELF_HEAL_WEBHOOK_URL no definido; se omite notificación.');
    return;
  }
  try {
    const payload = { text: msg, lastWindow: lastCount, prevWindow: prevCount };
    if (url.includes('slack.com')) {
      payload.blocks = buildSlackBlocks();
    }
    await postWebhook(url, payload);
    console.log('🔔 Notificación de estabilización enviada al webhook.');
  } catch (e) {
    console.log('⚠️  Falló envío de webhook:', e.message);
  }
}

async function checkStabilizationAndNotify(failures) {
  const HOURS = Number(process.env.SELF_HEAL_STABILIZATION_HOURS || 48);
  const TARGET = Number(process.env.SELF_HEAL_REDUCTION_TARGET || 0.8); // 80%
  const MIN_PREV = Number(process.env.SELF_HEAL_MIN_PREV_COUNT || 30);
  const now = Date.now();
  const lastStart = now - HOURS * 3600_000;
  const prevStart = now - 2 * HOURS * 3600_000;
  const lastCount = countFailuresInWindow(failures, lastStart, now);
  const prevCount = countFailuresInWindow(failures, prevStart, lastStart);
  console.log(`📈 Monitoreo: prev=${prevCount} (t-${2*HOURS}h→t-${HOURS}h), last=${lastCount} (t-${HOURS}h→t)`);
  if (prevCount >= MIN_PREV) {
    const thresholdCount = Math.ceil(prevCount * (1 - TARGET));
    if (lastCount <= thresholdCount) {
      console.log(`📉 Estabilización detectada: reducción ≥ ${(TARGET*100).toFixed(0)}%`);
      await notifyStabilization(lastCount, prevCount);
    } else {
      console.log('↪️  Aún no se alcanza condición de estabilización.');
    }
  } else {
    console.log(`ℹ️ Volumen previo insuficiente (min ${MIN_PREV}) para evaluar estabilización.`);
  }
}

function main() {
  const THRESHOLD = Number(process.env.SELF_HEAL_THRESHOLD || 5);
  const failures = readJSONSafe(LOG_PATH, []);
  if (!Array.isArray(failures) || failures.length === 0) {
    console.log('ℹ️ No hay fallos registrados para procesar.');
    return;
  }
  const groups = groupFailuresByPrefix(failures);
  const rules = readJSONSafe(SKU_RULES_PATH, {});
  if (!rules.learnedPrefixes) rules.learnedPrefixes = {};

  let injected = 0;
  for (const [token, dist] of groups) {
    const { suggestion, count, total, confidence } = pickDominantSuggestion(dist);
    if (!suggestion) continue;
    if (count >= THRESHOLD && confidence >= 0.8) {
      // Inyectar regla determinista aprendida
      if (!rules.learnedPrefixes[token]) {
        rules.learnedPrefixes[token] = suggestion;
        injected++;
        console.log(`➕ Aprendida nueva regla: '${token}' → '${suggestion}' (count=${count}, conf=${(confidence*100).toFixed(1)}%)`);
      }
    } else {
      console.log(`↪️  '${token}' no alcanza umbral (count=${count}/${total}, conf=${(confidence*100).toFixed(1)}%)`);
    }
  }

  if (injected > 0) {
    writeJSONPretty(SKU_RULES_PATH, rules);
    console.log(`✅ Inyectadas ${injected} reglas aprendidas en skuRules.json`);
  } else {
    console.log('ℹ️ No se inyectaron nuevas reglas.');
  }

  // Post-proceso: monitorear estabilización y notificar por webhook
  checkStabilizationAndNotify(failures).catch(() => {});
}

if (require.main === module) {
  main();
}

module.exports = { main };
