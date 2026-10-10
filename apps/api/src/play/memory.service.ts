import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomInt, randomUUID } from 'node:crypto';
import type { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../common/prisma.service';
import type { Actor } from '../common/security';
import { checkedMemoryPairs, deckSignature, fallbackMemoryIds, type MemoryPair, type MemorySubject } from './memory-content';
import { MemoryGenerationService } from './memory-generation.service';
import { config } from '../common/config';

type MemoryCard = { id: string; key: number; text: string };
type Round = {
  id: string; grade: number; subject: string; stage: number; status: string;
  cards: unknown; matchedKeys: number[]; moves: number; completedAt: Date | null;
};
function shuffled<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [result[i], result[j]] = [result[j]!, result[i]!];
  }
  return result;
}
export function memoryRoundView(round: Round, correct?: boolean) {
  const cards = round.cards as MemoryCard[];
  return {
    id: round.id,
    grade: round.grade,
    subject: round.subject,
    stage: round.stage,
    status: round.status,
    cards: cards.map(({ id, text }) => ({ id, text })),
    matchedIds: cards.filter((card) => round.matchedKeys.includes(card.key)).map((card) => card.id),
    pairCount: cards.length / 2,
    moves: round.moves,
    completedAt: round.completedAt,
    ...(correct === undefined ? {} : { correct }),
  };
}

@Injectable()
export class MemoryService {
  constructor(private readonly db: PrismaService, private readonly generation: MemoryGenerationService) {}

  private async fallback(tx: Prisma.TransactionClient, grade: number, subject: MemorySubject, stage: number) {
    const ids = fallbackMemoryIds(grade, subject, stage);
    const pairs = checkedMemoryPairs(grade, subject, stage, ids);
    const signature = deckSignature(grade, subject, stage, ids);
    return tx.memoryDeck.upsert({
      where: { signature },
      create: { grade, subject, stage, signature, pairs, source: 'CURATED' },
      update: {},
    });
  }

  async start(actor: Actor, subject: MemorySubject, requestedStage?: number) {
    const grade = actor.grade;
    if (!grade || grade < 5 || grade > 7) throw new BadRequestException('Sinf aniqlanmadi.');
    const result = await this.db.withUserLock(actor.id, async (tx) => {
      const progress = await tx.memoryProgress.upsert({
        where: { userId_subject: { userId: actor.id, subject } },
        create: { userId: actor.id, subject },
        update: {},
      });
      if (requestedStage && requestedStage > progress.stage)
        throw new BadRequestException('Bu bosqich hali ochilmagan.');
      const active = await tx.memoryRound.findFirst({
        where: { userId: actor.id, subject, status: 'ACTIVE' },
        orderBy: { createdAt: 'desc' },
      });
      if (active) return { round: active, fresh: true };
      const stage = requestedStage ?? Math.min(3, Math.max(1, progress.stage));
      await this.fallback(tx, grade, subject, stage);
      const recent = await tx.memoryRound.findMany({
        where: { userId: actor.id, subject, grade, stage },
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: { deckId: true },
      });
      const decks = await tx.memoryDeck.findMany({
        where: { grade, subject, stage, locale: 'uz', status: 'READY' },
        orderBy: { createdAt: 'desc' },
      });
      const seen = new Set(recent.map((item) => item.deckId));
      const fresh = decks.filter((deck) => !seen.has(deck.id));
      const options = fresh.length ? fresh : decks;
      const deck = options[randomInt(options.length)]!;
      const pairs = deck.pairs as MemoryPair[];
      const cards = shuffled(pairs.flatMap((pair, key) => [
        { id: randomUUID(), key, text: pair.left },
        { id: randomUUID(), key, text: pair.right },
      ]));
      const round = await tx.memoryRound.create({
        data: { userId: actor.id, deckId: deck.id, grade, subject, stage, cards },
      });
      return { round, fresh: fresh.length > 0 };
    });
    void this.generation.queue(grade, subject, result.round.stage, !result.fresh).catch(() => undefined);
    void this.generation.queue(grade, subject, Math.min(3, result.round.stage + 1)).catch(() => undefined);
    return memoryRoundView(result.round);
  }

