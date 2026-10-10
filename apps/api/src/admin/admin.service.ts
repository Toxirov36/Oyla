import { validateExercise } from '../learning/exercises';
import { checkAnswer } from '../learning/rules';
import { buildFeedback, validateFeedback } from '../learning/feedback';
import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import * as argon2 from 'argon2';
import { PrismaService } from '../common/prisma.service';
import { Actor } from '../common/security';
import { youtubeVideoId } from './youtube';
import {
  AdminUserQueryDto,
  BadgeDto,
  ClassDto,
  CourseDto,
  CreateUserDto,
  LessonDto,
  LevelDto,
  MembershipDto,
  QuestionDto,
  SubjectDto,
  TopicDto,
  UpdateBadgeDto,
  UpdateClassDto,
  UpdateCourseDto,
  UpdateLessonDto,
  UpdateLevelDto,
  UpdateQuestionDto,
  UpdateSubjectDto,
  UpdateTopicDto,
  UpdateUserDto,
  PreviewExerciseDto,
} from './admin.dto';

const safeUser = {
  id: true,
  name: true,
  email: true,
  role: true,
  teacherAccess: true,
  active: true,
  createdAt: true,
  student: { select: { grade: true } },
} as const;
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
  async content() {
    return this.db.subject.findMany({
      orderBy: { position: 'asc' },
      include: {
        courses: {
          orderBy: [{ grade: 'asc' }, { position: 'asc' }],
          include: {
            topics: {
              orderBy: { position: 'asc' },
              include: {
                lessons: {
                  orderBy: { position: 'asc' },
                  include: {
                    questions: {
                      orderBy: { position: 'asc' },
                      include: { options: { orderBy: { position: 'asc' } } },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });
  }
  createSubject(dto: SubjectDto) {
    return this.db.subject.create({ data: dto });
  }
  updateSubject(id: string, dto: UpdateSubjectDto) {
    return this.db.subject.update({ where: { id }, data: dto });
  }
  deleteSubject(id: string) {
    return this.db.subject.delete({ where: { id } });
  }
  createCourse(dto: CourseDto) {
    return this.db.course.create({ data: dto });
  }
  updateCourse(id: string, dto: UpdateCourseDto) {
    return this.db.course.update({ where: { id }, data: dto });
  }
  deleteCourse(id: string) {
    return this.db.course.delete({ where: { id } });
  }
  createTopic(dto: TopicDto) {
    return this.db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(64201, hashtext(${dto.courseId}))::text`;
      const lastTopic = await tx.topic.findFirst({
        where: { courseId: dto.courseId },
        orderBy: [{ position: 'desc' }, { id: 'desc' }],
        select: { position: true },
      });
      return tx.topic.create({
        data: { ...dto, position: (lastTopic?.position ?? -1) + 1 },
      });
    });
  }
  updateTopic(id: string, dto: UpdateTopicDto) {
    return this.db.$transaction(async (tx) => {
      const current = await tx.topic.findUniqueOrThrow({ where: { id } });
      let position = current.position;
      if (dto.courseId && dto.courseId !== current.courseId) {
        await tx.$queryRaw`SELECT pg_advisory_xact_lock(64201, hashtext(${dto.courseId}))::text`;
        const lastTopic = await tx.topic.findFirst({
          where: { courseId: dto.courseId },
          orderBy: [{ position: 'desc' }, { id: 'desc' }],
          select: { position: true },
        });
        position = (lastTopic?.position ?? -1) + 1;
      }
      return tx.topic.update({ where: { id }, data: { ...dto, position } });
    });
  }
  deleteTopic(id: string) {
    return this.db.topic.delete({ where: { id } });
  }
  async createLesson(dto: LessonDto) {
    const position = await this.nextLessonPosition(dto.topicId);
    await this.validatePrerequisite(undefined, dto, position);
    if (dto.status === 'PUBLISHED')
      throw new BadRequestException('Avval darsni qoralama sifatida yarating va savol qo‘shing.');
    return this.db.lesson.create({
      data: {
        topicId: dto.topicId,
        title: dto.title,
        youtubeId: dto.youtubeUrl ? youtubeVideoId(dto.youtubeUrl) : null,
        prerequisiteId: dto.prerequisiteId || null,
        explanation: '',
        example: '',
        duration: 0,
        position,
        status: dto.status,
      },
    });
  }
  async updateLesson(id: string, dto: UpdateLessonDto) {
    const current = await this.db.lesson.findUniqueOrThrow({ where: { id } });
    const position =
      dto.topicId && dto.topicId !== current.topicId
        ? await this.nextLessonPosition(dto.topicId)
        : undefined;
    await this.validatePrerequisite(id, dto, position);
    if (
      dto.status === 'PUBLISHED' &&
      !(await this.db.question.count({ where: { lessonId: id, status: 'PUBLISHED' } }))
    )
      throw new BadRequestException(
        'Darsni chop etish uchun kamida bitta chop etilgan savol kerak.',
      );
    const { youtubeUrl, ...changes } = dto;
    return this.db.lesson.update({
      where: { id },
      data: {
        ...changes,
        ...(youtubeUrl !== undefined ? { youtubeId: youtubeVideoId(youtubeUrl) } : {}),
        ...(dto.prerequisiteId !== undefined ? { prerequisiteId: dto.prerequisiteId || null } : {}),
        ...(position !== undefined ? { position } : {}),
      },
    });
  }
  private async nextLessonPosition(topicId: string) {
    const last = await this.db.lesson.findFirst({
      where: { topicId },
      orderBy: [{ position: 'desc' }, { id: 'desc' }],
      select: { position: true },
    });
    return (last?.position ?? -1) + 1;
  }
  private async validatePrerequisite(
    id: string | undefined,
    dto: UpdateLessonDto,
    targetPosition?: number,
  ) {
    const current = id ? await this.db.lesson.findUniqueOrThrow({ where: { id } }) : null;
    const prerequisiteId = dto.prerequisiteId ?? current?.prerequisiteId;
    if (!prerequisiteId) return;
    const visited = new Set<string>();
    let cursor: string | null = prerequisiteId;
    while (cursor) {
      if (cursor === id || visited.has(cursor) || visited.size > 500)
        throw new BadRequestException('Darslar bog‘lanishida yopiq aylana bo‘lmasligi kerak.');
      visited.add(cursor);
      const node: { prerequisiteId: string | null } | null = await this.db.lesson.findUnique({
        where: { id: cursor },
        select: { prerequisiteId: true },
      });
      cursor = node?.prerequisiteId ?? null;
    }
    const topicId = dto.topicId ?? current?.topicId;
    const target = await this.db.topic.findUniqueOrThrow({ where: { id: topicId } });
    const previous = await this.db.lesson.findFirst({
      where: { id: prerequisiteId },
      include: { topic: true },
    });
    if (
      !previous ||
      previous.id === id ||
      previous.topic.courseId !== target.courseId ||
      !(
        previous.topic.position < target.position ||
        (previous.topicId === target.id &&
          previous.position < (targetPosition ?? current?.position ?? 0))
      )
    )
      throw new BadRequestException(
        'Oldingi dars shu kursda, tartib bo‘yicha avval joylashgan bo‘lishi kerak.',
      );
    if (
      id &&
      dto.topicId &&
      dto.topicId !== current?.topicId &&
      (await this.db.lesson.count({ where: { prerequisiteId: id } }))
    )
      throw new BadRequestException(
        'Bu darsga bog‘liq darslar bor. Avval bog‘lanishlarni yangilang.',
      );
  }
  deleteLesson(id: string) {
    return this.db.lesson.delete({ where: { id } });
  }
  private validateQuestion(dto: {
    type: string;
    answer: string;
    options: { text: string; value: string }[];
    config?: unknown;
    grading?: unknown;
    feedback?: unknown;
    explanation: string;
  }) {
    validateExercise(dto);
    validateFeedback(dto);
    if (
      dto.type === 'MULTIPLE_CHOICE' &&
      (dto.options.length < 2 ||
        !dto.options.some((o) => o.value === dto.answer) ||
        new Set(dto.options.map((o) => o.value)).size !== dto.options.length)
    )
      throw new BadRequestException(
        'Kamida 2 ta noyob variant va ulardan to‘g‘ri javobni kiriting.',
      );
    if (dto.type !== 'MULTIPLE_CHOICE' && dto.options.length)
      throw new BadRequestException('Variantlar faqat variantli savol uchun.');
    if (dto.type === 'TRUE_FALSE' && !['true', 'false'].includes(dto.answer))
      throw new BadRequestException('Javob true yoki false bo‘lishi kerak.');
    if (
      dto.type === 'NUMERICAL' &&
      (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(dto.answer) || !Number.isFinite(Number(dto.answer)))
    )
      throw new BadRequestException('Sonli javobni kiriting.');
    if (dto.type === 'TEXT' && dto.answer.split('|').some((a) => !a.trim()))
      throw new BadRequestException('Matnli javob variantlari bo‘sh bo‘lmasin.');
  }
  createQuestion(dto: QuestionDto) {
    this.validateQuestion({ ...dto, options: dto.options || [] });
    const { options = [], config, grading, feedback, ...data } = dto;
    return this.db.question.create({
      data: {
        ...data,
        ...(config ? { config: config as unknown as Prisma.InputJsonValue } : {}),
        ...(grading ? { grading: grading as unknown as Prisma.InputJsonValue } : {}),
        ...(feedback ? { feedback: feedback as unknown as Prisma.InputJsonValue } : {}),
        options: { create: options.map((o, i) => ({ ...o, position: i })) },
      },
    });
  }
  previewExercise(dto: PreviewExerciseDto) {
    const question = {
      ...dto.question,
      tolerance: dto.question.tolerance ?? 0.0001,
      options: dto.question.options ?? [],
    };
    this.validateQuestion(question);
    const feedback = buildFeedback(question, dto.value, checkAnswer(question, dto.value));
    return { ...feedback, message: feedback.correct ? 'To‘g‘ri!' : feedback.message };
  }
  async updateQuestion(id: string, dto: UpdateQuestionDto) {
    return this.db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Question" WHERE id = ${id}::uuid FOR UPDATE`;
      const question = await tx.question.findUniqueOrThrow({
        where: { id },
        include: { options: true },
      });
      this.validateQuestion({ ...question, ...dto, options: dto.options || question.options });
      const { options, config, grading, feedback, ...data } = dto;
      return tx.question.update({
        where: { id },
        data: {
          ...data,
          version: { increment: 1 },
          ...(config ? { config: config as unknown as Prisma.InputJsonValue } : {}),
          ...(grading ? { grading: grading as unknown as Prisma.InputJsonValue } : {}),
          ...(feedback ? { feedback: feedback as unknown as Prisma.InputJsonValue } : {}),
          ...(options
            ? {
                options: { deleteMany: {}, create: options.map((o, i) => ({ ...o, position: i })) },
              }
            : {}),
        },
      });
    });
  }
  async deleteQuestion(id: string) {
    const question = await this.db.question.findUniqueOrThrow({ where: { id } });
    const attemptsCount = await this.db.attempt.count({ where: { questionIds: { has: id } } });
    if (question.status !== 'ARCHIVED' && attemptsCount > 0)
      throw new BadRequestException('Savol urinishlarda ishlatilgan. Uni arxivlang.');
    return this.db.$transaction(async (tx) => {
      await tx.attemptAnswer.deleteMany({ where: { questionId: id } });
      await tx.$executeRaw`UPDATE "Attempt" SET "questionIds" = array_remove("questionIds", ${id}) WHERE ${id} = ANY("questionIds")`;
      await tx.questionOption.deleteMany({ where: { questionId: id } });
      return tx.question.delete({ where: { id } });
    });
  }
  classes() {
    return this.db.class.findMany({
      include: {
        teacher: { select: { id: true, name: true } },
        students: { include: { student: { select: safeUser } } },
      },
      orderBy: { name: 'asc' },
    });
  }
  async createClass(dto: ClassDto) {
    return this.db.withUserLock(dto.teacherId, async (tx) => {
      if (
        !(await tx.user.findFirst({
          where: {
            id: dto.teacherId,
            active: true,
            OR: [{ role: 'TEACHER' }, { teacherAccess: true }],
          },
        }))
      )
        throw new BadRequestException('Faol o‘qituvchini tanlang.');
      return tx.class.create({ data: dto });
    });
  }
  async updateClass(id: string, dto: UpdateClassDto) {
    const update = async (tx: Prisma.TransactionClient) => {
      if (
        dto.teacherId &&
        !(await tx.user.findFirst({
          where: {
            id: dto.teacherId,
            active: true,
            OR: [{ role: 'TEACHER' }, { teacherAccess: true }],
          },
        }))
      )
        throw new BadRequestException('Faol o‘qituvchini tanlang.');
      if (
        dto.grade &&
        (await tx.classStudent.count({
          where: { classId: id, student: { student: { grade: { not: dto.grade } } } },
        }))
      )
        throw new BadRequestException('Sinfdagi o‘quvchilar bosqichi mos emas.');
      return tx.class.update({ where: { id }, data: dto });
    };
    return dto.teacherId
      ? this.db.withUserLock(dto.teacherId, update)
      : this.db.$transaction(update);
  }
  deleteClass(id: string) {
    return this.db.class.delete({ where: { id } });
  }
  async membership(id: string, dto: MembershipDto) {
    return this.db.$transaction(async (tx) => {
      if (dto.studentIds.length)
        await tx.$queryRaw(
          Prisma.sql`SELECT id FROM "User" WHERE id IN (${Prisma.join(dto.studentIds.map((studentId) => Prisma.sql`${studentId}::uuid`))}) ORDER BY id FOR UPDATE`,
        );
      const group = await tx.class.findUniqueOrThrow({ where: { id } });
      const students = await tx.user.count({
        where: {
          id: { in: dto.studentIds },
          role: 'STUDENT',
          active: true,
          student: { grade: group.grade },
        },
      });
      if (students !== dto.studentIds.length)
        throw new BadRequestException('Sinfga mos faol o‘quvchilarni tanlang.');
      await tx.classStudent.deleteMany({ where: { classId: id } });
      await tx.classStudent.createMany({
        data: dto.studentIds.map((studentId) => ({ classId: id, studentId })),
      });
      return { success: true };
    });
  }
  async gamification() {
    const [rules, levels, badges] = await Promise.all([
      this.db.xpRule.findMany(),
      this.db.level.findMany({ orderBy: { threshold: 'asc' } }),
      this.db.badge.findMany({ orderBy: { createdAt: 'asc' } }),
    ]);
    return { rules, levels, badges };
  }
  rule(key: string, amount: number) {
    return this.db.xpRule.update({ where: { key }, data: { amount } });
  }
  private async validateLevel(number: number, threshold: number, id?: string) {
    if (number === 1 && threshold !== 0)
      throw new BadRequestException('Birinchi daraja 0 XP dan boshlanadi.');
    const others = await this.db.level.findMany({ where: id ? { id: { not: id } } : {} });
    if (
      others.some((l) =>
        l.number < number
          ? l.threshold >= threshold
          : l.number > number && l.threshold <= threshold,
      )
    )
      throw new BadRequestException('Daraja chegaralari o‘sib borishi kerak.');
  }
  async createLevel(dto: LevelDto) {
    await this.validateLevel(dto.number, dto.threshold);
    return this.db.level.create({ data: dto });
  }
  async updateLevel(id: string, dto: UpdateLevelDto) {
    const level = await this.db.level.findUniqueOrThrow({ where: { id } });
    if (
      level.number === 1 &&
      ((dto.number !== undefined && dto.number !== 1) ||
        (dto.threshold !== undefined && dto.threshold !== 0))
    )
      throw new BadRequestException('Birinchi daraja raqami va 0 XP chegarasi saqlanishi kerak.');
    await this.validateLevel(dto.number ?? level.number, dto.threshold ?? level.threshold, id);
    return this.db.level.update({ where: { id }, data: dto });
  }
  async deleteLevel(id: string) {
    if ((await this.db.level.findUniqueOrThrow({ where: { id } })).number === 1)
      throw new BadRequestException('Birinchi daraja zarur.');
    return this.db.level.delete({ where: { id } });
  }
  createBadge(dto: BadgeDto) {
    return this.db.badge.create({ data: dto });
  }
  updateBadge(id: string, dto: UpdateBadgeDto) {
    return this.db.badge.update({ where: { id }, data: dto });
  }
  deleteBadge(id: string) {
    return this.db.badge.delete({ where: { id } });
  }
}
