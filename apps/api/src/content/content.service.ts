import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../common/prisma.service';
import { assertLessonAccess, lessonAccess } from '../learning/lesson-access';
import { Actor } from '../common/security';

export const questionSelect = {
  version: true,
  config: true,
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
    const subjects = await this.db.subject.findMany({
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
                  select: {
                    id: true,
                    title: true,
                    duration: true,
                    position: true,
                    prerequisiteId: true,
                    unlockScore: true,
                  },
                },
              },
            },
          },
        },
      },
    });
    const access = await lessonAccess(this.db, actor);
    return subjects.map((s) => ({
      ...s,
      courses: s.courses.map((c) => ({
        ...c,
        topics: c.topics.map((t) => ({
          ...t,
          lessons: t.lessons.map((l) => ({ ...l, ...access(l) })),
        })),
      })),
    }));
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
    await assertLessonAccess(this.db, actor, lesson);
    return { ...lesson, ...(await lessonAccess(this.db, actor))(lesson) };
  }
}
