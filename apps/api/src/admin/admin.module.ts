import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminContentService } from './content.service';
import { AdminClassesService } from './classes.service';
import { AdminGamificationService } from './gamification.service';
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
  providers: [
    AdminService,
    AdminContentService,
    AdminClassesService,
    AdminGamificationService,
    AiQuestionGenerationService,
  ],
})
export class AdminModule {}
