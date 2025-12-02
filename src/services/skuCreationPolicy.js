const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const prefixMap = require('../config/prefixMap');
const { scraperBridge } = require('../scrapers/scraperBridge');
const { generateSKU } = require('../sku/generator');
const { extract4Digits } = require('../utils/digitExtractor');
const { upsertBySku } = require('./syncSheetsService');

function readPolicyText() {
  const p = path.join(__dirname, '..', '..', 'docs', 'SKU_CREATION_POLICY_ES.md');
  return fs.readFileSync(p, 'utf8');
}

function policyHash() {
  const txt = readPolicyText();
  return crypto.createHash('sha256').update(txt).digest('hex');
}

async function applySkuPolicyAndUpsert(inputCode, lang = 'es') {
  const raw = String(inputCode || '');
  const normalized = prefixMap.normalize(raw);
  const hint = prefixMap.resolveBrandFamilyDutyByPrefix(normalized) || {};

  const bridged = await scraperBridge(normalized, hint.duty || null);

  if (bridged && bridged.valid) {
    const family = bridged.family || hint.family || null;
    const duty = bridged.duty || hint.duty || null;
    const last4 = bridged.last4 || extract4Digits(bridged.code);
    const sku = generateSKU(family, duty, last4, { rawCode: raw });
    if (typeof sku === 'string') {
      const data = {
        query_normalized: normalized,
        sku,
        family,
        duty,
        cross_reference: bridged.cross || [],
        applications: bridged.applications || [],
        attributes: bridged.attributes || {},
        source: bridged.source || (hint.brand || ''),
        code_oem: Array.isArray((bridged.attributes || {}).oem_numbers) ? (bridged.attributes.oem_numbers.join(', ')) : ''
      };
      await upsertBySku(data);
      return { ok: true, policy: 'scraper', code: normalized, sku, family, duty };
    }
  }

  const fam = hint.family || null;
  const dut = hint.duty || null;
  const last4 = extract4Digits(normalized);
  const sku = generateSKU(fam, dut, last4, { rawCode: raw });
  if (typeof sku === 'string') {
    const data = {
      query_normalized: normalized,
      sku,
      family: fam,
      duty: dut,
      cross_reference: [],
      applications: [],
      attributes: {},
      source: 'OEM',
      code_oem: normalized
    };
    await upsertBySku(data);
    return { ok: true, policy: 'oem_fallback', code: normalized, sku, family: fam, duty: dut };
  }

  return { ok: false, error: 'No se pudo generar SKU con la política vigente.' };
}

module.exports = {
  readPolicyText,
  policyHash,
  applySkuPolicyAndUpsert
};