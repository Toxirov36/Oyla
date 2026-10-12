import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomInt } from 'node:crypto';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../common/prisma.service';
import { Actor } from '../common/security';
import { visibleQuestion } from '../content/content.service';
import { publicSnapshot } from '../learning/exercises';
import { checkAnswer } from '../learning/rules';
import { buildFeedback } from '../learning/feedback';
import { avatarSelect } from '../profile/avatars';
import { mediaAvatar, photoSelect } from '../profile/public-media';
import { BrainActionDto, BrainAnswerDto, CreateBrainDto } from './brain.dto';

export const BRAIN_ROUND_MS = 20000;
export const BRAIN_REVEAL_MS = 3000;
export const BRAIN_QUESTIONS = 5;
const playerSelect = {
  id: true,
  name: true,
  active: true,
  role: true,
  student: { select: { grade: true } },
  avatar: { select: avatarSelect },
  photo: { select: photoSelect },
} as const;
const include = {
  host: { select: playerSelect },
  guest: { select: playerSelect },
  answers: true,
} as const;
type Match = Prisma.BrainMatchGetPayload<{ include: typeof include }>;
type Question = Prisma.QuestionGetPayload<{ include: { options: true } }>;
export function brainScores(
  answers: { userId: string; correct: boolean; roundIndex: number }[],
  throughRound: number,
) {
  const scores = new Map<string, number>();
  for (const answer of answers)
    if (answer.roundIndex <= throughRound && answer.correct)
      scores.set(answer.userId, (scores.get(answer.userId) ?? 0) + 10);
  return scores;
}
@Injectable()
export class BrainService {
  constructor(private readonly db: PrismaService) {}
  private async usersLock(tx: Prisma.TransactionClient, ids: string[]) {
    await tx.$queryRaw(
      Prisma.sql`SELECT id FROM "User" WHERE id IN (${Prisma.join([...ids].sort().map((id) => Prisma.sql`${id}::uuid`))}) ORDER BY id FOR UPDATE`,
    );
  }
  private async update(
    tx: Prisma.TransactionClient,
    match: Match,
    data: Prisma.BrainMatchUpdateInput,
  ) {
    return { ...match, ...(await tx.brainMatch.update({ where: { id: match.id }, data })) };
  }
  private async advance(tx: Prisma.TransactionClient, initial: Match, now: number): Promise<Match> {
    const match = { ...initial };
    let changed = false;

    if (match.status === 'INVITED' && match.expiresAt.getTime() <= now) {
      match.status = 'EXPIRED';
      changed = true;
    } else if (
      match.status === 'ACTIVE' &&
      [match.host, match.guest].some((user) => !user.active || user.role !== 'STUDENT')
    ) {
      match.status = 'CANCELLED';
      changed = true;
    }

    while (match.status === 'ACTIVE') {
      const deadline = match.roundStartedAt!.getTime() + BRAIN_ROUND_MS;
      const both =
        match.answers.filter((answer) => answer.roundIndex === match.roundIndex).length === 2;

      if (!match.revealedAt) {
        if (!both && now < deadline) break;
        match.revealedAt = new Date(both ? Math.min(now, deadline) : deadline);
        changed = true;
      }

      const nextStart = match.revealedAt!.getTime() + BRAIN_REVEAL_MS;
      if (now < nextStart) break;

      if (match.roundIndex + 1 >= (match.questionsSnapshot as unknown as Question[]).length) {
        const scores = brainScores(match.answers, match.roundIndex);
        const host = scores.get(match.hostId) ?? 0,
          guest = scores.get(match.guestId) ?? 0;
        match.status = 'FINISHED';
        match.winnerId = host === guest ? null : host > guest ? match.hostId : match.guestId;
        changed = true;
      } else {
        match.roundIndex += 1;
        match.roundStartedAt = new Date(nextStart);
        match.revealedAt = null;
        changed = true;
      }
    }

    if (changed) {
      await tx.brainMatch.update({
        where: { id: match.id },
        data: {
          status: match.status,
          winnerId: match.winnerId,
          revealedAt: match.revealedAt,
          roundIndex: match.roundIndex,
          roundStartedAt: match.roundStartedAt,
        },
      });
    }

    return match;
  }
  private async locked<T>(
    actor: Actor,
    id: string,
    work: (tx: Prisma.TransactionClient, match: Match) => Promise<T>,
  ) {
    const ref = await this.db.brainMatch.findFirst({
      where: { id, OR: [{ hostId: actor.id }, { guestId: actor.id }] },
      select: { hostId: true, guestId: true },
    });
    if (!ref) throw new NotFoundException('Bellashuv topilmadi.');
    return this.db.$transaction(
      async (tx) => {
        await this.usersLock(tx, [ref.hostId, ref.guestId]);
        await tx.$queryRaw`SELECT id FROM "BrainMatch" WHERE id = ${id}::uuid FOR UPDATE`;
        const match = await tx.brainMatch.findUniqueOrThrow({ where: { id }, include });
        return work(tx, await this.advance(tx, match, Date.now()));
      },
      { maxWait: 10000, timeout: 15000 },
    );
  }
  private view(actor: Actor, match: Match, now = Date.now()) {
    const questions = match.questionsSnapshot as unknown as Question[];
    const current = questions[match.roundIndex]!;
    const own = match.answers.find(
      (answer) => answer.userId === actor.id && answer.roundIndex === match.roundIndex,
    );
    const revealed = !!match.revealedAt || match.status === 'FINISHED';
    const scores = brainScores(match.answers, revealed ? match.roundIndex : match.roundIndex - 1);
    const countdown = match.status === 'ACTIVE' && now < match.roundStartedAt!.getTime();
    const feedback = revealed
      ? {
          ...buildFeedback(current, own?.value ?? '', own?.correct ?? false),
          submittedAnswer: own
            ? buildFeedback(current, own.value, own.correct).submittedAnswer
            : 'Javob berilmadi.',
        }
      : null;
    return {
      id: match.id,
      status: match.status,
      hostId: match.hostId,
      guestId: match.guestId,
      grade: match.grade,
      roundIndex: match.roundIndex,
      total: questions.length,
      expiresAt: match.expiresAt,
      winnerId: match.winnerId,
      phase:
        match.status !== 'ACTIVE'
          ? 'WAITING'
          : countdown
            ? 'COUNTDOWN'
            : revealed
              ? 'REVEAL'
              : 'ANSWERING',
      question:
        match.status === 'ACTIVE' && !countdown
          ? Object.fromEntries(
              Object.entries(publicSnapshot(current)).filter(([key]) => key !== 'hint'),
            )
          : null,
      ownValue: own?.value ?? null,
      feedback,
      roundEndsAt: match.roundStartedAt
        ? new Date(match.roundStartedAt.getTime() + BRAIN_ROUND_MS)
        : null,
      transitionAt: countdown
        ? match.roundStartedAt
        : match.revealedAt
          ? new Date(match.revealedAt.getTime() + BRAIN_REVEAL_MS)
          : null,
      serverNow: new Date(now),
      players: [match.host, match.guest].map((user) => ({
        id: user.id,
        name: user.name,
        avatar: mediaAvatar(user),
        score: scores.get(user.id) ?? 0,
        answered: match.answers.some(
          (answer) => answer.userId === user.id && answer.roundIndex === match.roundIndex,
        ),
      })),
    };
  }
  async list(actor: Actor) {
    const rows = await this.db.brainMatch.findMany({
      where: { OR: [{ hostId: actor.id }, { guestId: actor.id }] },
      include,
      orderBy: { createdAt: 'desc' },
      take: 30,
    });
    return Promise.all(
      rows.map(async (match) => {
        if (match.status === 'ACTIVE' && match.expiresAt.getTime() <= Date.now())
          return this.get(actor, match.id);
        return {
          ...this.view(actor, match),
          status:
            match.status === 'INVITED' && match.expiresAt.getTime() <= Date.now()
              ? 'EXPIRED'
              : match.status,
        };
      }),
    );
  }
  async create(actor: Actor, dto: CreateBrainDto) {
    if (actor.id === dto.opponentId)
      throw new BadRequestException('Bellashish uchun do‘stingizni tanlang.');
    const id = await this.db.$transaction(
      async (tx) => {
        const ids = [actor.id, dto.opponentId].sort();
        await this.usersLock(tx, ids);
        const users = await tx.user.findMany({
          where: { id: { in: ids }, active: true, role: 'STUDENT' },
          select: playerSelect,
        });
        if (users.length !== 2 || users.some((user) => !user.student))
          throw new BadRequestException('Bu foydalanuvchi bellashuvda qatnasha olmaydi.');
        if (
          !(await tx.friendship.findFirst({
            where: { userLowId: ids[0], userHighId: ids[1], status: 'ACCEPTED' },
          }))
        )
          throw new BadRequestException('Avval do‘stlik so‘rovi qabul qilinishi kerak.');
        const duplicate = await tx.brainMatch.findFirst({
          where: {
            hostId: { in: ids },
            guestId: { in: ids },
            status: 'INVITED',
            expiresAt: { gt: new Date() },
          },
        });
        if (duplicate) return duplicate.id;
        if (
          await tx.brainMatch.count({
            where: {
              OR: [{ hostId: { in: ids } }, { guestId: { in: ids } }],
              status: 'ACTIVE',
              expiresAt: { gt: new Date() },
            },
          })
        )
          throw new BadRequestException('Siz yoki do‘stingiz boshqa bellashuvda qatnashyapti.');
        if (
          (await tx.brainMatch.count({
            where: { hostId: actor.id, status: 'INVITED', expiresAt: { gt: new Date() } },
          })) >= 3
        )
          throw new BadRequestException('Avval yuborilgan takliflarni yakunlang.');
        if (
          (await tx.brainMatch.count({
            where: { guestId: dto.opponentId, status: 'INVITED', expiresAt: { gt: new Date() } },
          })) >= 10
        )
          throw new BadRequestException(
            'Do‘stingizning takliflar ro‘yxati to‘lgan. Keyinroq urinib ko‘ring.',
          );
        const grade = Math.min(...users.map((user) => user.student!.grade));
        const pool = await tx.question.findMany({
          where: {
            AND: [
              visibleQuestion(grade),
              { type: { in: ['MULTIPLE_CHOICE', 'TRUE_FALSE'] } },
              ...(dto.subjectId
                ? [{ lesson: { topic: { course: { subjectId: dto.subjectId } } } }]
                : []),
            ],
          },
          include: { options: { orderBy: { position: 'asc' } } },
          orderBy: { id: 'asc' },
          take: 300,
        });
        if (pool.length < BRAIN_QUESTIONS)
          throw new BadRequestException(
            'Bu fan uchun kamida 5 ta variantli savol kerak. Boshqa fan yoki aralash savollarni tanlang.',
          );
        for (let i = pool.length - 1; i > 0; i--) {
          const j = randomInt(i + 1);
          [pool[i], pool[j]] = [pool[j]!, pool[i]!];
        }
        const match = await tx.brainMatch.create({
          data: {
            hostId: actor.id,
            guestId: dto.opponentId,
            grade,
            subjectId: dto.subjectId,
            questionsSnapshot: JSON.parse(
              JSON.stringify(pool.slice(0, BRAIN_QUESTIONS)),
            ) as Prisma.InputJsonValue,
            expiresAt: new Date(Date.now() + 300000),
          },
        });
        await tx.notification.create({
          data: {
            userId: dto.opponentId,
            type: 'FRIEND',
            title: 'Brain Ring taklifi',
            body: `${actor.name} sizni bilim bellashuviga taklif qildi.`,
            link: `/brain-ring/${match.id}`,
          },
        });
        return match.id;
      },
      { maxWait: 10000, timeout: 15000 },
    );
    return this.get(actor, id);
  }
  get(actor: Actor, id: string) {
    return this.locked(actor, id, async (_tx, match) => this.view(actor, match));
  }
  action(actor: Actor, id: string, dto: BrainActionDto) {
    return this.locked(actor, id, async (tx, match) => {
      if (dto.action === 'accept' && match.status === 'ACTIVE' && actor.id === match.guestId)
        return this.view(actor, match);
      if (match.status !== 'INVITED')
        throw new BadRequestException('Bu taklif allaqachon yakunlangan.');
      if (
        (dto.action === 'cancel' && actor.id !== match.hostId) ||
        (dto.action !== 'cancel' && actor.id !== match.guestId)
      )
        throw new BadRequestException('Bu amal sizga tegishli emas.');
      if (dto.action === 'accept') {
        if ([match.host, match.guest].some((user) => !user.active || user.role !== 'STUDENT'))
          throw new BadRequestException('Foydalanuvchi endi qatnasha olmaydi.');
        if (
          !(await tx.friendship.findFirst({
            where: {
              userLowId: [match.hostId, match.guestId].sort()[0],
              userHighId: [match.hostId, match.guestId].sort()[1],
              status: 'ACCEPTED',
            },
          }))
        )
          throw new BadRequestException('Do‘stlik endi mavjud emas.');
        if (
          await tx.brainMatch.count({
            where: {
              id: { not: id },
              OR: [
                { hostId: { in: [match.hostId, match.guestId] } },
                { guestId: { in: [match.hostId, match.guestId] } },
              ],
              status: 'ACTIVE',
              expiresAt: { gt: new Date() },
            },
          })
        )
          throw new BadRequestException('Boshqa bellashuv hali yakunlanmagan.');
        const start = new Date(Date.now() + 3000);
        match = await this.update(tx, match, {
          status: 'ACTIVE',
          startedAt: start,
          roundStartedAt: start,
          expiresAt: new Date(
            start.getTime() + BRAIN_QUESTIONS * (BRAIN_ROUND_MS + BRAIN_REVEAL_MS),
          ),
        });
        await tx.notification.create({
          data: {
            userId: match.hostId,
            type: 'FRIEND',
            title: 'Brain Ring boshlandi',
            body: `${match.guest.name} taklifingizni qabul qildi.`,
            link: `/brain-ring/${id}`,
          },
        });
      } else
        match = await this.update(tx, match, {
          status: dto.action === 'decline' ? 'DECLINED' : 'CANCELLED',
        });
      return this.view(actor, match);
    });
  }
  answer(actor: Actor, id: string, dto: BrainAnswerDto) {
    return this.locked(actor, id, async (tx, match) => {
      const duplicate = match.answers.find(
        (answer) => answer.userId === actor.id && answer.roundIndex === dto.roundIndex,
      );
      if (duplicate) return { accepted: true };
      if (
        match.status !== 'ACTIVE' ||
        dto.roundIndex !== match.roundIndex ||
        match.revealedAt ||
        Date.now() < match.roundStartedAt!.getTime()
      )
        throw new BadRequestException('Bu savol hozir javob qabul qilmaydi.');
      const q = (match.questionsSnapshot as unknown as Question[])[match.roundIndex]!;
      if (
        q.type === 'MULTIPLE_CHOICE'
          ? !q.options.some((option) => option.value === dto.value)
          : !['true', 'false'].includes(dto.value)
      )
        throw new BadRequestException('Mavjud variantni tanlang.');
      const correct = checkAnswer(q, dto.value);
      const newAnswer = await tx.brainAnswer.create({
        data: {
          matchId: id,
          userId: actor.id,
          roundIndex: match.roundIndex,
          value: dto.value,
          correct,
        },
      });

      match.answers.push(newAnswer);
      await this.advance(tx, match, Date.now());

      return { accepted: true };
    });
  }
}
