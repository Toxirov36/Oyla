import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Actor, CurrentUser, Roles } from '../common/security';
import { IdDto } from '../common/dto';
import { AnswerDto, StartAttemptDto } from './learning.dto';
import { LearningService } from './learning.service';
@ApiTags('Learning')
@ApiBearerAuth()
@Roles('STUDENT')
@Controller()
export class LearningController {
  constructor(private readonly learning: LearningService) {}
  @Get('daily-challenge') daily(@CurrentUser() actor: Actor) {
    return this.learning.daily(actor);
  }
  @Post('attempts') start(@CurrentUser() actor: Actor, @Body() dto: StartAttemptDto) {
    return this.learning.start(actor, dto);
  }
  @Get('attempts/:id') get(@CurrentUser() actor: Actor, @Param() dto: IdDto) {
    return this.learning.get(actor, dto.id);
  }
  @Post('attempts/:id/answers') answer(
    @CurrentUser() actor: Actor,
    @Param() params: IdDto,
    @Body() dto: AnswerDto,
  ) {
    return this.learning.answer(actor, params.id, dto);
  }
  @Post('attempts/:id/complete') complete(@CurrentUser() actor: Actor, @Param() params: IdDto) {
    return this.learning.complete(actor, params.id);
  }
}
