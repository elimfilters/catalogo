// Self-Healing Logger
// Registra fallos estructurados para que el sistema de curación active reglas nuevas
const fs = require('fs');
const path = require('path');

const LOG_PATH = path.join(__dirname, '..', 'data', 'errorLog.json');

function ensureLogFile() {
  try {
    if (!fs.existsSync(LOG_PATH)) {
      fs.writeFileSync(LOG_PATH, '[]', 'utf8');
    }
  } catch (e) {
    console.error('❌ No se pudo asegurar errorLog.json:', e.message);
  }
}

function appendFailure(entry) {
  try {
    ensureLogFile();
    const raw = fs.readFileSync(LOG_PATH, 'utf8');
    const list = JSON.parse(raw || '[]');
    list.push({
      error_timestamp: new Date().toISOString(),
      failed_query_code: entry.failed_query_code || null,
      family_inference_signals: entry.family_inference_signals || null,
      suggested_family_duty: entry.suggested_family_duty || null,
      reason: entry.reason || null
    });
    fs.writeFileSync(LOG_PATH, JSON.stringify(list, null, 2), 'utf8');
    console.log('🧾 Self-Healing log append:', entry);
  } catch (e) {
    console.error('❌ Error registrando fallo en errorLog.json:', e.message);
  }
}

module.exports = {
  appendFailure
};
