import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/security';
import { IdDto } from '../common/dto';

import {
  XpRuleDto,
  RuleKeyDto,
  LevelDto,
  UpdateLevelDto,
  BadgeDto,
  UpdateBadgeDto,
} from './admin.dto';
import { AdminService } from './admin.service';
import { AdminGamificationService } from './gamification.service';
@ApiTags('Admin')
@ApiBearerAuth()
@Roles('ADMIN')
@Controller('admin')
export class AdminGamificationController {
  constructor(
    private readonly admin: AdminService,
    private readonly gamification: AdminGamificationService,
  ) {}
  @Get('analytics') analytics() {
    return this.admin.analytics();
  }
  @Get('gamification') game() {
    return this.gamification.gamification();
  }
  @Patch('xp-rules/:key') rule(@Param() params: RuleKeyDto, @Body() dto: XpRuleDto) {
    return this.gamification.rule(params.key, dto.amount);
  }
  @Post('levels') createLevel(@Body() dto: LevelDto) {
    return this.gamification.createLevel(dto);
  }
  @Patch('levels/:id') updateLevel(@Param() params: IdDto, @Body() dto: UpdateLevelDto) {
    return this.gamification.updateLevel(params.id, dto);
  }
  @Delete('levels/:id') deleteLevel(@Param() params: IdDto) {
    return this.gamification.deleteLevel(params.id);
  }
  @Post('badges') createBadge(@Body() dto: BadgeDto) {
    return this.gamification.createBadge(dto);
  }
  @Patch('badges/:id') updateBadge(@Param() params: IdDto, @Body() dto: UpdateBadgeDto) {
    return this.gamification.updateBadge(params.id, dto);
  }
  @Delete('badges/:id') deleteBadge(@Param() params: IdDto) {
    return this.gamification.deleteBadge(params.id);
  }
}
