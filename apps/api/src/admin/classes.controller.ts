import { Body, Controller, Delete, Get, Param, Patch, Post, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/security';
import { IdDto } from '../common/dto';

import { ClassDto, UpdateClassDto, MembershipDto } from './admin.dto';
import { AdminService } from './admin.service';
@ApiTags('Admin')
@ApiBearerAuth()
@Roles('ADMIN')
@Controller('admin/classes')
export class AdminClassesController {
  constructor(private readonly admin: AdminService) {}
  @Get() list() {
    return this.admin.classes();
  }
  @Post() create(@Body() dto: ClassDto) {
    return this.admin.createClass(dto);
  }
  @Patch(':id') update(@Param() params: IdDto, @Body() dto: UpdateClassDto) {
    return this.admin.updateClass(params.id, dto);
  }
  @Delete(':id') remove(@Param() params: IdDto) {
    return this.admin.deleteClass(params.id);
  }
  @Put(':id/students') students(@Param() params: IdDto, @Body() dto: MembershipDto) {
    return this.admin.membership(params.id, dto);
  }
}
