// Append alias code into Google Sheet Master using base OEM row
// Usage: node scripts/append_alias.js <ALIAS_CODE> <OEM_CODE>
// Example: node scripts/append_alias.js LF3620 P552100
try { require('dotenv').config(); } catch (_) {}

const { searchInSheet, appendToSheet } = require('../src/services/syncSheetsService');

async function main() {
  const alias = (process.argv[2] || '').trim();
  const oem = (process.argv[3] || '').trim();
  if (!alias || !oem) {
    console.error('Usage: node scripts/append_alias.js <ALIAS_CODE> <OEM_CODE>');
    process.exit(1);
  }

  try {
    const base = await searchInSheet(oem);
    if (!base || !base.found) {
      console.error(`Base OEM code not found in Master: ${oem}`);
      process.exit(2);
    }

    const data = {
      query_normalized: alias,
      sku: base.sku || '',
      duty: base.duty || '',
      family: base.type || 'OIL',
      code_oem: oem,
      oem_equivalent: oem,
      cross_reference: [alias, oem],
      media: base.media_type || '',
      filter_type: base.type || '',
      subtype: base.subtype || 'Standard',
      applications: base.engine_applications || [],
      equipment_applications: base.equipment_applications || [],
      attributes: base.attributes || {}
    };

    await appendToSheet(data);
    console.log(JSON.stringify({ success: true, appended: alias, linked_to: oem, sku: data.sku }, null, 2));
  } catch (e) {
    console.error('Append error:', e.message);
    process.exit(3);
  }
}

if (require.main === module) {
  main();
}
