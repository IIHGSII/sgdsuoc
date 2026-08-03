import 'dotenv/config';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaClient } from '../src/generated/prisma/client';
import { diasDesdeIngreso } from '../src/lib/tz';

// Resumen corto de urgencia para el Arquitecto de Tiempo (pilar "Hospital -
// Sostén Operativo"): cuántos expedientes pendientes hay por color de
// antigüedad, sin detalle por expediente. Se invoca a mano ("hospital"),
// nunca automático. Mismos umbrales que el Panel del SGD: verde <7 días,
// amarillo 7-15, rojo >15.

async function main() {
  const adapter = new PrismaMariaDb(process.env.DATABASE_URL!, { useTextProtocol: true });
  const prisma = new PrismaClient({ adapter });

  const pendientes = await prisma.expediente.findMany({
    where: { estadoActual: { esFinal: false } },
    select: { fechaIngresoSuoc: true },
  });

  let verdes = 0;
  let amarillos = 0;
  let rojos = 0;
  for (const exp of pendientes) {
    const dias = diasDesdeIngreso(exp.fechaIngresoSuoc);
    if (dias < 7) verdes++;
    else if (dias <= 15) amarillos++;
    else rojos++;
  }

  console.log(`Expedientes pendientes: ${pendientes.length}`);
  console.log(`  Rojo (>15 dias): ${rojos}`);
  console.log(`  Amarillo (7-15 dias): ${amarillos}`);
  console.log(`  Verde (<7 dias): ${verdes}`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
