import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminUsersController } from './users.controller';
import { AdminContentController } from './content.controller';
import { AdminGamificationController } from './gamification.controller';
import { AdminClassesController } from './classes.controller';
import { AiQuestionGenerationService } from './ai-question-generation.service';
@Module({
  controllers: [
    AdminUsersController,
    AdminContentController,
    AdminGamificationController,
    AdminClassesController,
  ],
  providers: [AdminService, AiQuestionGenerationService],
})
export class AdminModule {}
