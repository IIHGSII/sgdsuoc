import 'dotenv/config';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaClient } from '../src/generated/prisma/client';

// El export de Django (dumpdata) viene codificado en Windows-1252/Latin-1,
// no en UTF-8 real, aunque el archivo sea .json. Leerlo como utf8 corrompe
// las tildes y la ñ.
type RegistroDumpdata = { model: string; pk: number; fields: Record<string, unknown> };

function cargarDumpdata(): RegistroDumpdata[] {
  const ruta = path.join(process.cwd(), 'data', 'datos_sgd.json');
  const contenido = readFileSync(ruta, 'latin1');
  return JSON.parse(contenido);
}

function nombresUnicos(registros: RegistroDumpdata[], model: string): string[] {
  const nombres = registros.filter((r) => r.model === model).map((r) => String(r.fields.nombre));
  return [...new Set(nombres)];
}

async function main() {
  const adapter = new PrismaMariaDb(process.env.DATABASE_URL!);
  const prisma = new PrismaClient({ adapter });

  const registros = cargarDumpdata();

  // Estado: se preservan nombre/orden/es_final tal cual del sistema anterior.
  const estados = registros
    .filter((r) => r.model === 'contrataciones.estado')
    .map((r) => r.fields as { nombre: string; orden: number; es_final: boolean });
  for (const e of estados) {
    await prisma.estado.upsert({
      where: { nombre: e.nombre },
      update: { orden: e.orden, esFinal: e.es_final },
      create: { nombre: e.nombre, orden: e.orden, esFinal: e.es_final },
    });
  }
  console.log(`Estados: ${estados.length}`);

  // TipoDocumento: el sistema nuevo solo usa "nombre" (se descarta es_proceso, ligado
  // a procesos licitatorios, fuera de alcance).
  const tiposDocumento = nombresUnicos(registros, 'contrataciones.tipodocumento');
  for (const nombre of tiposDocumento) {
    await prisma.tipoDocumento.upsert({ where: { nombre }, update: {}, create: { nombre } });
  }
  console.log(`Tipos de documento: ${tiposDocumento.length}`);

  // Servicio: se agrega "No aplica" según lo pedido en el master prompt.
  const servicios = nombresUnicos(registros, 'contrataciones.servicio');
  if (!servicios.includes('No aplica')) servicios.push('No aplica');
  for (const nombre of servicios) {
    await prisma.servicio.upsert({ where: { nombre }, update: {}, create: { nombre } });
  }
  console.log(`Servicios: ${servicios.length}`);

  // Destino: catálogo nuevo, no existe en el sistema anterior. Se cargan los dos
  // ejemplos mencionados en el master prompt como punto de partida; el resto se
  // agrega desde la pantalla de Administración.
  const destinos = ['DOC/MSPBS', 'Dirección General de Gestión de Insumos Estratégicos en Salud'];
  for (const nombre of destinos) {
    await prisma.destino.upsert({ where: { nombre }, update: {}, create: { nombre } });
  }
  console.log(`Destinos: ${destinos.length}`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
