import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';

const WINDOW_MS = 24 * 60 * 60 * 1000;
const RETENTION_MS = 7 * WINDOW_MS;

/**
 * Sliding 24-hour quota for billable AI requests, stored in PostgreSQL so a Redis flush
 * or restart cannot reset the spend limit. Each reservation is one row.
 */
@Injectable()
export class AiQuotaService {
  constructor(private readonly db: PrismaService) {}

  /** Records one request for `scope` and returns true, or returns false when `limit` is already used. */
  async reserve(scope: string, limit: number, now = new Date()): Promise<boolean> {
    if (limit <= 0) return false;
    return this.db.$transaction(async (tx) => {
      // Serialize concurrent reservations for the same scope across API instances.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${scope}))`;
      const used = await tx.aiUsage.count({
        where: { scope, createdAt: { gt: new Date(now.getTime() - WINDOW_MS) } },
      });
      if (used >= limit) return false;
      await tx.aiUsage.create({ data: { scope, createdAt: now } });
      await tx.aiUsage.deleteMany({
        where: { scope, createdAt: { lt: new Date(now.getTime() - RETENTION_MS) } },
      });
      return true;
    });
  }
}
