import { test } from 'node:test';
import assert from 'node:assert/strict';
import { curriculum } from '../prisma/curriculum';
import { mathematics } from '../prisma/curriculum/mathematics';
import { informatics } from '../prisma/curriculum/informatics';
import { lessonId, type Grade } from '../prisma/curriculum/types';

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
        }
      }
    }
    assert.equal(fingerprints.size, 3, `${subject.slug} must have distinct grade sequences`);
  }
  assert.equal(ids.size, 54);
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
