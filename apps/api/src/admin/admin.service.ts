import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import * as argon2 from 'argon2';
import { PrismaService } from '../common/prisma.service';
import { Actor } from '../common/security';
import { AdminUserQueryDto, CreateUserDto, UpdateUserDto } from './admin.dto';

import { safeUser } from './safe-user';
@Injectable()
export class AdminService {
  constructor(private readonly db: PrismaService) {}
  async analytics() {
    const [users, students, teachers, lessons, published, attempts, xp, subjects, recent] =
      await Promise.all([
        this.db.user.count(),
        this.db.user.count({ where: { role: 'STUDENT' } }),
        this.db.user.count({ where: { OR: [{ role: 'TEACHER' }, { teacherAccess: true }] } }),
        this.db.lesson.count(),
        this.db.lesson.count({ where: { status: 'PUBLISHED' } }),
        this.db.attempt.aggregate({
          where: { status: 'COMPLETED' },
          _count: true,
          _avg: { score: true },
        }),
        this.db.xpTransaction.aggregate({ _sum: { amount: true } }),
        this.db.subject.count(),
        this.db.attempt.findMany({
          where: { status: 'COMPLETED' },
          orderBy: { completedAt: 'desc' },
          take: 10,
          select: {
            id: true,
            score: true,
            earnedXp: true,
            completedAt: true,
            user: { select: { name: true } },
            lesson: { select: { title: true } },
          },
        }),
      ]);
    return {
      users,
      students,
      teachers,
      lessons,
      published,
      draft: lessons - published,
      completedAttempts: attempts._count,
      averageScore: Math.round(attempts._avg.score || 0),
      totalXp: xp._sum.amount || 0,
      subjects,
      recent,
    };
  }
  async users(query: AdminUserQueryDto) {
    const where: Prisma.UserWhereInput = {
      ...(query.role ? { role: query.role } : {}),
      ...(query.grade ? { student: { grade: query.grade } } : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { email: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [items, total] = await Promise.all([
      this.db.user.findMany({
        where,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        select: safeUser,
        orderBy: { createdAt: 'desc' },
      }),
      this.db.user.count({ where }),
    ]);
    return { items, total, page: query.page, limit: query.limit };
  }
  async createUser(dto: CreateUserDto) {
    if (dto.role === 'STUDENT' && !dto.grade)
      throw new BadRequestException('O‘quvchi sinfini tanlang.');
    if (dto.role === 'STUDENT' && dto.teacherAccess)
      throw new BadRequestException('O‘quvchiga o‘qituvchi paneli berib bo‘lmaydi.');
    const teacherAccess = dto.role === 'TEACHER' || (dto.role === 'ADMIN' && !!dto.teacherAccess);
    return this.db.user.create({
      data: {
        email: dto.email,
        name: dto.name,
        role: dto.role,
        teacherAccess,
        passwordHash: await argon2.hash(dto.password, { type: argon2.argon2id }),
        ...(dto.role === 'STUDENT'
          ? { student: { create: { grade: dto.grade! } } }
          : teacherAccess
            ? { teacher: { create: {} } }
            : {}),
      },
      select: safeUser,
    });
  }
  async updateUser(id: string, dto: UpdateUserDto, actor: Actor) {
    if (id === actor.id && dto.active === false)
      throw new BadRequestException('O‘z hisobingizni o‘chira olmaysiz.');
    return this.db.withUserLock(id, async (tx) => {
      const user = await tx.user.findUniqueOrThrow({ where: { id }, include: { student: true } });
      const role = dto.role ?? user.role;
      if (id === actor.id && role !== user.role)
        throw new BadRequestException('O‘z administrator rolingizni o‘zgartira olmaysiz.');
      if (dto.grade !== undefined && role !== 'STUDENT')
        throw new BadRequestException('Sinf faqat o‘quvchiga tegishli.');
      if (dto.teacherAccess && role === 'STUDENT')
        throw new BadRequestException('O‘quvchiga o‘qituvchi paneli berib bo‘lmaydi.');
      const grade = dto.grade ?? user.student?.grade;
      if (role === 'STUDENT' && !grade)
        throw new BadRequestException('O‘quvchiga aylantirish uchun sinfni tanlang.');
      const teacherAccess =
        role === 'TEACHER' ||
        (role === 'ADMIN' &&
          (dto.teacherAccess ?? (user.role === 'TEACHER' || user.teacherAccess)));
      if (!teacherAccess && (await tx.class.count({ where: { teacherId: id } })))
        throw new BadRequestException(
          'Avval bu foydalanuvchining sinflarini boshqa o‘qituvchiga biriktiring.',
        );
      if (user.role === 'ADMIN' && user.active && (role !== 'ADMIN' || dto.active === false)) {
        // Deactivation and demotion share a lock to preserve the last active administrator.
        await tx.$queryRaw`SELECT pg_advisory_xact_lock(831641)::text`;
        if ((await tx.user.count({ where: { role: 'ADMIN', active: true } })) <= 1)
          throw new BadRequestException('Oxirgi adminni o‘chira olmaysiz.');
      }
      if (user.role === 'STUDENT' && role !== 'STUDENT') {
        await tx.classStudent.deleteMany({ where: { studentId: id } });
        await tx.friendship.deleteMany({ where: { OR: [{ userLowId: id }, { userHighId: id }] } });
        await tx.friendProfile.deleteMany({ where: { userId: id } });
      } else if (role === 'STUDENT' && grade)
        await tx.classStudent.deleteMany({
          where: { studentId: id, class: { grade: { not: grade } } },
        });
      if (role === 'STUDENT')
        await tx.studentProfile.upsert({
          where: { userId: id },
          create: { userId: id, grade: grade! },
          update: { grade },
        });
      if (teacherAccess)
        await tx.teacherProfile.upsert({
          where: { userId: id },
          create: { userId: id },
          update: {},
        });
      const authorityChanged =
        role !== user.role ||
        teacherAccess !== user.teacherAccess ||
        (dto.active !== undefined && dto.active !== user.active) ||
        (dto.email !== undefined && dto.email !== user.email) ||
        (role === 'STUDENT' && grade !== user.student?.grade);
      if (authorityChanged) {
        const now = new Date();
        await tx.session.updateMany({
          where: { userId: id, revokedAt: null },
          data: { revokedAt: now },
        });
        await tx.passwordResetToken.updateMany({
          where: { userId: id, consumedAt: null },
          data: { consumedAt: now },
        });
      }
      if (role !== user.role)
        await tx.notification.create({
          data: {
            userId: id,
            title: 'Hisobingiz roli yangilandi',
            type: 'ACCOUNT',
            body: `Yangi rol: ${{ STUDENT: 'O‘quvchi', TEACHER: 'O‘qituvchi', ADMIN: 'Administrator' }[role]}. Yangi huquqlar bilan tizimga qayta kiring.`,
            link: '/profile',
          },
        });
      const { grade: _grade, ...data } = dto;
      return tx.user.update({
        where: { id },
        data: { ...data, role, teacherAccess },
        select: safeUser,
      });
    });
  }
}
