import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Actor, CurrentUser, Roles } from '../common/security';
import { IdDto } from '../common/dto';
import { BrainService } from './brain.service';
import { BrainActionDto, BrainAnswerDto, CreateBrainDto } from './brain.dto';
@ApiTags('Brain Ring')
@ApiBearerAuth()
@Roles('STUDENT')
@Controller('brain-ring')
export class BrainController {
  constructor(private readonly brain: BrainService) {}
  @Get() list(@CurrentUser() actor: Actor) {
    return this.brain.list(actor);
  }
  @Post() create(@CurrentUser() actor: Actor, @Body() dto: CreateBrainDto) {
    return this.brain.create(actor, dto);
  }
  @Get(':id') get(@CurrentUser() actor: Actor, @Param() params: IdDto) {
    return this.brain.get(actor, params.id);
  }
  @Post(':id/actions') action(
    @CurrentUser() actor: Actor,
    @Param() params: IdDto,
    @Body() dto: BrainActionDto,
  ) {
    return this.brain.action(actor, params.id, dto);
  }
  @Post(':id/answers') answer(
    @CurrentUser() actor: Actor,
    @Param() params: IdDto,
    @Body() dto: BrainAnswerDto,
  ) {
    return this.brain.answer(actor, params.id, dto);
  }
}
