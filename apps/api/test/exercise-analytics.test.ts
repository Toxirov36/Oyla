import { test } from 'node:test';
import assert from 'node:assert/strict';
import { exerciseAnalysis, type ExerciseAttempt } from '../src/teacher/exercise-analytics';
const lesson = {
  id: 'lesson',
  topicId: 'topic',
  topic: { course: { subject: { title: 'Matematika' } } },
};
const attempt = (id: string, userId: string, day: number, correct: boolean): ExerciseAttempt => ({
  id,
  userId,
  lessonId: 'lesson',
  completedAt: new Date(2026, 9, day),
  questionsSnapshot: [{ id: 'question', type: 'FILL_GAP' }],
  answers: [{ questionId: 'question', correct, question: { type: 'TEXT' } }],
});
test('exercise analysis uses immutable type and latest completion per learner without weighting repeated practice', () => {
  const rows = exerciseAnalysis(
    [
      attempt('old', 'a', 1, false),
      attempt('new', 'a', 2, true),
      attempt('other', 'b', 2, false),
      attempt('foreign', 'c', 3, true),
    ],
    [lesson],
    ['a', 'b'],
  );
  assert.deepEqual(rows, [
    {
      type: 'FILL_GAP',
      subject: 'Matematika',
      answers: 2,
      correct: 1,
      accuracy: 50,
      participants: 2,
      struggling: 1,
    },
  ]);
});
test('exercise analysis excludes hidden topics, unfinished attempts and learners outside the roster', () => {
  const unfinished = { ...attempt('unfinished', 'a', 2, false), completedAt: null };
  assert.deepEqual(
    exerciseAnalysis([unfinished, attempt('foreign', 'b', 3, true)], [lesson], ['a']),
    [],
  );
  assert.deepEqual(
    exerciseAnalysis([attempt('hidden', 'a', 3, true)], [lesson], ['a'], 'different-topic'),
    [],
  );
});
