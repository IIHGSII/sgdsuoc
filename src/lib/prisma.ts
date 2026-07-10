import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaClient } from '@/generated/prisma/client';

declare global {
  var prisma: PrismaClient | undefined;
}

function createPrismaClient() {
  // useTextProtocol evita un bug del driver con columnas utf8mb4_unicode_ci:
  // sin esto, cualquier filtro "contains" (LIKE) falla con
  // "Illegal mix of collations (utf8mb4_unicode_ci,IMPLICIT) and (utf8mb4_bin,NONE)".
  const adapter = new PrismaMariaDb(process.env.DATABASE_URL!, { useTextProtocol: true });
  return new PrismaClient({ adapter });
}

export const prisma = globalThis.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalThis.prisma = prisma;
}
