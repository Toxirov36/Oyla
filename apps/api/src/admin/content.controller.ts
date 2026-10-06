import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/security';
import { IdDto } from '../common/dto';

import {
  SubjectDto,
  UpdateSubjectDto,
  CourseDto,
  UpdateCourseDto,
  TopicDto,
  UpdateTopicDto,
  LessonDto,
  UpdateLessonDto,
  QuestionDto,
  UpdateQuestionDto,
} from './admin.dto';
import { AdminService } from './admin.service';
@ApiTags('Admin')
@ApiBearerAuth()
@Roles('ADMIN')
@Controller('admin')
export class AdminContentController {
  constructor(private readonly admin: AdminService) {}
  @Get('content') content() {
    return this.admin.content();
  }
  @Post('subjects') createSubject(@Body() dto: SubjectDto) {
    return this.admin.createSubject(dto);
  }
  @Patch('subjects/:id') updateSubject(@Param() params: IdDto, @Body() dto: UpdateSubjectDto) {
    return this.admin.updateSubject(params.id, dto);
  }
  @Delete('subjects/:id') deleteSubject(@Param() params: IdDto) {
    return this.admin.deleteSubject(params.id);
  }
  @Post('courses') createCourse(@Body() dto: CourseDto) {
    return this.admin.createCourse(dto);
  }
  @Patch('courses/:id') updateCourse(@Param() params: IdDto, @Body() dto: UpdateCourseDto) {
    return this.admin.updateCourse(params.id, dto);
  }
  @Delete('courses/:id') deleteCourse(@Param() params: IdDto) {
    return this.admin.deleteCourse(params.id);
  }
  @Post('topics') createTopic(@Body() dto: TopicDto) {
    return this.admin.createTopic(dto);
  }
  @Patch('topics/:id') updateTopic(@Param() params: IdDto, @Body() dto: UpdateTopicDto) {
    return this.admin.updateTopic(params.id, dto);
  }
  @Delete('topics/:id') deleteTopic(@Param() params: IdDto) {
    return this.admin.deleteTopic(params.id);
  }
  @Post('lessons') createLesson(@Body() dto: LessonDto) {
    return this.admin.createLesson(dto);
  }
  @Patch('lessons/:id') updateLesson(@Param() params: IdDto, @Body() dto: UpdateLessonDto) {
    return this.admin.updateLesson(params.id, dto);
  }
  @Delete('lessons/:id') deleteLesson(@Param() params: IdDto) {
    return this.admin.deleteLesson(params.id);
  }
  @Post('questions') createQuestion(@Body() dto: QuestionDto) {
    return this.admin.createQuestion(dto);
  }
  @Patch('questions/:id') updateQuestion(@Param() params: IdDto, @Body() dto: UpdateQuestionDto) {
    return this.admin.updateQuestion(params.id, dto);
  }
  @Delete('questions/:id') deleteQuestion(@Param() params: IdDto) {
    return this.admin.deleteQuestion(params.id);
  }
}
