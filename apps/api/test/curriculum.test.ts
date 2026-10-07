import { test } from 'node:test';
import assert from 'node:assert/strict';
import { curriculum } from '../prisma/curriculum';
import { mathematics } from '../prisma/curriculum/mathematics';
import { informatics } from '../prisma/curriculum/informatics';
import { lessonId, type Grade } from '../prisma/curriculum/types';
import { checkAnswer } from '../src/learning/rules';

test('all nine grade/subject sequences contain complete, distinct learning activities', () => {
  const ids = new Set<string>();
  assert.equal(curriculum.length, 3);
  for (const subject of curriculum) {
    const fingerprints = new Set<string>();
    for (const grade of [5, 6, 7] as Grade[]) {
      const lessons = subject.grades[grade];
      assert.equal(lessons.length, 6);
      fingerprints.add(lessons.map((lesson) => lesson.title).join('|'));
      for (const [position, lesson] of lessons.entries()) {
        const id = lessonId(subject.slug, grade, position);
        assert.ok(!ids.has(id));
        ids.add(id);
        assert.ok(lesson.explanation.startsWith('Dars maqsadi:'));
        assert.ok(lesson.explanation.length >= 300);
        assert.ok(lesson.example.length >= 50);
        assert.equal(lesson.questions.length, 6);
        assert.equal(new Set(lesson.questions.map((q) => q.text)).size, 6);
        for (const question of lesson.questions) {
          assert.ok(question.answer.trim());
          assert.ok(question.explanation.length >= 10);
          if (question.type === 'MULTIPLE_CHOICE') {
            assert.ok(question.options && question.options.length >= 2);
            assert.equal(new Set(question.options).size, question.options.length);
            assert.ok(question.options.includes(question.answer));
          } else assert.equal(question.options, undefined);
          const alternatives =
            question.type === 'TEXT' ? question.answer.split('|') : [question.answer];
          for (const answer of alternatives) {
            assert.ok(answer.trim());
            assert.ok(
              checkAnswer(
                {
                  ...question,
                  tolerance: question.tolerance ?? 0.0001,
                  options: question.options?.map((value) => ({ value })),
                },
                answer,
              ),
            );
          }
          if (question.type === 'NUMERICAL') assert.ok(Number.isFinite(Number(question.answer)));
          if (question.type === 'TRUE_FALSE')
            assert.ok(['true', 'false'].includes(question.answer));
          assert.ok((question.tolerance ?? 0.0001) >= 0);
        }
      }
    }
    assert.equal(fingerprints.size, 3, `${subject.slug} must have distinct grade sequences`);
  }
  assert.equal(ids.size, 54);
});
test('every numerical answer in the catalog agrees with independently worked calculations', () => {
  const cases: Record<string, number> = {};
  const add = (subject: string, grade: Grade, lesson: number, entries: [number, number][]) => {
    for (const [question, value] of entries)
      cases[`${subject}:${grade}:${lesson}:${question}`] = value;
  };
  const math = (g: Grade, l: number, e: [number, number][]) => add('mathematics', g, l, e);
  const info = (g: Grade, l: number, e: [number, number][]) => add('informatics', g, l, e);
  add('english', 7, 5, [
    [2, 12],
    [4, 4 * 60 + 45 - 4 * 60],
  ]);
  math(5, 0, [
    [2, 4 * 1000 + 3 * 100 + 2 * 10 + 5],
    [4, 945 + 378],
  ]);
  math(5, 1, [
    [0, 6 + 4 * 3],
    [3, (48 / 6) * 2],
    [4, 28 - 12 / 3],
    [5, 4 * (7 + 5) - 9],
  ]);
  math(5, 2, [
    [2, 8 - 3],
    [4, (20 * 4) / 5],
  ]);
  math(5, 3, [
    [0, 3.4 + 1.25],
    [3, 7.08 - 2.6],
    [4, 2.35 + 3.6],
    [5, 10 - 2.35 - 3.6],
  ]);
  math(5, 4, [
    [0, 2.5 * 100],
    [1, 3000 / 1000],
    [4, 3 * 100 + 20],
    [5, 5 * 1000 + 250],
  ]);
  math(5, 5, [
    [0, 8 * 3],
    [3, 48 / 6],
    [4, (10 * 4) / 1],
    [5, 2 * (7 + 5)],
  ]);
  math(6, 0, [
    [2, (20 * 3) / 5],
    [5, (36 * 5) / 6],
  ]);
  math(6, 1, [
    [0, 1 / 2 / (1 / 4)],
    [4, 3 / 4 / (1 / 8)],
    [5, 4.5 / 0.75],
  ]);
  math(6, 2, [
    [2, (15 / 5) * 2],
    [4, (15000 / 5) * 8],
    [5, (27000 / 3) * 5],
  ]);
  math(6, 3, [
    [0, -4 + 7],
    [4, -6 - -4],
    [5, -3 * 4 + 5],
  ]);
  math(6, 4, [
    [2, 80 * 0.3],
    [3, 60000 * 1.1],
    [4, 120000 * 0.75],
    [5, 18 / 0.25],
  ]);
  math(6, 5, [
    [2, 5],
    [4, 8 - 3],
  ]);
  math(7, 0, [
    [0, 3 * 4 + 2],
    [3, -4],
    [4, 2 * (5 + 3) - 5],
  ]);
  math(7, 1, [
    [0, 19 - 7],
    [3, 28 / 4],
    [4, (7 + 8) / (5 - 2)],
    [5, 21 / 3 + 2],
  ]);
  math(7, 2, [
    [0, 2 ** 5],
    [3, (-2) ** 2],
    [4, 5 ** 2 - 3 ** 2],
    [5, 2 ** 3 * 2 ** 2],
  ]);
  math(7, 3, [
    [2, 2 * (2 + 3)],
    [3, 2 + 3],
    [4, (7 + 3) ** 2],
  ]);
  math(7, 4, [
    [0, 2 * 3 + 1],
    [3, 2 * 0 + 1],
    [4, -3 * 2 + 4],
    [5, (10 + 2) / 3],
  ]);
  math(7, 5, [
    [0, 180 - 60 - 50],
    [4, (180 - 40) / 2],
  ]);
  info(5, 2, [[5, 4 + 3]]);
  info(6, 1, [
    [3, 3 * 2],
    [5, 4 * 5],
  ]);
  info(6, 2, [
    [2, 7 + 5],
    [4, (2 + 3) * 4],
    [5, 2 * 4 + 3],
  ]);
  info(6, 3, [
    [2, 4 * 10],
    [4, 3 * 8 + 6],
    [5, 5 * 12],
  ]);
  info(6, 5, [[5, 1 + 3 + 1]]);
  info(7, 0, [
    [0, 0b1011],
    [5, 0b10000],
  ]);
  info(7, 1, [
    [0, 8],
    [2, 16 * 8],
    [4, 2 * 2 ** 10],
    [5, 2 * 2 ** 10 * 8],
  ]);
  info(7, 2, [
    [2, 12 + 8],
    [4, [12, 8, 5].reduce((a, b) => a + b)],
    [5, 12 + 10],
  ]);
  info(7, 3, [
    [2, ((x: number) => (x >= 5 ? 2 * x : x + 1))(7)],
    [4, ((x: number) => (x > 10 ? x + 1 : x - 1))(10)],
    [5, ((x: number) => (x < 0 ? -x : x))(-4)],
  ]);
  info(7, 4, [
    [0, 0 + 3 * 4],
    [2, 1 * 2 ** 3],
    [4, 5 + 3 * 2],
    [5, 1 * 2 ** 3 + 5],
  ]);
  let checked = 0;
  for (const s of curriculum)
    for (const grade of [5, 6, 7] as Grade[])
      for (const [l, lesson] of s.grades[grade].entries())
        for (const [q, question] of lesson.questions.entries())
          if (question.type === 'NUMERICAL') {
            const key = `${s.slug}:${grade}:${l}:${q}`;
            assert.ok(Object.hasOwn(cases, key), `Missing independent calculation: ${key}`);
            assert.ok(Math.abs(Number(question.answer) - cases[key]!) < 1e-9, key);
            checked++;
          }
  assert.equal(checked, Object.keys(cases).length);
  for (const [g, l, q, result] of [
    [5, 2, 3, 2 / 6],
    [6, 0, 3, ((4 / 7) * 7) / 8],
    [6, 0, 4, ((5 / 6) * 3) / 5],
    [6, 1, 3, 3 / 7 / (6 / 7)],
  ] as const) {
    const [n, d] = mathematics[g][l]!.questions[q]!.answer.split('/').map(Number);
    assert.ok(Math.abs(n! / d! - result) < 1e-9);
  }
});
test('representative arithmetic, equation, and binary answer keys agree with independent calculations', () => {
  const cases: [Grade, number, number, number][] = [
    [5, 0, 4, 945 + 378],
    [5, 1, 5, 4 * (7 + 5) - 9],
    [5, 3, 5, 10 - 2.35 - 3.6],
    [5, 5, 5, 2 * (7 + 5)],
    [6, 1, 5, 4.5 / 0.75],
    [6, 2, 4, (15000 / 5) * 8],
    [6, 3, 5, -3 * 4 + 5],
    [6, 4, 5, 18 / 0.25],
    [7, 1, 4, (7 + 8) / (5 - 2)],
    [7, 2, 5, 2 ** 3 * 2 ** 2],
    [7, 3, 4, (7 + 3) ** 2],
    [7, 4, 5, (10 + 2) / 3],
    [7, 5, 4, (180 - 40) / 2],
  ];
  for (const [grade, lesson, question, expected] of cases)
    assert.ok(
      Math.abs(Number(mathematics[grade][lesson]!.questions[question]!.answer) - expected) < 1e-9,
    );
  assert.equal(Number(informatics[7][0]!.questions[0]!.answer), Number.parseInt('1011', 2));
  assert.equal(
    Number.parseInt(informatics[7][0]!.questions[4]!.answer, 2),
    Number.parseInt('1010', 2) + Number.parseInt('101', 2),
  );
  assert.equal(Number(informatics[7][1]!.questions[5]!.answer), 2 * 2 ** 10 * 8);
});
