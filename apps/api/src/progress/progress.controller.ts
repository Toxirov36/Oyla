import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import { IsIn, IsUUID } from 'class-validator';
import { Optional } from '../common/dto';
import { Actor, CurrentUser, Roles } from '../common/security';
import { ProgressService } from './progress.service';
class LeaderboardQuery {
  @ApiPropertyOptional({ enum: ['weekly', 'class'] }) @IsIn(['weekly', 'class']) scope:
    'weekly' | 'class' = 'weekly';
  @ApiPropertyOptional({ format: 'uuid' }) @Optional() @IsUUID('4') classId?: string;
}
@ApiTags('Progress')
@ApiBearerAuth()
@Controller()
export class ProgressController {
  constructor(private readonly progress: ProgressService) {}
  @Roles('STUDENT') @Get('students/me') dashboard(@CurrentUser() actor: Actor) {
    return this.progress.dashboard(actor);
  }
  @Roles('STUDENT') @Get('students/me/progress') progressData(@CurrentUser() actor: Actor) {
    return this.progress.dashboard(actor);
  }
  @Roles('STUDENT') @Get('students/me/assignments') assignments(@CurrentUser() actor: Actor) {
    return this.progress.assignments(actor);
  }
  @Roles('STUDENT') @Get('badges') badges(@CurrentUser() actor: Actor) {
    return this.progress.badges(actor);
  }
  @Get('leaderboards') leaderboard(@CurrentUser() actor: Actor, @Query() query: LeaderboardQuery) {
    return this.progress.leaderboard(actor, query.scope, query.classId);
  }
}
