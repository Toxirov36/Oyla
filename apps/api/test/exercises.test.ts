import 'reflect-metadata';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { validateExercise, publicSnapshot } from '../src/learning/exercises';
import { checkAnswer } from '../src/learning/rules';
import { createValidationPipe } from '../src/common/validation';
import { AnswerDto } from '../src/learning/learning.dto';
import type { QuestionType } from '../generated/prisma/client';
import type { ExerciseConfigDto, ExerciseGradingDto } from '../src/learning/exercise.dto';

const examples = JSON.parse(
  readFileSync(resolve(__dirname, '../../web/src/lib/exercise-examples.json'), 'utf8'),
) as Record<
  QuestionType,
  {
    text: string;
    answer?: string;
    options?: string[];
    config?: ExerciseConfigDto;
    grading?: ExerciseGradingDto;
  }
>;
test('all 18 exercise types validate and grade a correct answer without trusting client scores', () => {
  assert.equal(Object.keys(examples).length, 18);
  for (const [type, example] of Object.entries(examples)) {
    const question = {
      ...example,
      type: type as QuestionType,
      answer: example.answer ?? 'structured',
      tolerance: 0.0001,
      options: example.options?.map((value) => ({ value })),
    };
    validateExercise(question);
    const payload = { ...example.grading };
    delete payload.radius;
    if (payload.text) payload.text = payload.text.split('|')[0]!;
    if (payload.values) payload.values = payload.values.map((v) => v.split('|')[0]!);
    assert.equal(
      checkAnswer(question, example.answer?.split('|')[0] ?? JSON.stringify(payload)),
      true,
      type,
    );
    if (example.grading)
      assert.throws(() => checkAnswer(question, JSON.stringify({ ...payload, score: 100 })), type);
  }
});
test('pair grading rejects duplicates, omitted items and swapped associations', () => {
  const q = {
    ...examples.MATCH_PAIRS,
    type: 'MATCH_PAIRS' as const,
    answer: 'structured',
    tolerance: 0,
    options: undefined,
  };
  const pairs = q.grading!.pairs!;
  for (const value of [
    { pairs: [pairs[0], pairs[0], pairs[0]] },
    { pairs: pairs.slice(1) },
    { pairs: pairs.map((p, i) => ({ ...p, right: pairs[(i + 1) % pairs.length]!.right })) },
  ])
    assert.equal(checkAnswer(q, JSON.stringify(value)), false);
  assert.throws(() =>
    validateExercise({ ...q, grading: { pairs: [pairs[0], pairs[0], pairs[0]] } }),
  );
});
test('ordering is exact; fill-gaps normalize explicit accepted alternatives', () => {
  const q = {
    ...examples.SORT_ORDER,
    type: 'SORT_ORDER' as const,
    answer: 'structured',
    tolerance: 0,
    options: undefined,
  };
  assert.equal(
    checkAnswer(q, JSON.stringify({ values: [...q.grading!.values!].reverse() })),
    false,
  );
  const gap = {
    ...examples.FILL_GAP,
    type: 'FILL_GAP' as const,
    answer: 'structured',
    tolerance: 0,
    options: undefined,
  };
  assert.equal(checkAnswer(gap, JSON.stringify({ values: [' GO '] })), true);
  assert.equal(checkAnswer(gap, JSON.stringify({ values: ['goes'] })), false);
});
test('code is case sensitive and Python indentation is preserved', () => {
  const complete = {
    ...examples.CODE_COMPLETION,
    type: 'CODE_COMPLETION' as const,
    answer: 'structured',
    tolerance: 0,
    options: undefined,
  };
  assert.equal(checkAnswer(complete, JSON.stringify({ text: 'NAME' })), false);
  const debug = {
    ...examples.DEBUG_CODE,
    type: 'DEBUG_CODE' as const,
    answer: 'structured',
    tolerance: 0,
    options: undefined,
  };
  assert.equal(
    checkAnswer(debug, JSON.stringify({ text: 'if age >= 18:\nprint("Adult")' })),
    false,
  );
});
test('geometry grades endpoints in either direction, rejects out of bounds and arbitrary clicks', () => {
  const q = {
    ...examples.DRAW,
    type: 'DRAW' as const,
    answer: 'structured',
    tolerance: 0,
    options: undefined,
  };
  assert.equal(checkAnswer(q, JSON.stringify({ points: [...q.grading!.points!].reverse() })), true);
  assert.equal(
    checkAnswer(
      q,
      JSON.stringify({
        points: [
          { x: 0, y: 0 },
          { x: 100, y: 100 },
        ],
      }),
    ),
    false,
  );
  assert.throws(() =>
    checkAnswer(
      q,
      JSON.stringify({
        points: [
          { x: -1, y: 70 },
          { x: 80, y: 30 },
        ],
      }),
    ),
  );
});
test('nested class-validator DTO rejects undeclared scoring fields and oversized answers', async () => {
  const pipe = createValidationPipe();
  const questionId = 'a3123412-3312-4312-a312-341234123412';
  await pipe.transform(
    { questionId, payload: { pairs: [{ left: 'a', right: 'b' }] } },
    { type: 'body', metatype: AnswerDto },
  );
  for (const payload of [
    { points: [{ x: 20, y: 20, correct: true }] },
    { values: Array(13).fill('x') },
    { text: 'x', xp: 1000 },
  ])
    await assert.rejects(
      pipe.transform({ questionId, payload }, { type: 'body', metatype: AnswerDto }),
    );
});
test('public snapshots never disclose answer keys or private geometry targets', () => {
  const snapshot = {
    id: 'q',
    type: 'DRAW',
    config: examples.DRAW.config,
    grading: examples.DRAW.grading,
    answer: 'secret',
    explanation: 'hidden',
    version: 2,
  };
  const publicQuestion = publicSnapshot(snapshot);
  assert.equal(publicQuestion.version, 2);
  for (const key of ['answer', 'grading', 'explanation'])
    assert.equal(Object.hasOwn(publicQuestion, key), false);
});
test('unsafe media and unknown grading fields cannot be published', () => {
  assert.throws(() =>
    validateExercise({
      ...examples.INTERACTIVE_IMAGE,
      type: 'INTERACTIVE_IMAGE',
      config: { imageUrl: 'javascript:alert(1)', imageAlt: 'Bad' },
    }),
  );
  assert.throws(() =>
    validateExercise({
      ...examples.FILL_GAP,
      type: 'FILL_GAP',
      grading: { values: ['go'], score: 100 },
    }),
  );
});
