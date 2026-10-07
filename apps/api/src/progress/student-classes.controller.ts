import { Controller, Get, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Actor, CurrentUser, Roles } from '../common/security';
import { IdDto } from '../common/dto';
import { StudentClassesService } from './student-classes.service';

@ApiTags('Student classes')
@ApiBearerAuth()
@Roles('STUDENT')
@Controller('students/me/classes')
export class StudentClassesController {
  constructor(private readonly classes: StudentClassesService) {}
  @Get() list(@CurrentUser() actor: Actor) {
    return this.classes.list(actor);
  }
  @Get(':id') detail(@CurrentUser() actor: Actor, @Param() params: IdDto) {
    return this.classes.detail(actor, params.id);
  }
}
