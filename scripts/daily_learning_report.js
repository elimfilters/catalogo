// scripts/daily_learning_report.js
// Reporte diario del sistema de auto‑curación.
// Lee src/data/errorLog.json, agrupa por prefijo y resume el estado de aprendizaje.

const fs = require('fs');
const path = require('path');
const https = require('https');
const { URL } = require('url');

const LOG_PATH = path.join(__dirname, '..', 'src', 'data', 'errorLog.json');
const SKU_RULES_PATH = path.join(__dirname, '..', 'src', 'config', 'skuRules.json');

function normalize(s) { return String(s || '').trim().toUpperCase(); }

function readJSONSafe(p, fallback) {
  try { const raw = fs.readFileSync(p, 'utf8'); return JSON.parse(raw || JSON.stringify(fallback)); }
  catch (_) { return fallback; }
}

function extractPrefixToken(entry) {
  const sig = String(entry.family_inference_signals || '');
  const m = sig.match(/prefix:([^|]+)/i);
  let token = m ? m[1] : '';
  token = normalize(token);
  if (!token || token === 'NONE') {
    const code = normalize(entry.failed_query_code || '');
    if (/^\d{5,}$/.test(code)) return 'LONG_NUMERIC';
    const m2 = code.match(/^([A-Z]{1,4}\d{1,3})/);
    if (m2) return normalize(m2[1]);
  }
  return token;
}

