import { Controller, Get, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { InfrastructureModule, PrismaService } from './common/prisma.service';
import { RedisService } from './common/redis.service';
import { Public, RateGuard, SecurityGuard } from './common/security';
import { AuthModule } from './auth/auth.module';
import { ContentModule } from './content/content.module';
import { LearningModule } from './learning/learning.module';
import { ProgressModule } from './progress/progress.module';
import { TeacherModule } from './teacher/teacher.module';
import { AdminModule } from './admin/admin.module';
import { ProfileModule } from './profile/profile.module';
import { NotificationsModule } from './notifications/notifications.module';
@Controller('health')
class HealthController {
  constructor(
    private readonly db: PrismaService,
    private readonly redis: RedisService,
  ) {}
  @Public() @Get() async health() {
    await this.db.$queryRaw`SELECT 1`;
    await this.redis.client.ping();
    return { status: 'ok', database: 'ok', redis: 'ok' };
  }
}
@Module({
  imports: [
    InfrastructureModule,
    AuthModule,
    ContentModule,
    LearningModule,
    ProgressModule,
    TeacherModule,
    AdminModule,
    ProfileModule,
    NotificationsModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_GUARD, useClass: RateGuard },
    { provide: APP_GUARD, useClass: SecurityGuard },
  ],
})
export class AppModule {}
