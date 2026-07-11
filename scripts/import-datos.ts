import 'dotenv/config';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaClient } from '../src/generated/prisma/client';
import { importarRegistros, type RegistroDumpdata } from '../src/lib/importador';

// Importador del export de Django del sistema anterior (data/datos_sgd.json,
// formato dumpdata: array de {model, pk, fields}). Solo importa
// contrataciones.estado/servicio/tipodocumento (catálogos, ya cargados por
// prisma/seed.ts pero se re-verifican acá), contrataciones.documento
// (-> Expediente) y contrataciones.trazabilidad. El resto de los modelos del
// export (procesos licitatorios, contratos, órdenes, etc.) se ignora.
//
// El archivo viene codificado en Windows-1252/Latin-1, no UTF-8 real, aunque
// sea un .json: hay que leerlo con 'latin1' o las tildes y la ñ se corrompen.
//
// Idempotente: los expedientes se upsertean por (nro_suoc, anio_suoc) —la
// misma restricción única del esquema— y la trazabilidad se salta si ya
// existe una fila equivalente (mismo expediente, estado nuevo y fecha),
// para poder re-ejecutar el importador con un export corregido sin duplicar
// ni pisar historial agregado desde la app.
//
// La lógica de mapeo/importación vive en src/lib/importador.ts para poder
// testearla con un fixture chico (ver tests/importador.test.ts).

function cargarDumpdata(): RegistroDumpdata[] {
  const ruta = path.join(process.cwd(), 'data', 'datos_sgd.json');
  const contenido = readFileSync(ruta, 'latin1');
  return JSON.parse(contenido);
}

async function main() {
  const adapter = new PrismaMariaDb(process.env.DATABASE_URL!, { useTextProtocol: true });
  const prisma = new PrismaClient({ adapter });

  const registros = cargarDumpdata();
  const resumen = await importarRegistros(registros, prisma);

  if (resumen.catalogosFaltantes.length > 0) {
    console.error('Faltan catálogos (correr "npm run db:seed" primero):');
    resumen.catalogosFaltantes.forEach((f) => console.error(`  - ${f}`));
    await prisma.$disconnect();
    process.exit(1);
  }

  console.log('--- Resumen de la importación ---');
  console.log(`Expedientes creados: ${resumen.documentosCreados}`);
  console.log(`Expedientes actualizados (ya existían): ${resumen.documentosActualizados}`);
  console.log(`Expedientes omitidos: ${resumen.documentosOmitidos}`);
  console.log(`Trazabilidad creada: ${resumen.trazabilidadCreada}`);
  console.log(`Trazabilidad omitida (ya existía o no aplicable): ${resumen.trazabilidadOmitida}`);
  if (resumen.avisos.length > 0) {
    console.log(`\nAvisos (${resumen.avisos.length}):`);
    resumen.avisos.forEach((a) => console.log(`  - ${a}`));
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
