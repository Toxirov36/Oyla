import 'reflect-metadata';
import type { PrismaClient, Prisma, QuestionType } from '../generated/prisma/client';
import { seedId, type Grade } from './curriculum/types';
import { validateExercise } from '../src/learning/exercises';
import type { ExerciseConfigDto, ExerciseGradingDto } from '../src/learning/exercise.dto';
import pilot from './interactive-pilot-content.json';

export interface PilotQuestion {
  type: QuestionType;
  text: string;
  answer: string;
  explanation: string;
  hint: string;
  options?: string[];
  config?: ExerciseConfigDto;
  grading?: ExerciseGradingDto;
}
export interface PilotLesson {
  slug: string;
  grade: Grade;
  title: string;
  explanation: string;
  example: string;
  questions: PilotQuestion[];
}
export const interactivePilot = pilot as PilotLesson[];
export const pilotLessonId = (slug: string, grade: Grade) =>
  seedId(`interactive:v1:${slug}:${grade}:lesson`);
export async function installInteractivePilot(db: PrismaClient) {
  for (const lesson of interactivePilot) for (const q of lesson.questions) validateExercise(q);
  const report = { lessons: 0, questions: 0, missingCourses: [] as string[] };
  for (const lesson of interactivePilot) {
    const course = await db.course.findFirst({
      where: { subject: { slug: lesson.slug }, grade: lesson.grade },
      orderBy: { position: 'asc' },
    });
    if (!course) {
      report.missingCourses.push(`${lesson.slug}:${lesson.grade}`);
      continue;
    }
    await db.$transaction(async (tx) => {
      const topicId = seedId(`interactive:v1:${lesson.slug}:${lesson.grade}:topic`);
      await tx.topic.upsert({
        where: { id: topicId },
        update: {},
        create: {
          id: topicId,
          courseId: course.id,
          title: 'Interaktiv laboratoriya',
          status: 'PUBLISHED',
          position: 100,
        },
      });
      const lessonId = pilotLessonId(lesson.slug, lesson.grade);
      await tx.lesson.upsert({
        where: { id: lessonId },
        update: {},
        create: {
          id: lessonId,
          topicId,
          title: lesson.title,
          explanation: lesson.explanation,
          example: lesson.example,
          duration: 12,
          position: 0,
          status: 'PUBLISHED',
        },
      });
      for (const [position, q] of lesson.questions.entries()) {
        const id = seedId(`interactive:v1:${lesson.slug}:${lesson.grade}:question:${position}`);
        const { options, config, grading, ...fields } = q;
        await tx.question.upsert({
          where: { id },
          update: {},
          create: {
            id,
            lessonId,
            ...fields,
            position,
            status: 'PUBLISHED',
            difficulty: position < 2 ? 'EASY' : position < 6 ? 'MEDIUM' : 'HARD',
            ...(config ? { config: config as unknown as Prisma.InputJsonValue } : {}),
            ...(grading ? { grading: grading as unknown as Prisma.InputJsonValue } : {}),
            options: {
              create: (options ?? []).map((text, i) => ({
                id: seedId(`${id}:option:${i}`),
                text,
                value: text,
                position: i,
              })),
            },
          },
        });
      }
    });
    report.lessons++;
    report.questions += lesson.questions.length;
  }
  return report;
}
