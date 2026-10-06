import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Actor, CurrentUser, Roles } from '../common/security';
import { IdDto } from '../common/dto';
import { CreateAssignmentDto } from './teacher.dto';
import { TeacherService } from './teacher.service';
@ApiTags('Teacher')
@ApiBearerAuth()
@Roles('TEACHER')
@Controller('teacher')
export class TeacherController {
  constructor(private readonly teacher: TeacherService) {}
  @Get('classes') classes(@CurrentUser() actor: Actor) {
    return this.teacher.classes(actor);
  }
  @Get('classes/:id') group(@CurrentUser() actor: Actor, @Param() dto: IdDto) {
    return this.teacher.classDetail(actor, dto.id);
  }
  @Get('classes/:id/students') async students(@CurrentUser() actor: Actor, @Param() dto: IdDto) {
    return (await this.teacher.classDetail(actor, dto.id)).students;
  }
  @Get('assignments') assignments(@CurrentUser() actor: Actor) {
    return this.teacher.assignments(actor);
  }
  @Post('assignments') create(@CurrentUser() actor: Actor, @Body() dto: CreateAssignmentDto) {
    return this.teacher.create(actor, dto);
  }
}
