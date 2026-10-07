import { Module } from '@nestjs/common';
import { ProgressController } from './progress.controller';
import { ProgressService } from './progress.service';
import { FriendsModule } from '../friends/friends.module';
@Module({
  imports: [FriendsModule],
  controllers: [ProgressController],
  providers: [ProgressService],
})
export class ProgressModule {}
