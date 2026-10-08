import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, PartialType } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsInt, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';
import { IdDto, Optional, Trim } from '../common/dto';
import { Roles } from '../common/security';
import { PrismaService } from '../common/prisma.service';
import catalog from './avatar-catalog.json';

export const avatarSelect = { id: true, name: true, imageUrl: true } as const;
export class AvatarDto {
  @Trim() @IsString() @MinLength(2) @MaxLength(60) name!: string;
  @IsIn(catalog.map((avatar) => avatar.imageUrl)) imageUrl!: string;
  @Optional() @IsBoolean() active?: boolean;
  @Optional() @IsInt() @Min(0) @Max(1000) position?: number;
}
export class UpdateAvatarDto extends PartialType(AvatarDto, { skipNullProperties: false }) {}
@Injectable()
export class AvatarsService {
  constructor(private readonly db: PrismaService) {}
  list(admin = false) {
    return this.db.avatar.findMany({
      where: admin ? {} : { active: true },
      orderBy: [{ position: 'asc' }, { id: 'asc' }],
    });
  }
  create(dto: AvatarDto) {
    return this.db.avatar.create({ data: dto });
  }
  async update(id: string, dto: UpdateAvatarDto) {
    if (!(await this.db.avatar.findUnique({ where: { id } })))
      throw new NotFoundException('Avatar topilmadi.');
    return this.db.avatar.update({ where: { id }, data: dto });
  }
}
@ApiTags('Avatars')
@ApiBearerAuth()
@Controller()
export class AvatarsController {
  constructor(private readonly avatars: AvatarsService) {}
  @Get('avatars') list() {
    return this.avatars.list();
  }
  @Get('admin/avatars') @Roles('ADMIN') async adminList() {
    return { items: await this.avatars.list(true), assets: catalog };
  }
  @Post('admin/avatars') @Roles('ADMIN') create(@Body() dto: AvatarDto) {
    return this.avatars.create(dto);
  }
  @Patch('admin/avatars/:id') @Roles('ADMIN') update(
    @Param() params: IdDto,
    @Body() dto: UpdateAvatarDto,
  ) {
    return this.avatars.update(params.id, dto);
  }
}
