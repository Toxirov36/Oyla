import 'reflect-metadata';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { interactivePilot, pilotLessonId } from '../prisma/interactive-pilot';
import { checkAnswer } from '../src/learning/rules';
import { validateExercise } from '../src/learning/exercises';

test('pilot covers nine distinct grade/subject lessons with 72 validated exercises', () => {
  assert.equal(interactivePilot.length, 9);
  assert.equal(new Set(interactivePilot.map((l) => `${l.slug}:${l.grade}`)).size, 9);
  assert.equal(new Set(interactivePilot.map((l) => pilotLessonId(l.slug, l.grade))).size, 9);
  assert.equal(
    interactivePilot.reduce((n, l) => n + l.questions.length, 0),
    72,
  );
  const types = new Set<string>();
  for (const lesson of interactivePilot) {
    assert.ok(lesson.explanation.length >= 20 && lesson.example.length >= 10);
    assert.equal(lesson.questions.length, 8);
    for (const q of lesson.questions) {
      types.add(q.type);
      validateExercise(q);
      const payload = { ...q.grading };
      delete payload.radius;
      if (payload.text) payload.text = payload.text.split('|')[0]!;
      if (payload.values) payload.values = payload.values.map((v) => v.split('|')[0]!);
      assert.equal(
        checkAnswer(
          { ...q, tolerance: 0.0001, options: q.options?.map((value) => ({ value })) },
          q.grading ? JSON.stringify(payload) : q.answer.split('|')[0]!,
        ),
        true,
        `${lesson.title}: ${q.text}`,
      );
    }
  }
  for (const type of [
    'MULTIPLE_CHOICE',
    'TRUE_FALSE',
    'TEXT',
    'NUMERICAL',
    'FILL_GAP',
    'MATCH_PAIRS',
    'SORT_ORDER',
    'DRAG_DROP',
  ])
    assert.ok(types.has(type));
});
test('pilot mathematical answers match independently calculated fractions, percentages and equations', () => {
  const q = (grade: number, index: number) =>
    interactivePilot.find((l) => l.slug === 'mathematics' && l.grade === grade)!.questions[index]!;
  assert.equal(q(5, 0).answer, '3/4');
  assert.equal(Number(q(5, 1).answer), (20 * 3) / 4);
  assert.equal(Number(q(5, 3).grading!.values![0]), 8 / 2);
  assert.equal(Number(q(6, 0).answer), (80 * 25) / 100);
  assert.equal(Number(q(6, 1).answer), (200 * 15) / 100);
  assert.equal(3 * Number(q(7, 0).answer) + 4, 19);
  assert.equal(2 * (Number(q(7, 1).answer) - 3), 14);
  assert.equal(2 * 4 + Number(q(7, 3).grading!.values![0]), 11);
  assert.deepEqual(q(7, 7).grading!.points, [{ x: (20 + 80) / 2, y: (70 + 30) / 2 }]);
});
