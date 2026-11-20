import { PrismaClient } from '@prisma/client';
import { logger } from './logger.js';

let prismaInstance: PrismaClient | null = null;
let isDbConnected: boolean | null = null;

export function getPrisma(): PrismaClient | null {
  if (isDbConnected === false) {
    return null;
  }

  if (process.env.NODE_ENV === 'test' && !process.env.TEST_WITH_REAL_DB) {
    return null;
  }

  if (!prismaInstance) {
    try {
      prismaInstance = new PrismaClient({
        log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
      });
    } catch (err: any) {
      logger.warn({ err: err.message }, 'PrismaClient failed to instantiate, falling back to memory store');
      isDbConnected = false;
      return null;
    }
  }
  return prismaInstance;
}

export async function checkDbConnection(): Promise<boolean> {
  if (process.env.NODE_ENV === 'test' && !process.env.TEST_WITH_REAL_DB) {
    isDbConnected = false;
    return false;
  }

  const p = getPrisma();
  if (!p) {
    isDbConnected = false;
    return false;
  }
  try {
    const checkPromise = p.$queryRaw`SELECT 1`;
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('DB timeout')), 1000)
    );
    await Promise.race([checkPromise, timeoutPromise]);
    isDbConnected = true;
    return true;
  } catch {
    isDbConnected = false;
    return false;
  }
}

export function isDbLive(): boolean {
  return isDbConnected === true;
}

export { prismaInstance as prisma };

