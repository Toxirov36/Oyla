import { Global, Module } from '@nestjs/common';
import { AiQuotaService } from './ai-quota.service';
import { ObjectStorageService } from './object-storage.service';
import { PrismaService } from './prisma.service';
import { RedisService } from './redis.service';
import { TokenService } from './token.service';

// Kept apart from PrismaService so services that depend on it do not create an import cycle.
@Global()
@Module({
  providers: [PrismaService, RedisService, TokenService, AiQuotaService, ObjectStorageService],
  exports: [PrismaService, RedisService, TokenService, AiQuotaService, ObjectStorageService],
})
export class InfrastructureModule {}
