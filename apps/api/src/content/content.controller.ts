import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Actor, CurrentUser } from '../common/security';
import { GradeQueryDto, IdDto } from '../common/dto';
import { ContentService } from './content.service';

@ApiTags('Content')
@ApiBearerAuth()
@Controller()
export class ContentController {
  constructor(private readonly content: ContentService) {}
  @Get('subjects') subjects(@CurrentUser() actor: Actor, @Query() query: GradeQueryDto) {
    return this.content.subjects(actor, query.grade);
  }
  @Get('courses/:id') course(@Param() dto: IdDto, @CurrentUser() actor: Actor) {
    return this.content.course(dto.id, actor);
  }
  @Get('topics/:id') topic(@Param() dto: IdDto, @CurrentUser() actor: Actor) {
    return this.content.topic(dto.id, actor);
  }
  @Get('lessons/:id') lesson(@Param() dto: IdDto, @CurrentUser() actor: Actor) {
    return this.content.lesson(dto.id, actor);
  }
}
