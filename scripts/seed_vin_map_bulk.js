// Seed ampliado (LD + HD). Inserta un conjunto inicial y sirve de plantilla
// para crecer rápidamente mientras llegan dumps desde scrapers.

try { require('dotenv').config(); } catch (_) {}

const mongoService = require('../src/services/mongoService');
const { upsertMapping } = require('../src/services/vinApplicationMapService');

const LD_SEEDS = [
  // LD populares
  { make: 'FORD', model: 'F-150', year: 2020, engine_liters: '5.0L', filter_type: 'OIL', oem_code_target: 'FL-500S' },
  { make: 'CHEVROLET', model: 'Silverado 1500', year: 2019, engine_liters: '5.3L', filter_type: 'OIL', oem_code_target: 'PF63' },
  { make: 'TOYOTA', model: 'Corolla', year: 2015, engine_liters: '1.8L', filter_type: 'AIR', oem_code_target: '17801-0T020' },
  { make: 'HONDA', model: 'Civic', year: 2018, engine_liters: '2.0L', filter_type: 'OIL', oem_code_target: '15400-PLM-A02' },
  { make: 'NISSAN', model: 'Altima', year: 2017, engine_liters: '2.5L', filter_type: 'OIL', oem_code_target: '15208-65F0A' },
  { make: 'HYUNDAI', model: 'Elantra', year: 2020, engine_liters: '2.0L', filter_type: 'AIR', oem_code_target: '28113-F2000' },
  { make: 'KIA', model: 'Sorento', year: 2016, engine_liters: '2.4L', filter_type: 'OIL', oem_code_target: '26300-35504' },
  { make: 'VOLKSWAGEN', model: 'Jetta', year: 2014, engine_liters: '1.8L', filter_type: 'OIL', oem_code_target: '06J115403Q' },
  { make: 'SUBARU', model: 'Outback', year: 2019, engine_liters: '2.5L', filter_type: 'AIR', oem_code_target: '16546AA120' },
  { make: 'MAZDA', model: 'CX-5', year: 2017, engine_liters: '2.5L', filter_type: 'OIL', oem_code_target: 'PE01-14-302' },
  { make: 'BMW', model: '3 Series', year: 2013, engine_liters: '2.0L', filter_type: 'OIL', oem_code_target: '11427953169' },
  { make: 'MERCEDES-BENZ', model: 'C-Class', year: 2015, engine_liters: '2.0L', filter_type: 'OIL', oem_code_target: 'A2701800009' },
  { make: 'AUDI', model: 'A4', year: 2014, engine_liters: '2.0L', filter_type: 'OIL', oem_code_target: '06L115562' },
  { make: 'FORD', model: 'Escape', year: 2016, engine_liters: '2.5L', filter_type: 'AIR', oem_code_target: 'CV6Z-9601-A' },
  { make: 'CHEVROLET', model: 'Equinox', year: 2018, engine_liters: '1.5L', filter_type: 'OIL', oem_code_target: 'PF64' },
  { make: 'TOYOTA', model: 'Camry', year: 2017, engine_liters: '2.5L', filter_type: 'AIR', oem_code_target: '17801-0P050' },
  { make: 'HONDA', model: 'Accord', year: 2019, engine_liters: '1.5L', filter_type: 'OIL', oem_code_target: '15400-PLM-A02' },
  { make: 'NISSAN', model: 'Sentra', year: 2016, engine_liters: '1.8L', filter_type: 'AIR', oem_code_target: '16546-4AF0A' },
  { make: 'HYUNDAI', model: 'Santa Fe', year: 2015, engine_liters: '3.3L', filter_type: 'OIL', oem_code_target: '26300-35503' },
  { make: 'KIA', model: 'Optima', year: 2018, engine_liters: '2.4L', filter_type: 'AIR', oem_code_target: '28113-D3000' },
  // Ampliaciones rápidas
  { make: 'FORD', model: 'Fusion', year: 2014, engine_liters: '2.5L', filter_type: 'OIL', oem_code_target: 'FL-910S' },
  { make: 'CHEVROLET', model: 'Malibu', year: 2016, engine_liters: '2.5L', filter_type: 'AIR', oem_code_target: '23239926' },
  { make: 'TOYOTA', model: 'RAV4', year: 2018, engine_liters: '2.5L', filter_type: 'AIR', oem_code_target: '17801-0H010' },
  { make: 'HONDA', model: 'CR-V', year: 2017, engine_liters: '2.4L', filter_type: 'AIR', oem_code_target: '17220-5LA-A00' },
  { make: 'NISSAN', model: 'Rogue', year: 2019, engine_liters: '2.5L', filter_type: 'AIR', oem_code_target: '16546-4BA1A' },
  { make: 'HYUNDAI', model: 'Tucson', year: 2017, engine_liters: '2.0L', filter_type: 'AIR', oem_code_target: '28113-D3300' },
  { make: 'KIA', model: 'Sportage', year: 2017, engine_liters: '2.4L', filter_type: 'AIR', oem_code_target: '28113-D3300' },
  { make: 'VOLKSWAGEN', model: 'Tiguan', year: 2015, engine_liters: '2.0L', filter_type: 'OIL', oem_code_target: '06L115562' },
  { make: 'SUBARU', model: 'Forester', year: 2016, engine_liters: '2.5L', filter_type: 'OIL', oem_code_target: '15208AA130' },
  { make: 'MAZDA', model: '3', year: 2015, engine_liters: '2.0L', filter_type: 'AIR', oem_code_target: 'PE07-13-3A0' }
];

