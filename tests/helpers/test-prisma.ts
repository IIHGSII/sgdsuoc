import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaClient } from '@/generated/prisma/client';

// Cliente de Prisma para los tests. No hay una base de datos de test separada
// (ver README): los tests corren contra la misma base real, usando catálogos
// con nombres únicos por test y años lejanos (2077+) para no chocar ni
// mezclarse con datos reales, y limpian lo que crean en afterAll.
export const prisma = new PrismaClient({
  adapter: new PrismaMariaDb(process.env.DATABASE_URL!, { useTextProtocol: true }),
});
