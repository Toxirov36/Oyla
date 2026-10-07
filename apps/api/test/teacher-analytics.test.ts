import { test } from 'node:test';
import assert from 'node:assert/strict';
import { studentLearning, classTopics, type LearningLesson } from '../src/teacher/analytics';

const lesson = (id: string, topic = 'fractions'): LearningLesson => ({
  id,
  title: id,
  topic: {
    id: topic,
    title: topic,
    course: { grade: 6, subject: { id: 'math', title: 'Math', slug: 'mathematics' } },
  },
});
test('teacher calculations ignore other students, old grades and hidden lesson IDs', () => {
  const result = studentLearning(
    'a',
    [lesson('visible'), lesson('unstarted', 'algebra')],
    [
      { userId: 'a', lessonId: 'visible', bestScore: 40 },
      { userId: 'a', lessonId: 'hidden', bestScore: 100 },
      { userId: 'a', lessonId: 'old-grade', bestScore: 100 },
      { userId: 'b', lessonId: 'visible', bestScore: 100 },
    ],
  );
  assert.equal(result.completed, 1);
  assert.equal(result.totalLessons, 2);
  assert.equal(result.progressPercent, 50);
  assert.equal(result.mastery, 40);
  assert.equal(result.topics[1]!.mastery, null);
  assert.equal(result.topics[1]!.needsHelp, false);
});
test('weak topics flag a student even when the overall mean exceeds sixty', () => {
  const result = studentLearning(
    'a',
    [lesson('weak'), lesson('strong', 'algebra')],
    [
      { userId: 'a', lessonId: 'weak', bestScore: 40 },
      { userId: 'a', lessonId: 'strong', bestScore: 100 },
    ],
  );
  assert.equal(result.mastery, 70);
  assert.equal(result.needsHelp, true);
  assert.equal(studentLearning('b', [lesson('weak')], []).needsHelp, false);
});
test('topic averages give each participating student equal weight, exclude unstarted and suggest the weakest lesson', () => {
  const lessons = [lesson('one'), lesson('two'), lesson('empty', 'algebra')];
  const rows = [
    { userId: 'a', lessonId: 'one', bestScore: 20 },
    { userId: 'a', lessonId: 'two', bestScore: 80 },
    { userId: 'b', lessonId: 'one', bestScore: 100 },
  ];
  const students = ['a', 'b', 'c'].map((id) => studentLearning(id, lessons, rows));
  const topics = classTopics(lessons, students);
  assert.equal(topics[0]!.mastery, 75); // (50 + 100) / 2, not (20 + 80 + 100) / 3.
  assert.equal(topics[0]!.participants, 2);
  assert.equal(topics[0]!.notStarted, 1);
  assert.equal(topics[0]!.struggling, 1);
  assert.equal(topics[0]!.progressPercent, 50);
  assert.equal(topics[0]!.suggestedLesson.id, 'one');
  assert.equal(topics[1]!.mastery, null);
  assert.equal(topics[1]!.struggling, 0);
});
