import { Module } from '@nestjs/common';
import { TeacherController } from './teacher.controller';
import { TeacherService } from './teacher.service';
import { AssignmentStorage } from './assignment-storage';
@Module({ controllers: [TeacherController], providers: [TeacherService, AssignmentStorage] })
export class TeacherModule {}
