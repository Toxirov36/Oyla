import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Res,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { Actor, CurrentUser, Roles } from '../common/security';
import { IdDto } from '../common/dto';
import { CreateAssignmentDto } from './teacher.dto';
import { TeacherService } from './teacher.service';
import { MAX_ASSIGNMENT_ATTACHMENT_BYTES, MAX_ASSIGNMENT_ATTACHMENTS } from './assignment-storage';
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
  @Post('assignments')
  @UseInterceptors(
    FilesInterceptor('attachments', MAX_ASSIGNMENT_ATTACHMENTS, {
      limits: {
        fileSize: MAX_ASSIGNMENT_ATTACHMENT_BYTES,
        files: MAX_ASSIGNMENT_ATTACHMENTS,
        fields: 3,
        parts: 8,
      },
    }),
  )
  create(
    @CurrentUser() actor: Actor,
    @Body() dto: CreateAssignmentDto,
    @UploadedFiles() files: { buffer: Buffer; originalname: string; mimetype: string; size: number }[] = [],
  ) {
    return this.teacher.create(actor, dto, files);
  }
  @Delete('assignments/:id') remove(@CurrentUser() actor: Actor, @Param() dto: IdDto) {
    return this.teacher.removeAssignment(actor, dto.id);
  }
  @Roles('TEACHER', 'STUDENT')
  @Get('assignment-attachments/:id')
  async downloadAttachment(
    @CurrentUser() actor: Actor,
    @Param() dto: IdDto,
    @Res() response: Response,
  ) {
    const file = await this.teacher.getAssignmentAttachment(actor, dto.id);
    const buffer = await this.teacher.downloadAssignmentAttachment(file.storageKey);
    const fallback = file.originalName.replace(/[^\x20-\x7e]/g, '_').replace(/["\\]/g, '_');
    response.setHeader('Content-Type', file.contentType);
    response.setHeader('Content-Length', buffer.length);
    response.setHeader('Content-Disposition', `attachment; filename="${fallback}"; filename*=UTF-8''${encodeURIComponent(file.originalName)}`);
    response.setHeader('Cache-Control', 'private, no-store');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.send(buffer);
  }
}