  async guess(actor: Actor, roundId: string, requestId: string, firstId: string, secondId: string) {
    if (firstId === secondId) throw new BadRequestException('Ikkita turli kartani tanlang.');
    return this.db.withUserLock(actor.id, async (tx) => {
      const round = await tx.memoryRound.findFirst({ where: { id: roundId, userId: actor.id } });
      if (!round) throw new NotFoundException('O‘yin raundi topilmadi.');
      const previous = await tx.memoryGuess.findUnique({ where: { roundId_requestId: { roundId, requestId } } });
      if (previous) return memoryRoundView(round, previous.correct);
      if (round.status !== 'ACTIVE') throw new BadRequestException('Raund yakunlangan.');
      const cards = round.cards as MemoryCard[];
      const first = cards.find((card) => card.id === firstId);
      const second = cards.find((card) => card.id === secondId);
      if (!first || !second || round.matchedKeys.includes(first.key) || round.matchedKeys.includes(second.key))
        throw new BadRequestException('Karta tanlovi noto‘g‘ri.');
      const correct = first.key === second.key;
      const matchedKeys = correct ? [...round.matchedKeys, first.key] : round.matchedKeys;
      const complete = matchedKeys.length === cards.length / 2;
      await tx.memoryGuess.create({ data: { roundId, requestId, firstId, secondId, correct } });
      const updated = await tx.memoryRound.update({
        where: { id: roundId },
        data: { moves: { increment: 1 }, matchedKeys, ...(complete ? { status: 'COMPLETED', completedAt: new Date() } : {}) },
      });
      if (complete) {
        const progress = await tx.memoryProgress.findUniqueOrThrow({
          where: { userId_subject: { userId: actor.id, subject: round.subject } },
        });
        await tx.memoryProgress.update({
          where: { userId_subject: { userId: actor.id, subject: round.subject } },
          data: { completedRounds: { increment: 1 }, stage: Math.max(progress.stage, Math.min(3, round.stage + 1)) },
        });
      }
      return memoryRoundView(updated, correct);
    });
  }

  async decks() {
    return this.db.memoryDeck.findMany({
      where: { status: 'READY' }, orderBy: { createdAt: 'desc' }, take: 100,
      select: { id: true, grade: true, subject: true, stage: true, source: true, status: true, modelId: true, createdAt: true, pairs: true },
    });
  }
  async jobs() {
    return this.db.memoryGenerationJob.findMany({ orderBy: { updatedAt: 'desc' }, take: 100 });
  }
  async archive(id: string) {
    const deck = await this.db.memoryDeck.findUnique({ where: { id } });
    if (!deck) throw new NotFoundException('Karta to‘plami topilmadi.');
    if (deck.source === 'CURATED') throw new BadRequestException('Zaxira to‘plamni olib tashlab bo‘lmaydi.');
    return this.db.memoryDeck.update({ where: { id }, data: { status: 'ARCHIVED' } });
  }

  async report(actor: Actor, roundId: string, reason: string) {
    const round = await this.db.memoryRound.findFirst({ where: { id: roundId, userId: actor.id } });
    if (!round) throw new NotFoundException('O‘yin raundi topilmadi.');
    return this.db.memoryReport.upsert({
      where: { roundId_userId: { roundId, userId: actor.id } },
      create: { roundId, userId: actor.id, reason },
      update: { reason, status: 'OPEN', resolvedAt: null },
      select: { id: true, status: true },
    });
  }
  async reports() {
    return this.db.memoryReport.findMany({
      where: { status: 'OPEN' }, orderBy: { createdAt: 'desc' }, take: 100,
      include: {
        round: { select: {
          deckId: true, grade: true, subject: true, stage: true,
          deck: { select: { source: true, status: true } },
        } },
        user: { select: { id: true, name: true } },
      },
    });
  }
  async resolveReport(id: string) {
    const report = await this.db.memoryReport.findUnique({ where: { id } });
    if (!report) throw new NotFoundException('Xabar topilmadi.');
    return this.db.memoryReport.update({
      where: { id }, data: { status: 'RESOLVED', resolvedAt: new Date() },
    });
  }
  async setting() {
    const setting = await this.db.memorySetting.upsert({ where: { id: 1 }, create: { id: 1 }, update: {} });
    return { ...setting, configured: Boolean(config.GEMINI_API_KEY) };
  }
  async setAiEnabled(enabled: boolean) {
    const setting = await this.db.memorySetting.upsert({
      where: { id: 1 }, create: { id: 1, aiEnabled: enabled }, update: { aiEnabled: enabled },
    });
    return { ...setting, configured: Boolean(config.GEMINI_API_KEY) };
  }
}
