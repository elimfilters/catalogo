// =============================================
//  ROUTES ENDPOINT - Scraper and Family Routing Map
// =============================================

const express = require('express');
const router = express.Router();

// Static map aligned con la política y documentación actual
const SCRAPERS = [
  { name: 'Donaldson', path: '/src/scrapers/donaldson.js', duty: 'HD', description: 'Heavy Duty: Air/Oil/Fuel/Cabin; P-series y variantes.' },
  { name: 'FRAM', path: '/src/scrapers/fram.js', duty: 'LD', description: 'Light Duty: Oil/Air/Cabin; familias PH/TG/XG/HM/CA/CF/CH/G/PS.' },
  { name: 'Parker/Racor', path: '/src/scrapers/scraperBridge.js', duty: 'Marine', description: 'Validadores MARINEs para ET9/EM9; Turbine Systems y FUEL FILTER SEPARATORes.' },
  { name: 'MerCruiser', path: '/src/scrapers/scraperBridge.js', duty: 'Marine', description: 'Validador OEM MerCruiser para EM9.' },
  { name: 'Sierra', path: '/src/scrapers/scraperBridge.js', duty: 'Marine', description: 'Validador OEM Sierra para EM9.' }
];

const FAMILIES = [
  { family: 'EA1', label: 'AIR', routing: { HD: 'Donaldson', LD: 'FRAM' } },
  { family: 'EC1', label: 'CABIN', routing: { HD: 'Donaldson', LD: 'FRAM' } },
  { family: 'EA2', label: 'CARCAZA AIR FILTER', routing: { HD: 'Donaldson' } },
  { family: 'EL8', label: 'OIL', routing: { HD: 'Donaldson', LD: 'FRAM' } },
  { family: 'EF9', label: 'FUEL', routing: { HD: 'Donaldson', LD: 'FRAM' } },
  { family: 'ES9', label: 'SEPARATOR', routing: { HD: 'Donaldson' } },
  { family: 'ED4', label: 'DRYER', routing: { HD: 'Donaldson' } },
  { family: 'EH6', label: 'HYDRAULIC', routing: { HD: 'Donaldson' } },
  { family: 'EW7', label: 'WATER', routing: { HD: 'Donaldson' } },
  { family: 'ET9', label: 'ELEMENT TURBINE', routing: { Marine: 'Parker/Racor' }, notes: { last4_alnum: true, subtypes: ['ET9-F'] } },
  { family: 'EM9', label: 'MARINE', routing: { Marine: 'Parker/Racor, MerCruiser, Sierra' }, notes: { last4_alnum: true, subtypes: ['EM9-S', 'EM9-F', 'EM9-O', 'EM9-A'] } }
];

router.get('/', (req, res) => {
  res.json({
    success: true,
    scrapers: SCRAPERS,
    families: FAMILIES,
    documentation: {
      sku_policy: '/policy/sku',
      rules_es: '/docs/scraper_rules_es.md'
    }
  });
});

module.exports = router;
