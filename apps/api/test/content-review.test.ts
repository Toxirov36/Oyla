import { test } from 'node:test';
import assert from 'node:assert/strict';
import { matchesOriginal } from '../prisma/curriculum/corrections';
import { reviewedCorrections } from '../prisma/curriculum/reviewed-corrections';
import { curriculum } from '../prisma/curriculum';
import { lessonId, seedId, type Grade } from '../prisma/curriculum/types';

test('reviewed corrections match the current catalog and never invalidate an earlier accepted answer', () => {
  const questions = new Map(
    curriculum.flatMap((s) =>
      ([5, 6, 7] as Grade[]).flatMap((g) =>
        s.grades[g].flatMap((l, i) =>
          l.questions.map(
            (q, j) => [seedId(`${lessonId(s.slug, g, i)}:question:${j}`), q] as const,
          ),
        ),
      ),
    ),
  );
  assert.equal(reviewedCorrections.length, 13);
  for (const patch of reviewedCorrections)
    if (patch.kind === 'question') {
      assert.deepEqual(JSON.parse(JSON.stringify(questions.get(patch.id))), patch.after);
      assert.equal(patch.after.type, patch.before.type);
      assert.deepEqual(patch.after.options, patch.before.options);
      assert.ok(
        patch.before.answer
          .split('|')
          .every((value) => patch.after.answer.split('|').includes(value)),
      );
      const now = new Date();
      const row: Parameters<typeof matchesOriginal>[0] = {
        ...patch.before,
        id: patch.id,
        lessonId: 'fixture',
        position: patch.position,
        status: 'PUBLISHED',
        xp: null,
        version: 1,
        config: null,
        grading: null,
        feedback: null,
        hint: patch.before.hint ?? null,
        tolerance: patch.before.tolerance ?? 0.0001,
        difficulty:
          patch.before.difficulty ??
          (patch.position >= 4 ? 'HARD' : patch.position === 0 ? 'EASY' : 'MEDIUM'),
        createdAt: now,
        updatedAt: now,
        options: (patch.before.options ?? []).map((text, position) => ({
          id: `${position}`,
          questionId: patch.id,
          text,
          value: text,
          position,
          createdAt: now,
          updatedAt: now,
        })),
      };
      assert.equal(matchesOriginal(row, patch.before, patch.position), true);
      for (const edit of [
        { text: 'Administrator text' },
        { answer: 'Custom answer' },
        { status: 'DRAFT' as const },
        { xp: 50 },
        { hint: 'Custom hint' },
        { feedback: { rule: 'Administrator-authored rule' } },
        { tolerance: 0.01 },
      ])
        assert.equal(matchesOriginal({ ...row, ...edit }, patch.before, patch.position), false);
      if (row.options.length)
        assert.equal(
          matchesOriginal(
            { ...row, options: row.options.map((o) => ({ ...o, text: 'Custom option' })) },
            patch.before,
            patch.position,
          ),
          false,
        );
    }
});
