import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma.service';
import { Actor } from '../common/security';

export const questionSelect = {
  id: true,
  lessonId: true,
  text: true,
  type: true,
  difficulty: true,
  hint: true,
  xp: true,
  position: true,
  options: { orderBy: { position: 'asc' as const }, select: { id: true, text: true, value: true } },
} satisfies Prisma.QuestionSelect;
export function visibleLesson(grade?: number | null): Prisma.LessonWhereInput {
  return {
    status: 'PUBLISHED',
    topic: {
      status: 'PUBLISHED',
      course: {
        status: 'PUBLISHED',
        ...(grade ? { grade } : {}),
        subject: { status: 'PUBLISHED' },
      },
    },
  };
}
export const visibleQuestion = (grade?: number | null): Prisma.QuestionWhereInput => ({
  status: 'PUBLISHED',
  lesson: visibleLesson(grade),
});

@Injectable()
export class ContentService {
  constructor(private readonly db: PrismaService) {}
  async subjects(actor: Actor, grade?: number) {
    const selectedGrade = actor.role === 'STUDENT' ? actor.grade! : grade;
    return this.db.subject.findMany({
      where: { status: 'PUBLISHED' },
      orderBy: { position: 'asc' },
      include: {
        courses: {
          where: { status: 'PUBLISHED', ...(selectedGrade ? { grade: selectedGrade } : {}) },
          orderBy: [{ grade: 'asc' }, { position: 'asc' }],
          include: {
            topics: {
              where: { status: 'PUBLISHED' },
              orderBy: { position: 'asc' },
              include: {
                lessons: {
                  where: { status: 'PUBLISHED' },
                  orderBy: { position: 'asc' },
                  select: { id: true, title: true, duration: true, position: true },
                },
              },
            },
          },
        },
      },
    });
  }
  async course(id: string, actor: Actor) {
    const course = await this.db.course.findFirst({
      where: {
        id,
        status: 'PUBLISHED',
        subject: { status: 'PUBLISHED' },
        ...(actor.role === 'STUDENT' ? { grade: actor.grade! } : {}),
      },
      include: {
        subject: true,
        topics: {
          where: { status: 'PUBLISHED' },
          orderBy: { position: 'asc' },
          include: {
            lessons: {
              where: { status: 'PUBLISHED' },
              orderBy: { position: 'asc' },
              select: { id: true, title: true, duration: true },
            },
          },
        },
      },
    });
    if (!course) throw new NotFoundException('Kurs topilmadi.');
    return course;
  }
  async topic(id: string, actor: Actor) {
    const topic = await this.db.topic.findFirst({
      where: {
        id,
        status: 'PUBLISHED',
        course: {
          status: 'PUBLISHED',
          subject: { status: 'PUBLISHED' },
          ...(actor.role === 'STUDENT' ? { grade: actor.grade! } : {}),
        },
      },
      include: {
        course: { include: { subject: true } },
        lessons: {
          where: { status: 'PUBLISHED' },
          orderBy: { position: 'asc' },
          select: { id: true, title: true, duration: true },
        },
      },
    });
    if (!topic) throw new NotFoundException('Mavzu topilmadi.');
    return topic;
  }
  async lesson(id: string, actor: Actor) {
    const lesson = await this.db.lesson.findFirst({
      where: { id, ...visibleLesson(actor.role === 'STUDENT' ? actor.grade : undefined) },
      include: {
        topic: { include: { course: { include: { subject: true } } } },
        questions: {
          where: { status: 'PUBLISHED' },
          orderBy: { position: 'asc' },
          select: questionSelect,
        },
      },
    });
    if (!lesson) throw new NotFoundException('Dars topilmadi.');
    return lesson;
  }
}
