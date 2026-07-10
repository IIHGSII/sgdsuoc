import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaClient } from '@/generated/prisma/client';

declare global {
  var prisma: PrismaClient | undefined;
}

function createPrismaClient() {
  const adapter = new PrismaMariaDb(process.env.DATABASE_URL!);
  return new PrismaClient({ adapter });
}

export const prisma = globalThis.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalThis.prisma = prisma;
}
