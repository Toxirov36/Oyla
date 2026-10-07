import { Module } from '@nestjs/common';
import { ProgressController } from './progress.controller';
import { ProgressService } from './progress.service';
import { FriendsModule } from '../friends/friends.module';
import { StudentClassesController } from './student-classes.controller';
import { StudentClassesService } from './student-classes.service';
@Module({
  imports: [FriendsModule],
  controllers: [ProgressController, StudentClassesController],
  providers: [ProgressService, StudentClassesService],
})
export class ProgressModule {}
