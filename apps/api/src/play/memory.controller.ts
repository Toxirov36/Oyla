import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsInt, IsUUID, Max, Min } from 'class-validator';
import { IdDto, Optional } from '../common/dto';
import { Actor, CurrentUser, Roles } from '../common/security';
import { memorySubjects, type MemorySubject } from './memory-content';
import { MemoryService } from './memory.service';

class StartMemoryDto {
  @IsIn(memorySubjects) subject!: MemorySubject;
  @Optional() @IsInt() @Min(1) @Max(3) stage?: number;
}
class GuessMemoryDto {
  @IsUUID('4') requestId!: string;
  @IsUUID('4') firstId!: string;
  @IsUUID('4') secondId!: string;
}
class ReportMemoryDto {
  @IsIn(['WRONG_PAIR', 'INAPPROPRIATE', 'OTHER']) reason!: string;
}
class MemorySettingDto {
  @IsBoolean() aiEnabled!: boolean;
}

@ApiTags('Memory garden')
@ApiBearerAuth()
@Controller()
export class MemoryController {
  constructor(private readonly memory: MemoryService) {}

  @Roles('STUDENT') @Post('memory/rounds') start(@CurrentUser() actor: Actor, @Body() dto: StartMemoryDto) {
    return this.memory.start(actor, dto.subject, dto.stage);
  }
  @Roles('STUDENT') @Post('memory/rounds/:id/guesses') guess(
    @CurrentUser() actor: Actor, @Param() params: IdDto, @Body() dto: GuessMemoryDto,
  ) {
    return this.memory.guess(actor, params.id, dto.requestId, dto.firstId, dto.secondId);
  }
  @Roles('ADMIN') @Get('admin/memory/decks') decks() {
    return this.memory.decks();
  }
  @Roles('ADMIN') @Get('admin/memory/jobs') jobs() {
    return this.memory.jobs();
  }
  @Roles('ADMIN') @Patch('admin/memory/decks/:id/archive') archive(@Param() params: IdDto) {
    return this.memory.archive(params.id);
  }
  @Roles('STUDENT') @Post('memory/rounds/:id/report') report(
    @CurrentUser() actor: Actor, @Param() params: IdDto, @Body() dto: ReportMemoryDto,
  ) {
    return this.memory.report(actor, params.id, dto.reason);
  }
  @Roles('ADMIN') @Get('admin/memory/reports') reports() {
    return this.memory.reports();
  }
  @Roles('ADMIN') @Patch('admin/memory/reports/:id/resolve') resolveReport(@Param() params: IdDto) {
    return this.memory.resolveReport(params.id);
  }
  @Roles('ADMIN') @Get('admin/memory/settings') setting() {
    return this.memory.setting();
  }
  @Roles('ADMIN') @Patch('admin/memory/settings') setSetting(@Body() dto: MemorySettingDto) {
    return this.memory.setAiEnabled(dto.aiEnabled);
  }
}
