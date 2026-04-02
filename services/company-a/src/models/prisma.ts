import { PrismaClient } from '@prisma/client';

/**
 * Prisma Client singleton.
 * Prevents multiple PrismaClient instances during hot-reload in development.
 */

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma: PrismaClient =
  globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
