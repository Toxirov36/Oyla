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
@ApiTags('Admin')
@ApiBearerAuth()
@Roles('ADMIN')
@Controller('admin')
export class AdminGamificationController {
  constructor(private readonly admin: AdminService) {}
  @Get('analytics') analytics() {
    return this.admin.analytics();
  }
  @Get('gamification') game() {
    return this.admin.gamification();
  }
  @Patch('xp-rules/:key') rule(@Param() params: RuleKeyDto, @Body() dto: XpRuleDto) {
    return this.admin.rule(params.key, dto.amount);
  }
  @Post('levels') createLevel(@Body() dto: LevelDto) {
    return this.admin.createLevel(dto);
  }
  @Patch('levels/:id') updateLevel(@Param() params: IdDto, @Body() dto: UpdateLevelDto) {
    return this.admin.updateLevel(params.id, dto);
  }
  @Delete('levels/:id') deleteLevel(@Param() params: IdDto) {
    return this.admin.deleteLevel(params.id);
  }
  @Post('badges') createBadge(@Body() dto: BadgeDto) {
    return this.admin.createBadge(dto);
  }
  @Patch('badges/:id') updateBadge(@Param() params: IdDto, @Body() dto: UpdateBadgeDto) {
    return this.admin.updateBadge(params.id, dto);
  }
  @Delete('badges/:id') deleteBadge(@Param() params: IdDto) {
    return this.admin.deleteBadge(params.id);
  }
}
