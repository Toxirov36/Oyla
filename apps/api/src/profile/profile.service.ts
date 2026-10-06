import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { Actor } from '../common/security';
import { visibleLesson } from '../content/content.service';
import { localDay } from '../learning/rules';
import { UpdateProfileDto } from './profile.dto';

@Injectable()
export class ProfileService {
  constructor(private readonly db: PrismaService) {}

  async get(actor: Actor) {
    const user = await this.db.user.findUniqueOrThrow({
      where: { id: actor.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        student: { select: { grade: true } },
      },
    });
    if (user.role === 'STUDENT') {
      const [xp, levels, streak, completedLessons, badges, memberships] = await Promise.all([
        this.db.xpTransaction.aggregate({ where: { userId: user.id }, _sum: { amount: true } }),
        this.db.level.findMany({ orderBy: { threshold: 'asc' } }),
        this.db.streak.findUnique({ where: { userId: user.id } }),
        this.db.progress.count({
          where: { userId: user.id, lesson: visibleLesson(user.student!.grade) },
        }),
        this.db.userBadge.count({ where: { userId: user.id } }),
        this.db.classStudent.findMany({
          where: { studentId: user.id },
          select: {
            class: {
              select: {
                id: true,
                name: true,
                grade: true,
                teacher: { select: { name: true } },
              },
            },
          },
        }),
      ]);
      const totalXp = xp._sum.amount || 0;
      const currentLevel = levels.filter((level) => level.threshold <= totalXp).at(-1);
      const nextLevel = levels.find((level) => level.threshold > totalXp);
      return {
        user,
        student: {
          totalXp,
          level: currentLevel?.number || 1,
          levelTitle: currentLevel?.title || 'Boshlovchi',
          levelThreshold: currentLevel?.threshold || 0,
          nextLevelThreshold: nextLevel?.threshold ?? null,
          streak:
            streak && Date.parse(localDay()) - Date.parse(streak.lastDay) <= 86400000
              ? streak.current
              : 0,
          longestStreak: streak?.longest || 0,
          completedLessons,
          badges,
          classes: memberships.map((membership) => membership.class),
        },
        teacher: null,
      };
    }
    if (user.role === 'TEACHER') {
      const [classes, students, assignments] = await Promise.all([
        this.db.class.findMany({
          where: { teacherId: user.id },
          orderBy: { name: 'asc' },
          select: {
            id: true,
            name: true,
            grade: true,
            _count: { select: { students: true } },
          },
        }),
        this.db.classStudent.findMany({
          where: { class: { teacherId: user.id } },
          distinct: ['studentId'],
          select: { studentId: true },
        }),
        this.db.assignment.count({ where: { class: { teacherId: user.id } } }),
      ]);
      return { user, student: null, teacher: { classes, students: students.length, assignments } };
    }
    return { user, student: null, teacher: null };
  }

  async update(actor: Actor, dto: UpdateProfileDto) {
    // Identity comes only from the authenticated session; role/grade/email are not editable here.
    await this.db.user.update({ where: { id: actor.id }, data: { name: dto.name } });
    return this.get(actor);
  }
}