const HD_SEEDS = [
  // HD (diesel / camiones)
  { make: 'FORD', model: 'F-250 Super Duty', year: 2018, engine_liters: '6.7L', filter_type: 'OIL', oem_code_target: 'BC3Z-6731-B' },
  { make: 'RAM', model: '2500', year: 2017, engine_liters: '6.7L', filter_type: 'FUEL', oem_code_target: '68157291AA' },
  { make: 'CHEVROLET', model: 'Silverado 2500HD', year: 2016, engine_liters: '6.6L', filter_type: 'FUEL', oem_code_target: '98017645' },
  { make: 'GMC', model: 'Sierra 2500HD', year: 2015, engine_liters: '6.6L', filter_type: 'AIR', oem_code_target: '22846459' },
  { make: 'FORD', model: 'Transit', year: 2017, engine_liters: '3.2L', filter_type: 'FUEL', oem_code_target: 'BK3Z-9N184-A' },
  { make: 'MERCEDES-BENZ', model: 'Sprinter', year: 2016, engine_liters: '3.0L', filter_type: 'FUEL', oem_code_target: 'A6510901352' },
  { make: 'ISUZU', model: 'NPR', year: 2014, engine_liters: '5.2L', filter_type: 'FUEL', oem_code_target: '8-98315243-0' },
  { make: 'VOLVO', model: 'VNL', year: 2013, engine_liters: '12.8L', filter_type: 'FUEL', oem_code_target: '21707133' },
  // Más HD comunes
  { make: 'CATERPILLAR', model: 'CT660', year: 2014, engine_liters: '12.4L', filter_type: 'OIL', oem_code_target: '1R-1808' },
  { make: 'CUMMINS', model: 'ISX', year: 2013, engine_liters: '15.0L', filter_type: 'FUEL', oem_code_target: '4058968' },
  { make: 'INTERNATIONAL', model: 'ProStar', year: 2012, engine_liters: '13.0L', filter_type: 'FUEL', oem_code_target: '3006266C91' },
  { make: 'MACK', model: 'Anthem', year: 2018, engine_liters: '13.0L', filter_type: 'AIR', oem_code_target: '57MD25M' },
  { make: 'KENWORTH', model: 'T680', year: 2017, engine_liters: '12.9L', filter_type: 'AIR', oem_code_target: 'P621725' }
];

async function runSeed() {
  if (!process.env.MONGODB_URI) {
    console.log('ℹ️  MONGODB_URI no está configurado. Configure el URI y reintente.');
    process.exit(1);
  }
  await mongoService.connect();
  console.log('✅ Conexión a MongoDB establecida');

  const all = [...LD_SEEDS, ...HD_SEEDS];
  let ok = 0, fail = 0;
  for (const doc of all) {
    try {
      const res = await upsertMapping({ ...doc, source: 'seed-bulk' });
      if (res) {
        console.log('✔', res.make_model_year_engine, res.filter_type, '→', res.oem_code_target);
        ok++;
      } else {
        console.log('✖ upsert inválido:', doc);
        fail++;
      }
    } catch (e) {
      console.log('✖ error:', e.message, doc);
      fail++;
    }
  }

  console.log(`✅ Seed bulk finalizada. OK=${ok} FAIL=${fail}`);
}

runSeed().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });