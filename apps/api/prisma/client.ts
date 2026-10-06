import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';

export { Prisma } from '../generated/prisma/client';
export type { PrismaClient } from '../generated/prisma/client';

export function createPrismaClient(connectionString = process.env.DATABASE_URL) {
  if (!connectionString) {
    throw new Error('DATABASE_URL is required to create Prisma Client.');
  }
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}
