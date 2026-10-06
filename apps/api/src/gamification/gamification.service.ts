import { Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { nextStreak } from '../learning/rules';

@Injectable()
export class GamificationService {
  async reward(
    tx: Prisma.TransactionClient,
    userId: string,
    sourceKey: string,
    type: string,
    amount: number,
  ) {
    const exists = await tx.xpTransaction.findUnique({
      where: { userId_sourceKey: { userId, sourceKey } },
    });
    if (exists || amount <= 0) return 0;
    await tx.xpTransaction.create({ data: { userId, sourceKey, type, amount } });
    return amount;
  }
  async streak(tx: Prisma.TransactionClient, userId: string, day: string, bonus: number) {
    const previous = await tx.streak.findUnique({ where: { userId } });
    const next = nextStreak(previous, day);
    await tx.streak.upsert({ where: { userId }, create: { userId, ...next }, update: next });
    const earned =
      next.current % 7 === 0 && previous?.lastDay !== day
        ? await this.reward(tx, userId, `streak:${day}`, 'STREAK', bonus)
        : 0;
    return { streak: next, earned };
  }
  async badges(tx: Prisma.TransactionClient, userId: string) {
    const [badges, progress, challenges, perfect, answers, streak, owned] = await Promise.all([
      tx.badge.findMany(),
      tx.progress.findMany({
        where: { userId },
        include: {
          lesson: { include: { topic: { include: { course: { include: { subject: true } } } } } },
        },
      }),
      tx.attempt.count({ where: { userId, status: 'COMPLETED', lessonId: null } }),
      tx.attempt.count({ where: { userId, status: 'COMPLETED', score: 100 } }),
      tx.attemptAnswer.count({
        where: { correct: true, attempt: { userId, status: 'COMPLETED' } },
      }),
      tx.streak.findUnique({ where: { userId } }),
      tx.userBadge.findMany({ where: { userId } }),
    ]);
    const metrics = {
      LESSONS: progress.length,
      CHALLENGES: challenges,
      PERFECT: perfect,
      ANSWERS: answers,
      STREAK: streak?.longest || 0,
      MATH: progress.filter((p) => p.lesson.topic.course.subject.slug === 'mathematics').length,
      ENGLISH: progress.filter((p) => p.lesson.topic.course.subject.slug === 'english').length,
      CODING: progress.filter((p) => p.lesson.topic.course.subject.slug === 'informatics').length,
    };
    const unlocked = badges.filter(
      (b) => metrics[b.criterion] >= b.threshold && !owned.some((o) => o.badgeId === b.id),
    );
    if (unlocked.length) {
      await tx.userBadge.createMany({
        data: unlocked.map((b) => ({ userId, badgeId: b.id })),
        skipDuplicates: true,
      });
      await tx.notification.createMany({
        data: unlocked.map((b) => ({ userId, title: 'Yangi nishon!', body: b.title })),
      });
    }
    return unlocked.map((b) => ({ id: b.id, title: b.title, description: b.description }));
  }
}
