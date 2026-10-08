import { ForbiddenException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { Actor } from '../common/security';

export async function lessonAccess(
  db: Pick<Prisma.TransactionClient, 'progress' | 'attempt' | 'assignment'>,
  actor: Actor,
) {
  const [progress, attempts, assignments] = await Promise.all([
    db.progress.findMany({
      where: { userId: actor.id },
      select: { lessonId: true, bestScore: true },
    }),
    db.attempt.findMany({
      where: {
        userId: actor.id,
        status: 'IN_PROGRESS',
        createdAt: { gte: new Date(Date.now() - 86400000) },
      },
      select: { id: true, lessonId: true },
    }),
    db.assignment.findMany({
      where: { class: { grade: actor.grade ?? -1, students: { some: { studentId: actor.id } } } },
      select: { lessonId: true },
    }),
  ]);
  return (lesson: {
    id: string;
    prerequisiteId?: string | null;
    unlockScore?: number;
    masteryScore?: number;
  }) => {
    const own = progress.find((p) => p.lessonId === lesson.id);
    const attempt = attempts.find((a) => a.lessonId === lesson.id);
    const prerequisite = progress.find((p) => p.lessonId === lesson.prerequisiteId);
    const locked =
      !own &&
      !!lesson.prerequisiteId &&
      (prerequisite?.bestScore ?? -1) < (lesson.unlockScore ?? 70) &&
      !assignments.some((a) => a.lessonId === lesson.id);
    return {
      state: locked ? 'LOCKED' : attempt ? 'IN_PROGRESS' : own ? 'COMPLETED' : 'AVAILABLE',
      bestScore: own?.bestScore ?? null,
      mastered: !!own && own.bestScore >= (lesson.masteryScore ?? 70),
      masteryThreshold: lesson.masteryScore ?? 70,
      attemptId: locked ? null : (attempt?.id ?? null),
      unlockScore: lesson.unlockScore ?? 70,
    };
  };
}
export async function assertLessonAccess(
  db: Parameters<typeof lessonAccess>[0],
  actor: Actor,
  lesson: Parameters<Awaited<ReturnType<typeof lessonAccess>>>[0],
) {
  if (actor.role === 'STUDENT' && (await lessonAccess(db, actor))(lesson).state === 'LOCKED')
    throw new ForbiddenException(
      `Avval oldingi darsdan kamida ${lesson.unlockScore ?? 70}% oling.`,
    );
}