function groupFailuresByPrefix(failures) {
  const groups = new Map();
  for (const f of failures) {
    const t = Date.parse(String(f.error_timestamp || ''));
    if (isNaN(t)) continue;
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

function postWebhook(url, payload) {
  return new Promise((resolve, reject) => {
    try {
      const u = new URL(url);
      const data = Buffer.from(JSON.stringify(payload));
      const opts = {
        method: 'POST', hostname: u.hostname,
        path: u.pathname + (u.search || ''), port: u.port || (u.protocol === 'https:' ? 443 : 80),
        headers: { 'Content-Type': 'application/json', 'Content-Length': data.length }
      };
      const req = https.request(opts, (res) => {
        const status = res.statusCode;
        res.on('data', () => {});
        res.on('end', () => resolve({ statusCode: status }));
      });
      req.on('error', reject);
      req.write(data);
      req.end();
    } catch (e) { reject(e); }
  });
}

function parseArgs(argv) {
  const out = {};
  for (const a of argv) {
    const m = a.match(/^--([^=]+)=(.*)$/);
    if (m) out[m[1]] = m[2];
  }
  return out;
}

function countInWindow(list, startMs, endMs) {
  let c = 0; for (const f of list) { const t = Date.parse(String(f.error_timestamp || '')); if (!isNaN(t) && t >= startMs && t < endMs) c++; } return c;
}

function topN(arr, n) { return arr.slice(0, n); }

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const HOURS = Number(args.hours || process.env.REPORT_HOURS || 24);
  const THRESHOLD = Number(args.threshold || process.env.SELF_HEAL_THRESHOLD || 3);
  const WEBHOOK = args.webhook || process.env.DAILY_REPORT_WEBHOOK_URL || '';
  const JSON_ONLY = Boolean(args.json || process.env.REPORT_JSON_ONLY);

  const failuresAll = readJSONSafe(LOG_PATH, []);
  const rules = readJSONSafe(SKU_RULES_PATH, {});
  if (!rules.learnedPrefixes) rules.learnedPrefixes = {};

  const now = Date.now();
  const start = now - HOURS * 3600_000;
  const failures = failuresAll.filter(f => {
    const t = Date.parse(String(f.error_timestamp || ''));
    return !isNaN(t) && t >= start && t < now;
  });

  if (failures.length === 0) {
    const report = {
      Status: THRESHOLD < 5 ? 'En Fase de Aprendizaje Acelerado (Umbral 3)' : 'Fase Robusta (Umbral 5)',
      Ventana_Horas: HOURS,
      Fallos_Ventana: 0,
      Prefijos_Aprendizaje_Potencial: 0,
      Prefijos_No_Umbral: 0,
      Progreso: 'Sin actividad en la ventana; continuar monitoreo.'
    };
    if (JSON_ONLY) console.log(JSON.stringify(report, null, 2));
    else {
      console.log('--- REPORTE DIARIO DE AUTO-CURACIÓN ---');
      console.log(report);
    }
    return;
  }

  const groups = groupFailuresByPrefix(failures);
  const details = [];
  let eligibleCount = 0;
  let nonThresholdCount = 0;
  let alreadyLearnedCount = 0;

  for (const [token, dist] of groups) {
    const { suggestion, count, total, confidence } = pickDominantSuggestion(dist);
    const already = Boolean(rules.learnedPrefixes[token]);
    const meets = count >= THRESHOLD && confidence >= 0.8;
    if (meets) eligibleCount++;
    else nonThresholdCount++;
    if (already) alreadyLearnedCount++;
    details.push({ token, suggestion, count, total, confianza: Number((confidence * 100).toFixed(1)), ya_inyectado: already, cumple_umbral: meets });
  }

  // Estabilización (48h por defecto, usando la misma lógica del cron)
  const STAB_HOURS = Number(process.env.SELF_HEAL_STABILIZATION_HOURS || 48);
  const TARGET = Number(process.env.SELF_HEAL_REDUCTION_TARGET || 0.8);
  const MIN_PREV = Number(process.env.SELF_HEAL_MIN_PREV_COUNT || 30);
  const lastStart = now - STAB_HOURS * 3600_000;
  const prevStart = now - 2 * STAB_HOURS * 3600_000;
  const lastCount = countInWindow(failuresAll, lastStart, now);
  const prevCount = countInWindow(failuresAll, prevStart, lastStart);
  const thresholdCount = Math.ceil(prevCount * (1 - TARGET));
  const reductionOk = prevCount >= MIN_PREV && lastCount <= thresholdCount;

  const report = {
    Status: THRESHOLD < 5 ? 'En Fase de Aprendizaje Acelerado (Umbral 3)' : 'Fase Robusta (Umbral 5)',
    Ventana_Horas: HOURS,
    Fallos_Ventana: failures.length,
    Prefijos_Aprendizaje_Potencial: eligibleCount,
    Prefijos_No_Umbral: nonThresholdCount,
    Ya_Inyectados_en_skuRules: alreadyLearnedCount,
    Detalle_Prefijos: topN(details.sort((a,b)=>b.count-a.count), 10),
    Estabilizacion: {
      Ventana_Medicion_Horas: STAB_HOURS,
      Prev_Count: prevCount,
      Last_Count: lastCount,
      prevWindow: prevCount,
      lastWindow: lastCount,
      Reduccion_Requerida_pct: Number((TARGET * 100).toFixed(0)),
      Elegible: reductionOk,
      Accion: reductionOk ? 'Cambiar SELF_HEAL_THRESHOLD a 5 en Railway' : 'Continuar en 3 y seguir monitoreo'
    },
    Progreso: 'Monitoreando la alerta de estabilización...'
  };

  if (JSON_ONLY) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log('--- REPORTE DIARIO DE AUTO-CURACIÓN ---');
    console.log(report);
  }

  if (WEBHOOK) {
    try {
      const accionMsg = report.Estabilizacion.Elegible
        ? '👉 FAVOR DE CAMBIAR SELF_HEAL_THRESHOLD de 3 a 5'
        : '🔎 Continuar en umbral 3 y seguir monitoreo';

      const isSlack = WEBHOOK.includes('slack.com');
      const headerText = report.Estabilizacion.Elegible
        ? '🚨 ACCIÓN REQUERIDA: ESTABILIZACIÓN DEL APRENDIZAJE CRON 📈'
        : '📣 Reporte Diario de Auto‑Curación';

      // Slack a veces responde "invalid_payload" si el cuerpo incluye
      // estructuras no aceptadas por su Incoming Webhook. Para máxima
      // compatibilidad, cuando el destino es Slack enviamos solo texto
      // plano con un resumen breve.
      let payload;
      if (isSlack) {
        const summary = [
          `Estado: ${report.Status}`,
          `Fallos (últimas ${HOURS}h): ${report.Fallos_Ventana}`,
          `Prefijos Potenciales: ${report.Prefijos_Aprendizaje_Potencial}`,
          `No Umbral: ${report.Prefijos_No_Umbral}`,
          `prevWindow: ${report.Estabilizacion.prevWindow}`,
          `lastWindow: ${report.Estabilizacion.lastWindow}`,
          accionMsg
        ].join('\n');
        const text = `${headerText}\n${summary}`;
        // Limitar longitud por seguridad
        payload = { text: text.substring(0, 3000) };
      } else {
        payload = { text: headerText, report };
      }
      const res = await postWebhook(WEBHOOK, payload);
      if (res && typeof res.statusCode !== 'undefined') {
        console.log(`🔔 Reporte diario enviado al webhook. HTTP ${res.statusCode}`);
      } else {
        console.log('🔔 Reporte diario enviado al webhook.');
      }
    } catch (e) {
      console.log('⚠️ No se pudo enviar el reporte diario:', e.message);
    }
  }
}

if (require.main === module) {
  main().catch((e) => { console.error('❌ Error generando reporte diario:', e.message); process.exit(1); });
}

module.exports = { main };