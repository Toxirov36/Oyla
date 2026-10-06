import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import Redis from 'ioredis';
import { config } from './config';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  readonly client = new Redis(config.REDIS_URL, {
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
  });
  private readonly logger = new Logger(RedisService.name);
  constructor() {
    this.client.on('error', () => this.logger.warn('Redis connection unavailable'));
  }
  async onModuleInit() {
    await this.client.connect();
    await this.client.ping();
  }
  async onModuleDestroy() {
    this.client.disconnect();
  }
  async incrementWindow(key: string, seconds: number) {
    try {
      return Number(
        await this.client.eval(
          "local n = redis.call('INCR', KEYS[1]); if n == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]); end; return n",
          1,
          key,
          seconds,
        ),
      );
    } catch {
      throw new ServiceUnavailableException('Xizmat vaqtincha mavjud emas.');
    }
  }
}
