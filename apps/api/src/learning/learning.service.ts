import { BadRequestException, Injectable, NotFoundException, Logger } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../common/prisma.service';
import { Actor } from '../common/security';
import { publicSnapshot, legacyTypes } from './exercises';
import { buildFeedback, type FeedbackQuestion } from './feedback';
import { assertLessonAccess, lessonAccess } from './lesson-access';
import { visibleLesson, visibleQuestion } from '../content/content.service';
import { GamificationService } from '../gamification/gamification.service';
import { checkAnswer, localDay, mean, scoreAnswers } from './rules';
import { AnswerDto, StartAttemptDto } from './learning.dto';

@Injectable()
export class LearningService {
  private readonly logger = new Logger(LearningService.name);
  constructor(
    private readonly db: PrismaService,
    private readonly game: GamificationService,
  ) {}
  private async ensureAccessible(
    tx: Prisma.TransactionClient,
    actor: Actor,
    attempt: { createdAt: Date; dailyKey: string | null; questionIds: string[] },
  ) {
    if (
      Date.now() - attempt.createdAt.getTime() > 86400000 ||
      (attempt.dailyKey && !attempt.dailyKey.endsWith(localDay()))
    )
      throw new BadRequestException('Urinish muddati tugagan. Yangi mashqni boshlang.');
    const visible = await tx.question.count({
      where: { id: { in: attempt.questionIds }, ...visibleQuestion(actor.grade) },
    });
    if (visible !== attempt.questionIds.length)
      throw new BadRequestException('Bu mashq kontenti hozir mavjud emas. Boshqa darsni tanlang.');
  }
  async daily(actor: Actor) {
    const day = localDay();
    const attempt = await this.db.attempt.findUnique({ where: { dailyKey: `${actor.id}:${day}` } });
    return {
      day,
      questionCount: 5,
      reward: (await this.db.xpRule.findUnique({ where: { key: 'DAILY_CHALLENGE' } }))?.amount || 0,
      status: attempt?.status || 'NOT_STARTED',
      attemptId: attempt?.id || null,
      result: attempt?.result || null,
    };
  }
  async start(actor: Actor, dto: StartAttemptDto) {
    const id = await this.db.withUserLock(actor.id, async (tx) => {
      let questionIds: string[];
      if (dto.lessonId) {
        const lesson = await tx.lesson.findFirst({
          where: { id: dto.lessonId, ...visibleLesson(actor.grade) },
          include: {
            questions: {
              where: { status: 'PUBLISHED' },
              orderBy: { position: 'asc' },
              select: { id: true },
            },
          },
        });
        if (!lesson) throw new NotFoundException('Dars topilmadi.');
        await assertLessonAccess(tx, actor, lesson);
        questionIds = lesson.questions.map((q) => q.id);
        await tx.attempt.updateMany({
          where: {
            userId: actor.id,
            status: 'IN_PROGRESS',
            createdAt: { lt: new Date(Date.now() - 86400000) },
          },
          data: { status: 'ABANDONED' },
        });
        const existing = await tx.attempt.findFirst({
          where: { userId: actor.id, lessonId: dto.lessonId, status: 'IN_PROGRESS' },
          orderBy: { createdAt: 'desc' },
        });
        if (existing) return existing.id;
      } else {
        const dailyKey = `${actor.id}:${localDay()}`;
        const existing = await tx.attempt.findUnique({ where: { dailyKey } });
        if (existing) return existing.id;
        const pool = await tx.question.findMany({
          where: visibleQuestion(actor.grade),
          orderBy: { id: 'asc' },
          select: { id: true },
        });
        if (pool.length < 5)
          throw new BadRequestException('Challenge uchun kamida 5 ta chop etilgan savol zarur.');
        // Stable rotation by date; snapshots keep the question set fixed for the attempt.
        const offset = Math.floor(Date.parse(localDay()) / 86400000) % pool.length;
        questionIds = Array.from({ length: 5 }, (_, i) => pool[(offset + i) % pool.length]!.id);
      }
      if (!questionIds.length) throw new BadRequestException('Darsda chop etilgan savollar yo‘q.');
      // Hold definitions while their option rows and grading rules are copied together.
      await tx.$queryRaw`SELECT id FROM "Question" WHERE id::text IN (${Prisma.join(questionIds)}) FOR SHARE`;
      const snapshot = await tx.question.findMany({
        where: { id: { in: questionIds } },
        include: { options: { orderBy: { position: 'asc' } } },
      });
      if (snapshot.length !== questionIds.length)
        throw new BadRequestException('Dars yangilandi. Mashqni qayta boshlang.');
      return (
        await tx.attempt.create({
          data: {
            userId: actor.id,
            lessonId: dto.lessonId,
            questionIds,
            mode: dto.mode ?? 'STANDARD',
            questionsSnapshot: JSON.parse(
              JSON.stringify(questionIds.map((qid) => snapshot.find((q) => q.id === qid))),
            ) as Prisma.InputJsonValue,
            ...(dto.lessonId ? {} : { dailyKey: `${actor.id}:${localDay()}` }),
          },
        })
      ).id;
    });
    return this.get(actor, id);
  }
  async get(actor: Actor, id: string) {
    const attempt = await this.db.attempt.findFirst({
      where: { id, userId: actor.id },
      include: {
        answers: {
          select: {
            questionId: true,
            value: true,
            correct: true,
            feedback: true,
            feedbackSeen: true,
          },
        },
      },
    });
    if (!attempt) throw new NotFoundException('Urinish topilmadi.');
    const questions = await this.db.question.findMany({
      where: { id: { in: attempt.questionIds } },
      include: { options: { orderBy: { position: 'asc' } } },
    });
    const { questionsSnapshot, ...safe } = attempt;
    if (attempt.status === 'IN_PROGRESS') await this.ensureAccessible(this.db, actor, attempt);
    const snapshots = questionsSnapshot as unknown as Record<string, unknown>[] | null;
    const answers = attempt.answers.map((answer) => {
      const definition =
        snapshots?.find((q) => q.id === answer.questionId) ??
        questions.find((q) => q.id === answer.questionId);
      return {
        ...answer,
        feedback:
          answer.feedback ??
          (definition
            ? buildFeedback(definition as unknown as FeedbackQuestion, answer.value, answer.correct)
            : null),
      };
    });
    const resumeQuestionId =
      attempt.questionIds.find((qid) =>
        answers.some((a) => a.questionId === qid && !a.feedbackSeen),
      ) ??
      attempt.questionIds.find((qid) => !answers.some((a) => a.questionId === qid)) ??
      attempt.questionIds.at(-1);
    return {
      ...safe,
      answers,
      resumeQuestionId,
      questions: snapshots
        ? snapshots.map(publicSnapshot)
        : attempt.questionIds.map((qid) => publicSnapshot(questions.find((q) => q.id === qid)!)),
    };
  }
  async answer(actor: Actor, id: string, dto: AnswerDto) {
    return this.db.withUserLock(actor.id, async (tx) => {
      const attempt = await tx.attempt.findFirst({ where: { id, userId: actor.id } });
      if (!attempt) throw new NotFoundException('Urinish topilmadi.');
      if (attempt.status !== 'IN_PROGRESS') throw new BadRequestException('Urinish yakunlangan.');
      await this.ensureAccessible(tx, actor, attempt);
      if (!attempt.questionIds.includes(dto.questionId))
        throw new BadRequestException('Savol bu urinishga tegishli emas.');
      const existing = await tx.attemptAnswer.findUnique({
        where: { attemptId_questionId: { attemptId: id, questionId: dto.questionId } },
      });
      const live = await tx.question.findUniqueOrThrow({
        where: { id: dto.questionId },
        include: { options: true },
      });
      const snapshots = attempt.questionsSnapshot as unknown as (typeof live)[] | null;
      const question = snapshots?.find((q) => q.id === dto.questionId) ?? live;
      const structured = !legacyTypes.includes(question.type);
      if (
        structured
          ? !dto.payload || dto.value !== undefined
          : dto.value === undefined || dto.payload !== undefined
      )
        throw new BadRequestException('Javob formati savolga mos emas.');
      const value = structured ? JSON.stringify(dto.payload) : dto.value!;
      const correct = checkAnswer(question, value);
      const feedback = buildFeedback(question, value, correct, !existing);
      if (!existing)
        await tx.attemptAnswer.create({
          data: {
            attemptId: id,
            questionId: dto.questionId,
            value,
            correct,
            feedback: feedback as unknown as Prisma.InputJsonValue,
            feedbackSeen: false,
            ...(dto.payload ? { payload: dto.payload as unknown as Prisma.InputJsonValue } : {}),
          },
        });
      else
        await tx.attemptAnswer.update({
          where: { attemptId_questionId: { attemptId: id, questionId: dto.questionId } },
          data: { feedback: feedback as unknown as Prisma.InputJsonValue, feedbackSeen: false },
        });
      return feedback;
    });
  }
  async continueFeedback(actor: Actor, id: string, questionId: string) {
    return this.db.withUserLock(actor.id, async (tx) => {
      const attempt = await tx.attempt.findFirst({ where: { id, userId: actor.id } });
      if (!attempt) throw new NotFoundException('Urinish topilmadi.');
      if (attempt.status !== 'IN_PROGRESS') throw new BadRequestException('Urinish yakunlangan.');
      await this.ensureAccessible(tx, actor, attempt);
      const answer = await tx.attemptAnswer.findUnique({
        where: { attemptId_questionId: { attemptId: id, questionId } },
      });
      if (!attempt.questionIds.includes(questionId) || !answer)
        throw new BadRequestException('Avval shu savolga javob bering.');
      await tx.attemptAnswer.update({ where: { id: answer.id }, data: { feedbackSeen: true } });
      return { acknowledged: true };
    });
  }
  async complete(actor: Actor, id: string) {
    let completedNow = false;
    const outcome = await this.db.withUserLock(actor.id, async (tx) => {
      const attempt = await tx.attempt.findFirst({
        where: { id, userId: actor.id },
        include: { answers: { include: { question: true } } },
      });
      if (!attempt) throw new NotFoundException('Urinish topilmadi.');
      if (attempt.status === 'COMPLETED') return attempt.result;
      if (attempt.status !== 'IN_PROGRESS' || attempt.answers.length !== attempt.questionIds.length)
        throw new BadRequestException('Avval barcha savollarga javob bering.');
      await this.ensureAccessible(tx, actor, attempt);
      const score = scoreAnswers(
        attempt.answers.filter((a) => a.correct).length,
        attempt.questionIds.length,
      );
      const rules = await tx.xpRule.findMany();
      const rule = (key: string) => rules.find((r) => r.key === key)?.amount || 0;
      const questionXp = attempt.answers
        .filter((a) => a.correct)
        .reduce(
          (sum, a) =>
            sum +
            ((attempt.questionsSnapshot
              ? (attempt.questionsSnapshot as unknown as { id: string; xp: number | null }[]).find(
                  (q) => q.id === a.questionId,
                )?.xp
              : a.question.xp) ?? rule('CORRECT_ANSWER')),
          0,
        );
      let earnedXp = 0;
      let masteryBefore = 0;
      let masteryAfter = 0;
      if (attempt.lessonId) {
        const lesson = await tx.lesson.findUniqueOrThrow({ where: { id: attempt.lessonId } });
        const progress = await tx.progress.findUnique({
          where: { userId_lessonId: { userId: actor.id, lessonId: attempt.lessonId } },
        });
        const previousTopicProgress = await tx.progress.findMany({
          where: {
            userId: actor.id,
            lesson: { topicId: lesson.topicId, ...visibleLesson(actor.grade) },
          },
        });
        masteryBefore = mean(previousTopicProgress.map((p) => p.bestScore));
        await tx.progress.upsert({
          where: { userId_lessonId: { userId: actor.id, lessonId: attempt.lessonId } },
          create: { userId: actor.id, lessonId: attempt.lessonId, bestScore: score },
          update: { bestScore: Math.max(progress?.bestScore || 0, score) },
        });
        const topicProgress = await tx.progress.findMany({
          where: {
            userId: actor.id,
            lesson: { topicId: lesson.topicId, ...visibleLesson(actor.grade) },
          },
        });
        masteryAfter = mean(topicProgress.map((p) => p.bestScore));
        await tx.mastery.upsert({
          where: { userId_topicId: { userId: actor.id, topicId: lesson.topicId } },
          create: { userId: actor.id, topicId: lesson.topicId, score: masteryAfter },
          update: { score: masteryAfter },
        });
        earnedXp += await this.game.reward(
          tx,
          actor.id,
          `lesson:${attempt.lessonId}`,
          'LESSON',
          rule('LESSON_COMPLETED') + questionXp,
        );
        const assignments = await tx.assignment.findMany({
          where: {
            lessonId: attempt.lessonId,
            createdAt: { lte: new Date() },
            class: { students: { some: { studentId: actor.id } } },
          },
        });
        for (const assignment of assignments)
          await tx.assignmentSubmission.upsert({
            where: { assignmentId_userId: { assignmentId: assignment.id, userId: actor.id } },
            create: {
              assignmentId: assignment.id,
              userId: actor.id,
              attemptId: id,
              score,
              late: new Date() > assignment.deadline,
            },
            update: {},
          });
      } else {
        earnedXp += await this.game.reward(
          tx,
          actor.id,
          `daily:${attempt.dailyKey}`,
          'DAILY_CHALLENGE',
          rule('DAILY_CHALLENGE') + questionXp,
        );
      }
      const { streak, earned } = await this.game.streak(tx, actor.id, localDay(), rule('STREAK_7'));
      earnedXp += earned;
      await tx.attempt.update({
        where: { id },
        data: { status: 'COMPLETED', score, earnedXp, completedAt: new Date() },
      });
      const badges = await this.game.badges(tx, actor.id);
      const totalXp =
        (await tx.xpTransaction.aggregate({ where: { userId: actor.id }, _sum: { amount: true } }))
          ._sum.amount || 0;
      const level = await tx.level.findFirst({
        where: { threshold: { lte: totalXp } },
        orderBy: { threshold: 'desc' },
      });
      const currentLesson = attempt.lessonId
        ? await tx.lesson.findUnique({
            where: { id: attempt.lessonId },
            select: { topic: { select: { courseId: true } } },
          })
        : null;
      const candidates = await tx.lesson.findMany({
        where: { ...visibleLesson(actor.grade), progress: { none: { userId: actor.id } } },
        orderBy: [
          { topic: { course: { subject: { position: 'asc' } } } },
          { topic: { position: 'asc' } },
          { position: 'asc' },
          { id: 'asc' },
        ],
        select: {
          id: true,
          title: true,
          prerequisiteId: true,
          unlockScore: true,
          topic: { select: { courseId: true } },
        },
      });
      const access = await lessonAccess(tx, actor);
      const available = candidates.filter((l) => access(l).state !== 'LOCKED');
      const next =
        available.find((l) => l.topic.courseId === currentLesson?.topic.courseId) ?? available[0];
      const nextLesson = next ? { id: next.id, title: next.title } : null;
      const masteryThreshold = attempt.lessonId
        ? (
            await tx.lesson.findUniqueOrThrow({
              where: { id: attempt.lessonId },
              select: { masteryScore: true },
            })
          ).masteryScore
        : 70;
      const result = {
        attemptId: id,
        score,
        mastered: score >= masteryThreshold,
        masteryThreshold,
        correct: attempt.answers.filter((a) => a.correct).length,
        total: attempt.questionIds.length,
        earnedXp,
        totalXp,
        level: level?.number || 1,
        streak: streak.current,
        masteryBefore,
        masteryAfter,
        badges,
        nextLesson,
      };
      await tx.attempt.update({ where: { id }, data: { result: result as Prisma.InputJsonValue } });
      completedNow = true;
      return result;
    });
    if (completedNow)
      this.logger.log({ event: 'learning_completed', userId: actor.id, attemptId: id });
    return outcome;
  }
}
