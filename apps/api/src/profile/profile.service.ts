import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { Actor } from '../common/security';
import { visibleLesson } from '../content/content.service';
import { localDay } from '../learning/rules';
import { UpdateProfileDto } from './profile.dto';
import { avatarSelect } from './avatars';
import { photoSelect, publicMedia } from './public-media';

@Injectable()
export class ProfileService {
  constructor(private readonly db: PrismaService) {}

  async get(actor: Actor) {
    const stored = await this.db.user.findUniqueOrThrow({
      where: { id: actor.id },
      select: {
        id: true,
        name: true,
        preferredLocale: true,
        avatarId: true,
        avatar: { select: avatarSelect },
        photo: { select: photoSelect },
        email: true,
        role: true,
        teacherAccess: true,
        createdAt: true,
        student: { select: { grade: true } },
      },
    });
    const user = publicMedia(stored);
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
          where: { studentId: user.id, class: { grade: user.student!.grade } },
          orderBy: [{ class: { name: 'asc' } }, { classId: 'asc' }],
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
    if (user.role === 'TEACHER' || user.teacherAccess) {
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
    if (dto.name === undefined && dto.avatarId === undefined && dto.preferredLocale === undefined)
      throw new BadRequestException('Ism, avatar yoki til tanlang.');
    await this.db.withUserLock(actor.id, async (tx) => {
      if (dto.avatarId) {
        if (!(await tx.avatar.findFirst({ where: { id: dto.avatarId, active: true } })))
          throw new BadRequestException('Bu avatar tanlash uchun mavjud emas.');
        await tx.profilePhoto.deleteMany({ where: { userId: actor.id } });
      }
      await tx.user.update({ where: { id: actor.id }, data: dto });
    });
    return this.get(actor);
  }
}
