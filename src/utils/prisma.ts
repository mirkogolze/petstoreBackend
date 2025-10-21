import { PrismaClient } from '@prisma/client';

/**
 * Prisma Client Singleton
 */
export const prisma = new PrismaClient({
  log: process.env['NODE_ENV'] === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

/**
 * Disconnect Prisma on application shutdown
 */
export async function disconnectPrisma(): Promise<void> {
  await prisma.$disconnect();
}
