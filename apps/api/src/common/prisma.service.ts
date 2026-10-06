import { Global, Injectable, Module, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { RedisService } from './redis.service';
import { TokenService } from './token.service';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
  }
  async onModuleDestroy() {
    await this.$disconnect();
  }
  // Serialize all reward-affecting work per student across API instances.
  async withUserLock<T>(userId: string, work: (tx: Prisma.TransactionClient) => Promise<T>) {
    return this.$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${userId}::uuid FOR UPDATE`;
        return work(tx);
      },
      { maxWait: 10000, timeout: 15000 },
    );
  }
}
@Global()
@Module({
  providers: [PrismaService, RedisService, TokenService],
  exports: [PrismaService, RedisService, TokenService],
})
export class InfrastructureModule {}
