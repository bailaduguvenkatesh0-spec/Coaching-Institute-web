import { PrismaClient } from '@prisma/client';
import { logger } from './logger.js';

let prismaInstance: PrismaClient | null = null;
let isDbConnected = false;

export function getPrisma(): PrismaClient | null {
  if (process.env.NODE_ENV === 'test' && !process.env.DATABASE_URL) {
    return null;
  }

  if (!prismaInstance) {
    try {
      prismaInstance = new PrismaClient({
        log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
      });
    } catch (err: any) {
      logger.warn({ err: err.message }, 'PrismaClient failed to instantiate, falling back to memory store');
      return null;
    }
  }
  return prismaInstance;
}

export async function checkDbConnection(): Promise<boolean> {
  const p = getPrisma();
  if (!p) return false;
  try {
    await p.$queryRaw`SELECT 1`;
    isDbConnected = true;
    return true;
  } catch {
    isDbConnected = false;
    return false;
  }
}

export { prismaInstance as prisma };

