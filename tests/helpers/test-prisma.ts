import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaClient } from '@/generated/prisma/client';

// Cliente de Prisma para los tests. Apunta a la base de pruebas
// (DATABASE_URL_TEST, ver vitest.setup.ts), nunca a la de producción. Igual se
// usan catálogos con nombres únicos por test y años lejanos (2077+), y se limpia
// lo creado en afterAll, para poder re-ejecutar los tests sin residuos.
export const prisma = new PrismaClient({
  adapter: new PrismaMariaDb(process.env.DATABASE_URL!, { useTextProtocol: true }),
});
