import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Injectable,
  NotFoundException,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, PartialType } from '@nestjs/swagger';
import {
  IsEnum,
  IsIn,
  IsInt,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  Matches,
} from 'class-validator';
import { ContentStatus, VideoKind } from '../../generated/prisma/client';
import { PrismaService } from '../common/prisma.service';
import { Actor, CurrentUser, Roles } from '../common/security';
import { IdDto, Optional, Trim } from '../common/dto';
import animations from './animations.json';
export class VideoDto {
  @Trim() @IsString() @MinLength(3) @MaxLength(150) title!: string;
  @Trim() @IsString() @MinLength(5) @MaxLength(1000) description!: string;
  @IsInt() @Min(5) @Max(7) grade!: number;
  @IsIn(['mathematics', 'english', 'informatics']) subject!: string;
  @IsEnum(VideoKind) kind!: VideoKind;
  @Optional() @IsIn(animations.map((animation) => animation.key)) animationKey?: string;
  @Optional() @IsString() @Matches(/^[A-Za-z0-9_-]{11}$/) youtubeId?: string;
  @Optional() @IsEnum(ContentStatus) status?: ContentStatus;
  @Optional() @IsInt() @Min(0) @Max(10000) position?: number;
}
export class UpdateVideoDto extends PartialType(VideoDto, { skipNullProperties: false }) {}
@Injectable()
export class VideosService {
  constructor(private readonly db: PrismaService) {}
  private presentation<T extends { kind: VideoKind; animationKey: string | null }>(video: T) {
    return {
      ...video,
      animation:
        video.kind === 'ANIMATION'
          ? (animations.find((animation) => animation.key === video.animationKey) ?? null)
          : null,
    };
  }
  async list(actor: Actor) {
    const rows = await this.db.videoLesson.findMany({
      where: actor.role === 'STUDENT' ? { status: 'PUBLISHED', grade: actor.grade! } : {},
      orderBy: [{ position: 'asc' }, { id: 'asc' }],
    });
    return rows.map((video) => this.presentation(video));
  }
  async get(actor: Actor, id: string) {
    const video = await this.db.videoLesson.findFirst({
      where: {
        id,
        ...(actor.role === 'STUDENT' ? { status: 'PUBLISHED', grade: actor.grade! } : {}),
      },
    });
    if (!video) throw new NotFoundException('Videodars topilmadi.');
    return this.presentation(video);
  }
  private checked(dto: VideoDto) {
    const animation = animations.find((item) => item.key === dto.animationKey);
    if (
      dto.kind === 'ANIMATION'
        ? !animation || animation.grade !== dto.grade || animation.subject !== dto.subject
        : !dto.youtubeId
    )
      throw new BadRequestException('Video manbasi, fan va sinfni mos tanlang.');
    return {
      ...dto,
      animationKey: dto.kind === 'ANIMATION' ? dto.animationKey! : null,
      youtubeId: dto.kind === 'YOUTUBE' ? dto.youtubeId! : null,
    };
  }
  create(dto: VideoDto) {
    return this.db.videoLesson.create({ data: this.checked(dto) });
  }
  async update(id: string, dto: UpdateVideoDto) {
    const current = await this.db.videoLesson.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Videodars topilmadi.');
    return this.db.videoLesson.update({
      where: { id },
      data: this.checked({
        ...current,
        ...dto,
        animationKey: dto.animationKey ?? current.animationKey ?? undefined,
        youtubeId: dto.youtubeId ?? current.youtubeId ?? undefined,
      }),
    });
  }
  async catalog(actor: Actor) {
    return {
      items: await this.list(actor),
      animations: animations.map((item) => ({
        key: item.key,
        title: item.title,
        grade: item.grade,
        subject: item.subject,
      })),
    };
  }
}
@ApiTags('Video lessons')
@ApiBearerAuth()
@Controller()
export class VideosController {
  constructor(private readonly videos: VideosService) {}
  @Roles('STUDENT') @Get('video-lessons') list(@CurrentUser() actor: Actor) {
    return this.videos.list(actor);
  }
  @Roles('STUDENT', 'ADMIN') @Get('video-lessons/:id') get(
    @CurrentUser() actor: Actor,
    @Param() params: IdDto,
  ) {
    return this.videos.get(actor, params.id);
  }
  @Roles('ADMIN') @Get('admin/video-lessons') admin(@CurrentUser() actor: Actor) {
    return this.videos.catalog(actor);
  }
  @Roles('ADMIN') @Post('admin/video-lessons') create(@Body() dto: VideoDto) {
    return this.videos.create(dto);
  }
  @Roles('ADMIN') @Patch('admin/video-lessons/:id') update(
    @Param() params: IdDto,
    @Body() dto: UpdateVideoDto,
  ) {
    return this.videos.update(params.id, dto);
  }
}
