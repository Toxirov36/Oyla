import 'reflect-metadata';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  checkAnswer,
  localDay,
  mean,
  nextStreak,
  scoreAnswers,
  weekStart,
} from '../src/learning/rules';

test('MC checks allowed option and correct key', () => {
  const q = {
    type: 'MULTIPLE_CHOICE' as const,
    answer: 'b',
    tolerance: 0,
    options: [{ value: 'a' }, { value: 'b' }],
  };
  assert.equal(checkAnswer(q, 'b'), true);
  assert.equal(checkAnswer(q, 'a'), false);
  assert.equal(checkAnswer({ ...q, options: [] }, 'b'), false);
});
test('true/false accepts exact boolean strings only', () => {
  const q = { type: 'TRUE_FALSE' as const, answer: 'true', tolerance: 0 };
  assert.equal(checkAnswer(q, 'true'), true);
  for (const v of ['false', '1', 'yes', 'TRUE']) assert.equal(checkAnswer(q, v), false);
});
test('numerical grading supports decimals and tolerance, rejects empty, infinity and coercion tricks', () => {
  const q = { type: 'NUMERICAL' as const, answer: '12.5', tolerance: 0.001 };
  for (const v of ['12.5', '12,5', ' 12.5001 ']) assert.equal(checkAnswer(q, v), true);
  for (const v of ['', ' ', 'Infinity', '0xC', '1e1', '12.6', '12.5junk'])
    assert.equal(checkAnswer(q, v), false);
});
test('text grading normalizes Unicode, case and whitespace with explicit alternatives', () => {
  const q = { type: 'TEXT' as const, answer: 'algorithm|algoritm', tolerance: 0 };
  assert.equal(checkAnswer(q, '  ALGORITHM '), true);
  assert.equal(checkAnswer(q, 'algoritm'), true);
  assert.equal(checkAnswer(q, 'algorith'), false);
});
test('score and mastery calculations are deterministic', () => {
  assert.equal(scoreAnswers(4, 5), 80);
  assert.equal(scoreAnswers(0, 0), 0);
  assert.equal(mean([80, 100, 60]), 80);
  assert.equal(mean([]), 0);
});
test('same-day completions never increment streak and a missed day resets it', () => {
  const prior = { current: 6, longest: 9, lastDay: '2026-10-05' };
  assert.deepEqual(nextStreak(prior, '2026-10-06'), {
    current: 7,
    longest: 9,
    lastDay: '2026-10-06',
  });
  assert.deepEqual(nextStreak(prior, '2026-10-05'), prior);
  assert.deepEqual(nextStreak(prior, '2026-10-07'), {
    current: 1,
    longest: 9,
    lastDay: '2026-10-07',
  });
  assert.deepEqual(nextStreak(null, '2026-10-06'), {
    current: 1,
    longest: 1,
    lastDay: '2026-10-06',
  });
});
test('Tashkent local date and Monday boundary are correct', () => {
  assert.equal(localDay(new Date('2026-10-05T19:00:00Z')), '2026-10-06');
  assert.equal(localDay(new Date('2026-10-05T18:59:59Z')), '2026-10-05');
  assert.equal(
    weekStart(new Date('2026-10-06T08:00:00Z')).toISOString(),
    '2026-10-04T19:00:00.000Z',
  );
});
