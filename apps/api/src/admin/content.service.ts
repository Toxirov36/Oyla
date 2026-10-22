import { validateExercise } from '../learning/exercises';
import { checkAnswer } from '../learning/rules';
import { buildFeedback, validateFeedback } from '../learning/feedback';
import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../common/prisma.service';
import { youtubeVideoId } from './youtube';
import {
  CourseDto,
  LessonDto,
  PreviewExerciseDto,
  QuestionDto,
  SubjectDto,
  TopicDto,
  UpdateCourseDto,
  UpdateLessonDto,
  UpdateQuestionDto,
  UpdateSubjectDto,
  UpdateTopicDto,
} from './admin.dto';

@Injectable()
export class AdminContentService {
  constructor(private readonly db: PrismaService) {}
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
}
