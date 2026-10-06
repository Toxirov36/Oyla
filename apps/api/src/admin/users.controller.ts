import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/security';
import { IdDto } from '../common/dto';
import { Actor, CurrentUser } from '../common/security';
import { AdminUserQueryDto, CreateUserDto, UpdateUserDto } from './admin.dto';
import { AdminService } from './admin.service';
@ApiTags('Admin')
@ApiBearerAuth()
@Roles('ADMIN')
@Controller('admin/users')
export class AdminUsersController {
  constructor(private readonly admin: AdminService) {}
  @Get() list(@Query() query: AdminUserQueryDto) {
    return this.admin.users(query);
  }
  @Post() create(@Body() dto: CreateUserDto) {
    return this.admin.createUser(dto);
  }
  @Patch(':id') update(
    @Param() params: IdDto,
    @Body() dto: UpdateUserDto,
    @CurrentUser() actor: Actor,
  ) {
    return this.admin.updateUser(params.id, dto, actor);
  }
  @Delete(':id') remove(@Param() params: IdDto, @CurrentUser() actor: Actor) {
    return this.admin.updateUser(params.id, { active: false }, actor);
  }
}
