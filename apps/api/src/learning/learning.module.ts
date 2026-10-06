import { Module } from '@nestjs/common';
import { GamificationService } from '../gamification/gamification.service';
import { LearningController } from './learning.controller';
import { LearningService } from './learning.service';
@Module({ controllers: [LearningController], providers: [LearningService, GamificationService] })
export class LearningModule {}
