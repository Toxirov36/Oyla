import type { Prisma, PrismaClient } from '../../generated/prisma/client';
import type { SeedQuestion } from './types';
import { reviewedCorrections } from './reviewed-corrections';

export type ContentCorrection =
  | { kind: 'question'; id: string; position: number; before: SeedQuestion; after: SeedQuestion }
  | {
      kind: 'lesson';
      id: string;
      position: number;
      before: { title: string; explanation: string; example: string };
      after: { title: string; explanation: string; example: string };
    };
type StoredQuestion = Prisma.QuestionGetPayload<{ include: { options: true } }>;
export function matchesOriginal(row: StoredQuestion, original: SeedQuestion, position: number) {
  return (
    row.text === original.text &&
    row.answer === original.answer &&
    row.type === original.type &&
    row.explanation === original.explanation &&
    row.position === position &&
    row.status === 'PUBLISHED' &&
    row.xp === null &&
    row.feedback === null &&
    row.hint === (original.hint ?? null) &&
    row.tolerance === (original.tolerance ?? 0.0001) &&
    row.difficulty ===
      (original.difficulty ?? (position >= 4 ? 'HARD' : position === 0 ? 'EASY' : 'MEDIUM')) &&
    JSON.stringify(
      [...row.options]
        .sort((a, b) => a.position - b.position)
        .map((o) => ({ text: o.text, value: o.value })),
    ) === JSON.stringify((original.options ?? []).map((text) => ({ text, value: text })))
  );
}
export async function applyReviewedCorrections(db: PrismaClient) {
  const report = { corrected: 0, current: 0, preserved: 0, active: 0 };
  for (const patch of reviewedCorrections) {
    const state = await db.$transaction(async (tx) => {
      if (patch.kind === 'lesson') {
        const row = await tx.lesson.findUnique({ where: { id: patch.id } });
        if (!row) return 'preserved';
        if (
          row.title === patch.after.title &&
          row.explanation === patch.after.explanation &&
          row.example === patch.after.example
        )
          return 'current';
        const result = await tx.lesson.updateMany({
          where: {
            id: patch.id,
            ...patch.before,
            status: 'PUBLISHED',
            position: 0,
            duration: 10 + patch.position,
          },
          data: patch.after,
        });
        return result.count ? 'corrected' : 'preserved';
      }
      await tx.$queryRaw`SELECT id FROM "Question" WHERE id = ${patch.id}::uuid FOR UPDATE`;
      const row = await tx.question.findUnique({
        where: { id: patch.id },
        include: { options: true },
      });
      if (!row) return 'preserved';
      if (matchesOriginal(row, patch.after, patch.position)) return 'current';
      if (!matchesOriginal(row, patch.before, patch.position)) return 'preserved';
      if (
        await tx.attempt.count({
          where: {
            status: 'IN_PROGRESS',
            createdAt: { gte: new Date(Date.now() - 86400000) },
            questionIds: { has: patch.id },
          },
        })
      )
        return 'active';
      // These reviewed patches only clarify prompts or add an accepted synonym.
      // Keep options, rewards, completed attempts, stored answers and progress untouched.
      await tx.question.update({
        where: { id: patch.id },
        data: {
          text: patch.after.text,
          answer: patch.after.answer,
          explanation: patch.after.explanation,
        },
      });
      return 'corrected';
    });
    report[state]++;
  }
  return report;
}
