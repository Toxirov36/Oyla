import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import { PrismaService } from '../common/prisma.service';
import { RedisService } from '../common/redis.service';
import { config } from '../common/config';
import {
  checkedGeneratedMemoryPairs,
  generatedDeckOverlap,
  generatedDeckSignature,
  memoryGoal,
  pairCount,
  type MemoryPair,
  type MemorySubject,
} from './memory-content';

const poolKey = (grade: number, subject: MemorySubject, stage: number) => `${grade}:${subject}:${stage}:uz`;
const POOL_MIN = 3;
const POOL_MAX = 12;

@Injectable()
export class MemoryGenerationService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MemoryGenerationService.name);
  private readonly ai = config.GEMINI_API_KEY ? new GoogleGenAI({ apiKey: config.GEMINI_API_KEY }) : null;
  private timer?: ReturnType<typeof setInterval>;
  private working = false;
  constructor(private readonly db: PrismaService, private readonly redis: RedisService) {}

  onModuleInit() {
    if (!this.ai || config.MEMORY_AI_DAILY_LIMIT === 0) return;
    this.timer = setInterval(() => void this.tick(), 10000);
    this.timer.unref();
    void this.tick();
  }
  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async queue(grade: number, subject: MemorySubject, stage: number, needFresh = false) {
    if (!this.ai || config.MEMORY_AI_DAILY_LIMIT === 0) return;
    if (!(await this.enabled())) return;
    const count = await this.db.memoryDeck.count({
      where: { grade, subject, stage, locale: 'uz', status: 'READY' },
    });
    if (!needFresh && count >= POOL_MIN) return;
    const key = poolKey(grade, subject, stage);
    const old = await this.db.memoryGenerationJob.findUnique({ where: { key } });
    if (!old) {
      try {
        await this.db.memoryGenerationJob.create({ data: { key, grade, subject, stage } });
      } catch (error) {
        if ((error as { code?: string }).code !== 'P2002') throw error;
      }
    } else if (old.status === 'DONE' || (old.status === 'FAILED' && old.nextRunAt <= new Date())) {
      await this.db.memoryGenerationJob.updateMany({
        where: { key, status: old.status },
        data: { status: 'QUEUED', attempts: 0, lastError: null, nextRunAt: new Date() },
      });
    }
    void this.tick();
  }

  private async tick() {
    if (!this.ai || this.working) return;
    this.working = true;
    try {
      if (!(await this.enabled())) return;
      const job = await this.db.$transaction(async (tx) => {
        const rows = await tx.$queryRaw<{ key: string }[]>`
          SELECT "key" FROM "MemoryGenerationJob"
          WHERE ("status" = 'QUEUED' AND "nextRunAt" <= NOW())
             OR ("status" = 'RUNNING' AND "updatedAt" < NOW() - INTERVAL '2 minutes')
          ORDER BY "updatedAt" ASC LIMIT 1 FOR UPDATE SKIP LOCKED`;
        if (!rows[0]) return null;
        return tx.memoryGenerationJob.update({
          where: { key: rows[0].key },
          data: { status: 'RUNNING', attempts: { increment: 1 }, startedAt: new Date() },
        });
      });
      if (!job) return;
      try {
        const subject = job.subject as MemorySubject;
        const goal = memoryGoal(job.grade, subject, job.stage);
        const existing = await this.db.memoryDeck.findMany({
          where: { grade: job.grade, subject, stage: job.stage },
          select: { pairs: true },
          orderBy: { createdAt: 'desc' },
          take: 12,
        });
        const previous = existing.map((deck) => deck.pairs as MemoryPair[]);
        const avoid = [...new Set(previous.flatMap((deck) => deck.map((pair) => pair.left)))].slice(0, 72);
        const thinkingConfig = config.GEMINI_MODEL.startsWith('gemini-3') ? {
          thinkingLevel: /^gemini-3\.(5|6)/.test(config.GEMINI_MODEL)
            ? ThinkingLevel.MINIMAL : ThinkingLevel.LOW,
        } : undefined;
        await this.reserveCall();
        const answer = await this.ai.models.generateContent({
          model: config.GEMINI_MODEL,
          contents: `Create ${pairCount(job.stage)} NEW, factually correct matching-card pairs for an Uzbek-speaking grade ${job.grade} student. Subject: ${subject}. Difficulty stage ${job.stage} of 3. Learning goal: ${goal}. Each left card must have exactly one right card that matches it. Generate original examples, not a reordering of existing cards. Use Uzbek on the right for English translations and Uzbek explanations where appropriate. Keep text short and age appropriate. Do not reuse these recent left cards: ${JSON.stringify(avoid)}. Return only pairs with left and right text.`,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: { pairs: { type: Type.ARRAY, items: {
                type: Type.OBJECT,
                properties: { left: { type: Type.STRING }, right: { type: Type.STRING } },
                required: ['left', 'right'],
              } } },
              required: ['pairs'],
            },
            ...(thinkingConfig ? { thinkingConfig } : {}),
            maxOutputTokens: 1536,
            httpOptions: { timeout: 15000 },
          },
        });
        const parsed = JSON.parse(answer.text || '{}') as { pairs?: unknown };
        const pairs = checkedGeneratedMemoryPairs(job.stage, parsed.pairs);
        if (generatedDeckOverlap(pairs, previous) > 1)
          throw new Error('Generated deck repeats too many recent cards');
        await this.reserveCall();
        const review = await this.ai.models.generateContent({
          model: config.GEMINI_MODEL,
          contents: `Independently review this matching-card deck for an Uzbek-speaking grade ${job.grade} student. Subject: ${subject}; stage ${job.stage} of 3; learning goal: ${goal}. Approve only if every pair is factually correct, each card has exactly one unambiguous partner within the deck, translations are accurate, difficulty fits the stage, and all text is appropriate for children. Reject the entire deck if uncertain. Deck: ${JSON.stringify(pairs.map(({ left, right }) => ({ left, right })))}.`,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: { approved: { type: Type.BOOLEAN } },
              required: ['approved'],
            },
            ...(thinkingConfig ? { thinkingConfig } : {}),
            maxOutputTokens: 512,
            httpOptions: { timeout: 15000 },
          },
        });
        if ((JSON.parse(review.text || '{}') as { approved?: unknown }).approved !== true)
          throw new Error('Generated deck failed educational review');
        const signature = generatedDeckSignature(job.grade, subject, job.stage, pairs);
        await this.db.$transaction(async (tx) => {
          await tx.memoryDeck.create({ data: {
            grade: job.grade, subject, stage: job.stage, signature,
            pairs, source: 'GEMINI', modelId: config.GEMINI_MODEL, promptVersion: 2,
          } });
          const surplus = await tx.memoryDeck.findMany({
            where: { grade: job.grade, subject, stage: job.stage, status: 'READY', source: 'GEMINI' },
            orderBy: { createdAt: 'desc' }, skip: POOL_MAX - 1, select: { id: true },
          });
          if (surplus.length) await tx.memoryDeck.updateMany({
            where: { id: { in: surplus.map((deck) => deck.id) } }, data: { status: 'ARCHIVED' },
          });
        });
        await this.db.memoryGenerationJob.update({
          where: { key: job.key }, data: { status: 'DONE', lastError: null },
        });
      } catch (error) {
        const message = error instanceof Error ? error.message.slice(0, 240) : 'Generation failed';
        this.logger.warn(`Memory generation ${job.key}: ${message}`);
        const retry = job.attempts < 3 && !message.includes('Daily Gemini request limit');
        await this.db.memoryGenerationJob.update({
          where: { key: job.key },
          data: {
            status: retry ? 'QUEUED' : 'FAILED',
            lastError: message,
            nextRunAt: new Date(Date.now() + (retry ? 10000 * 2 ** job.attempts : 86400000)),
          },
        });
      }
    } catch (error) {
      this.logger.error(error instanceof Error ? error.message : 'Memory generation worker failed');
    } finally {
      this.working = false;
    }
  }
  private async enabled() {
    const setting = await this.db.memorySetting.findUnique({ where: { id: 1 } });
    return setting?.aiEnabled ?? true;
  }
  private async reserveCall() {
    const used = await this.redis.incrementWindow('memory-ai:requests:24h', 86400);
    if (used > config.MEMORY_AI_DAILY_LIMIT) throw new Error('Daily Gemini request limit reached');
  }
}
