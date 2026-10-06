import type { Prisma, PrismaClient } from '@prisma/client';
import { curriculum } from './index';
import { legacyCurriculum } from './legacy';
import { lessonId, seedId, type Grade, type SeedLesson } from './types';

type StoredLesson = Prisma.LessonGetPayload<{
  include: { questions: { include: { options: true } } };
}>;
export function isUntouchedStarter(stored: StoredLesson, original: SeedLesson, position: number) {
  if (
    stored.title !== original.title ||
    stored.explanation !== original.explanation ||
    stored.example !== original.example ||
    stored.status !== 'PUBLISHED' ||
    stored.position !== position ||
    stored.duration !== 8 + position * 2 ||
    stored.questions.length !== original.questions.length
  )
    return false;
  return original.questions.every((question, index) => {
    const row = stored.questions.find((value) => value.position === index);
    return (
      row &&
      row.text === question.text &&
      row.type === question.type &&
      row.answer === question.answer &&
      row.explanation === question.explanation &&
      row.status === 'PUBLISHED' &&
      row.xp === null &&
      row.hint === null &&
      row.tolerance === 0.0001 &&
      row.difficulty === (index >= 4 ? 'HARD' : index === 0 ? 'EASY' : 'MEDIUM') &&
      JSON.stringify(
        row.options
          .sort((a, b) => a.position - b.position)
          .map((option) => ({ text: option.text, value: option.value })),
      ) === JSON.stringify((question.options || []).map((text) => ({ text, value: text })))
    );
  });
}
export function canArchiveStarter(
  stored: StoredLesson,
  original: SeedLesson,
  position: number,
  references: { attempts: number; progress: number; assignments: number },
) {
  return (
    references.attempts === 0 &&
    references.progress === 0 &&
    references.assignments === 0 &&
    isUntouchedStarter(stored, original, position)
  );
}

export async function syncCurriculum(db: PrismaClient) {
  let lessons = 0,
    questions = 0,
    archivedLegacy = 0,
    preservedLegacy = 0;
  for (const [subjectPosition, subject] of curriculum.entries()) {
    const subjectId = seedId(subject.slug);
    await db.subject.upsert({
      where: { id: subjectId },
      update: {},
      create: {
        id: subjectId,
        slug: subject.slug,
        title: subject.title,
        description: subject.description,
        position: subjectPosition,
        status: 'PUBLISHED',
      },
    });
    for (const grade of [5, 6, 7] as Grade[]) {
      const courseId = seedId(`${subject.slug}:${grade}`);
      await db.course.upsert({
        where: { id: courseId },
        update: {},
        create: {
          id: courseId,
          subjectId,
          title: `${grade}-sinf ${subject.title}`,
          grade,
          status: 'PUBLISHED',
        },
      });
      for (const [position, lesson] of subject.grades[grade].entries()) {
        const topicId = seedId(`curriculum:v2:${subject.slug}:${grade}:topic:${position}`);
        const contentId = lessonId(subject.slug, grade, position);
        await db.$transaction(async (tx) => {
          await tx.topic.upsert({
            where: { id: topicId },
            update: {},
            create: {
              id: topicId,
              courseId,
              title: lesson.topic,
              position: 100 + position,
              status: 'PUBLISHED',
            },
          });
          await tx.lesson.upsert({
            where: { id: contentId },
            update: {},
            create: {
              id: contentId,
              topicId,
              title: lesson.title,
              explanation: lesson.explanation,
              example: lesson.example,
              duration: 10 + position,
              position: 0,
              status: 'PUBLISHED',
            },
          });
          // Add only missing catalog questions. Never overwrite edits or existing answer keys.
          for (const [index, question] of lesson.questions.entries()) {
            const id = seedId(`${contentId}:question:${index}`);
            if (await tx.question.findUnique({ where: { id }, select: { id: true } })) continue;
            await tx.question.create({
              data: {
                id,
                lessonId: contentId,
                text: question.text,
                type: question.type,
                answer: question.answer,
                explanation: question.explanation,
                hint: question.hint,
                tolerance: question.tolerance,
                position: index,
                difficulty:
                  question.difficulty || (index >= 4 ? 'HARD' : index === 0 ? 'EASY' : 'MEDIUM'),
                status: 'PUBLISHED',
                options: {
                  create: (question.options || []).map((text, optionPosition) => ({
                    text,
                    value: text,
                    position: optionPosition,
                  })),
                },
              },
            });
          }
        });
        lessons++;
        questions += lesson.questions.length;
      }
    }
  }

  // Archive only known, unmodified starter lessons that have no learning/assignment references.
  // Existing attempts (including daily snapshots), progress, assignments, and custom content survive.
  for (const subject of legacyCurriculum)
    for (const grade of [5, 6, 7] as Grade[])
      for (const [position, original] of subject.lessons.entries()) {
        const id = seedId(`${subject.slug}:${grade}:lesson:${position}`);
        const status = await db.$transaction(async (tx) => {
          const stored = await tx.lesson.findUnique({
            where: { id },
            include: { questions: { include: { options: true } }, topic: true },
          });
          if (!stored || stored.status === 'ARCHIVED') return 'none';
          const [attempts, progress, assignments] = await Promise.all([
            tx.attempt.count({
              where: {
                OR: [
                  { lessonId: id },
                  { questionIds: { hasSome: stored.questions.map((question) => question.id) } },
                ],
              },
            }),
            tx.progress.count({ where: { lessonId: id } }),
            tx.assignment.count({ where: { lessonId: id } }),
          ]);
          if (!canArchiveStarter(stored, original, position, { attempts, progress, assignments }))
            return 'preserved';
          await tx.lesson.update({ where: { id }, data: { status: 'ARCHIVED' } });
          const remaining = await tx.lesson.count({
            where: { topicId: stored.topicId, status: { not: 'ARCHIVED' } },
          });
          if (
            !remaining &&
            stored.topic.title === original.topic &&
            stored.topic.status === 'PUBLISHED'
          )
            await tx.topic.update({ where: { id: stored.topicId }, data: { status: 'ARCHIVED' } });
          return 'archived';
        });
        if (status === 'archived') archivedLegacy++;
        if (status === 'preserved') preservedLegacy++;
      }
  return { lessons, questions, archivedLegacy, preservedLegacy };
}
