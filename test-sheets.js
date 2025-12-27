const { writeToSheet, appendToSheet, readFromSheet } = require('./src/sheets');

async function test() {
  console.log('🧪 Probando Google Sheets API...\n');

  // Ejemplo 1: Escribir datos en la hoja MASTER_UNIFIED_V5
  console.log('1️⃣ Escribiendo datos en A1...');
  await writeToSheet([
    ['Nombre', 'Edad', 'Ciudad', 'Email'],
    ['Juan Pérez', 30, 'Madrid', 'juan@email.com'],
    ['María García', 25, 'Barcelona', 'maria@email.com'],
  ], 'MASTER_UNIFIED_V5!A1:D3');

  // Ejemplo 2: Agregar más datos al final
  console.log('\n2️⃣ Agregando más datos...');
  await appendToSheet([
    ['Pedro López', 35, 'Valencia', 'pedro@email.com'],
  ], 'MASTER_UNIFIED_V5!A:D');

  // Ejemplo 3: Leer los datos
  console.log('\n3️⃣ Leyendo datos...');
  const data = await readFromSheet('MASTER_UNIFIED_V5!A1:D10');
  console.log('Datos leídos:', data);

  console.log('\n✅ ¡Prueba completada!');
}

test().catch(console.error);