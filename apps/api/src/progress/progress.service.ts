import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { Actor } from '../common/security';
import { visibleLesson } from '../content/content.service';
import { localDay, mean, weekStart } from '../learning/rules';

@Injectable()
export class ProgressService {
  constructor(private readonly db: PrismaService) {}
  async dashboard(actor: Actor) {
    const [user, xp, levels, streak, progress, lessons, badges, assignments, daily] =
      await Promise.all([
        this.db.user.findUniqueOrThrow({
          where: { id: actor.id },
          select: { id: true, name: true, email: true, student: { select: { grade: true } } },
        }),
        this.db.xpTransaction.aggregate({ where: { userId: actor.id }, _sum: { amount: true } }),
        this.db.level.findMany({ orderBy: { threshold: 'asc' } }),
        this.db.streak.findUnique({ where: { userId: actor.id } }),
        this.db.progress.findMany({
          where: { userId: actor.id, lesson: visibleLesson(actor.grade) },
        }),
        this.db.lesson.findMany({
          where: visibleLesson(actor.grade),
          orderBy: [
            { topic: { course: { subject: { position: 'asc' } } } },
            { topic: { position: 'asc' } },
            { position: 'asc' },
          ],
          include: { topic: { include: { course: { include: { subject: true } } } } },
        }),
        this.db.userBadge.findMany({
          where: { userId: actor.id },
          include: { badge: true },
          orderBy: { createdAt: 'desc' },
          take: 4,
        }),
        this.assignments(actor),
        this.db.attempt.findUnique({ where: { dailyKey: `${actor.id}:${localDay()}` } }),
      ]);
    const totalXp = xp._sum.amount || 0;
    const level = levels.filter((l) => l.threshold <= totalXp).at(-1) || {
      number: 1,
      threshold: 0,
      title: 'Boshlovchi',
    };
    const nextLevel = levels.find((l) => l.threshold > totalXp) || null;
    const continueLesson =
      lessons.find((l) => !progress.some((p) => p.lessonId === l.id)) || lessons[0] || null;
    const subjectMap = new Map<
      string,
      {
        id: string;
        slug: string;
        title: string;
        total: number;
        completed: number;
        scores: number[];
      }
    >();
    const topicMap = new Map<
      string,
      {
        id: string;
        title: string;
        subject: string;
        total: number;
        completed: number;
        scores: number[];
      }
    >();
    for (const lesson of lessons) {
      const subject = lesson.topic.course.subject;
      const current = subjectMap.get(subject.id) || {
        id: subject.id,
        slug: subject.slug,
        title: subject.title,
        total: 0,
        completed: 0,
        scores: [],
      };
      const topic = topicMap.get(lesson.topicId) || {
        id: lesson.topicId,
        title: lesson.topic.title,
        subject: subject.title,
        total: 0,
        completed: 0,
        scores: [],
      };
      current.total++;
      topic.total++;
      const completed = progress.find((p) => p.lessonId === lesson.id);
      if (completed) {
        current.completed++;
        current.scores.push(completed.bestScore);
        topic.completed++;
        topic.scores.push(completed.bestScore);
      }
      subjectMap.set(subject.id, current);
      topicMap.set(lesson.topicId, topic);
    }
    const summarize = <T extends { total: number; completed: number; scores: number[] }>(
      entry: T,
    ) => ({
      ...entry,
      progress: Math.round((entry.completed / entry.total) * 100),
      mastery: mean(entry.scores),
    });
    const recent = await this.db.xpTransaction.findMany({
      where: { userId: actor.id, createdAt: { gte: new Date(Date.now() - 7 * 86400000) } },
      select: { amount: true, createdAt: true },
    });
    const activity = Array.from({ length: 7 }, (_, i) => {
      const day = localDay(new Date(Date.now() - (6 - i) * 86400000));
      return {
        day,
        xp: recent
          .filter((r) => localDay(r.createdAt) === day)
          .reduce((sum, r) => sum + r.amount, 0),
      };
    });
    const currentStreak =
      streak && (Date.parse(localDay()) - Date.parse(streak.lastDay)) / 86400000 <= 1
        ? streak.current
        : 0;
    return {
      user,
      totalXp,
      level,
      nextLevel,
      streak: currentStreak,
      longestStreak: streak?.longest || 0,
      completedLessons: progress.length,
      completedLessonIds: progress.map((p) => p.lessonId),
      totalLessons: lessons.length,
      continueLesson: continueLesson
        ? {
            id: continueLesson.id,
            title: continueLesson.title,
            duration: continueLesson.duration,
            subject: continueLesson.topic.course.subject.title,
            slug: continueLesson.topic.course.subject.slug,
            topic: continueLesson.topic.title,
          }
        : null,
      subjects: [...subjectMap.values()].map(summarize),
      topics: [...topicMap.values()].map(summarize),
      badges,
      assignments,
      dailyCompleted: daily?.status === 'COMPLETED',
      activity,
    };
  }
  async assignments(actor: Actor) {
    return this.db.assignment.findMany({
      where: {
        class: { students: { some: { studentId: actor.id } } },
        lesson: visibleLesson(actor.grade),
      },
      include: {
        class: { select: { id: true, name: true } },
        lesson: { select: { id: true, title: true } },
        submissions: {
          where: { userId: actor.id },
          select: { score: true, late: true, createdAt: true },
        },
      },
      orderBy: { deadline: 'asc' },
    });
  }
  async badges(actor: Actor) {
    const badges = await this.db.badge.findMany({
      include: { users: { where: { userId: actor.id }, select: { createdAt: true } } },
      orderBy: { threshold: 'asc' },
    });
    return badges.map(({ users, ...badge }) => ({
      ...badge,
      unlockedAt: users[0]?.createdAt || null,
    }));
  }
  async leaderboard(actor: Actor, scope: 'weekly' | 'class', classId?: string) {
    let memberIds: string[] | undefined;
    if (scope === 'class') {
      const group = await this.db.class.findFirst({
        where: {
          ...(classId ? { id: classId } : {}),
          ...(actor.role === 'STUDENT'
            ? { students: { some: { studentId: actor.id } } }
            : actor.role === 'TEACHER'
              ? { teacherId: actor.id }
              : {}),
        },
        include: { students: { select: { studentId: true } } },
      });
      if (!group) {
        if (classId) throw new NotFoundException('Sinf topilmadi.');
        return [];
      }
      memberIds = group.students.map((s) => s.studentId);
    }
    const rows = await this.db.xpTransaction.groupBy({
      by: ['userId'],
      where: {
        ...(scope === 'weekly' ? { createdAt: { gte: weekStart() } } : {}),
        ...(memberIds ? { userId: { in: memberIds } } : {}),
        user: { role: 'STUDENT', active: true },
      },
      _sum: { amount: true },
      orderBy: [{ _sum: { amount: 'desc' } }, { userId: 'asc' }],
      take: 50,
    });
    const users = await this.db.user.findMany({
      where: { id: { in: rows.map((r) => r.userId) } },
      select: { id: true, name: true },
    });
    return rows.map((row, i) => ({
      rank: i + 1,
      userId: row.userId,
      name: users.find((u) => u.id === row.userId)?.name || 'O‘quvchi',
      xp: row._sum.amount || 0,
      isMe: row.userId === actor.id,
    }));
  }
}
