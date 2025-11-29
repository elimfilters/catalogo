const fs = require('fs');
const path = require('path');

function fail(msg) {
  console.error(`\n[BUILD CHECK] ❌ ${msg}`);
  process.exit(1);
}

function ok(msg) {
  console.log(`[BUILD CHECK] ✅ ${msg}`);
}

try {
  const servicesDir = path.join(process.cwd(), 'src', 'services');
  if (!fs.existsSync(servicesDir)) {
    fail(`Directorio no encontrado: ${servicesDir}`);
  }

  const files = fs.readdirSync(servicesDir);

  // 1) Validar que el scraper correcto existe
  const expectedScraper = 'technicalSpecsScraper.js';
  if (!files.includes(expectedScraper)) {
    fail(`Falta archivo requerido: src/services/${expectedScraper}`);
  }

  // 2) Bloquear cualquier archivo con carácter "·" en src/services (rompe el contenedor)
  const illegalFiles = files.filter(f => /\u00B7|·/.test(f));
  if (illegalFiles.length > 0) {
    fail(`Archivos con carácter "·" detectados en src/services: ${illegalFiles.join(', ')}. Elimínalos antes de desplegar.`);
  }

  // 2b) Detectar scraper heredado con nombre incorrecto, aunque no tenga "·"
  const legacyScraper = files.find(f => /Technicalspecsscraper/.test(f));
  if (legacyScraper) {
    fail(`Scraper heredado detectado: src/services/${legacyScraper}. Debe usarse src/services/${expectedScraper}.`);
  }

  // 3) Comprobar que detectionServiceFinal importa el scraper correcto
  const detectionPath = path.join(servicesDir, 'detectionServiceFinal.js');
  if (fs.existsSync(detectionPath)) {
    const content = fs.readFileSync(detectionPath, 'utf8');
    const usesOldImport = content.match(/require\(['"].*Technicalspecsscraper.*['"]\)/);
    if (usesOldImport) {
      fail('detectionServiceFinal.js aún importa Technicalspecsscraper. Debe usar "../services/technicalSpecsScraper"');
    }
  } else {
    ok('detectionServiceFinal.js no encontrado en src/services (puede estar en otra ruta).');
  }

  ok('Verificación de archivos de servicios completada.');
  process.exit(0);
} catch (err) {
  fail(`Error en verificación: ${err.message}`);
}