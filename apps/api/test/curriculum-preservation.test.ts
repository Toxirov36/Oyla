import { test } from 'node:test';
import assert from 'node:assert/strict';
import { legacyCurriculum } from '../prisma/curriculum/legacy';
import { canArchiveStarter } from '../prisma/curriculum/sync';
import { seedId } from '../prisma/curriculum/types';

const original = legacyCurriculum[0]!.lessons[0]!;
function stored(): Parameters<typeof canArchiveStarter>[0] {
  const date = new Date('2026-10-06T00:00:00Z');
  const lessonId = seedId('mathematics:5:lesson:0');
  return {
    id: lessonId,
    prerequisiteId: null,
    masteryScore: 70,
    unlockScore: 70,
    topicId: seedId('mathematics:5:topic:0'),
    title: original.title,
    explanation: original.explanation,
    example: original.example,
    duration: 8,
    position: 0,
    status: 'PUBLISHED',
    createdAt: date,
    updatedAt: date,
    questions: original.questions.map((q, i) => {
      const questionId = seedId(`${lessonId}:question:${i}`);
      return {
        id: questionId,
        lessonId,
        text: q.text,
        type: q.type,
        difficulty: i >= 4 ? 'HARD' : i === 0 ? 'EASY' : 'MEDIUM',
        answer: q.answer,
        explanation: q.explanation,
        hint: null,
        tolerance: 0.0001,
        xp: null,
        version: 1,
        config: null,
        grading: null,
        position: i,
        status: 'PUBLISHED',
        createdAt: date,
        updatedAt: date,
        options: (q.options || []).map((text, position) => ({
          id: seedId(`${questionId}:${position}`),
          questionId,
          text,
          value: text,
          position,
          createdAt: date,
          updatedAt: date,
        })),
      };
    }),
  };
}
test('attempts, progress, or assignments prevent starter archiving independently', () => {
  const row = stored();
  assert.equal(
    canArchiveStarter(row, original, 0, { attempts: 0, progress: 0, assignments: 0 }),
    true,
  );
  for (const references of [
    { attempts: 1, progress: 0, assignments: 0 },
    { attempts: 0, progress: 1, assignments: 0 },
    { attempts: 0, progress: 0, assignments: 1 },
  ])
    assert.equal(canArchiveStarter(row, original, 0, references), false);
});
test('administrator changes to lesson state, text, answer keys, or XP prevent archiving', () => {
  const references = { attempts: 0, progress: 0, assignments: 0 };
  const draft = stored();
  draft.status = 'DRAFT';
  const edited = stored();
  edited.title = 'Teacher-authored lesson';
  const answer = stored();
  answer.questions[0]!.answer = 'custom answer';
  const reward = stored();
  reward.questions[0]!.xp = 30;
  const prerequisite = stored();
  prerequisite.prerequisiteId = seedId('custom prerequisite');
  const version = stored();
  version.questions[0]!.version = 2;
  const definition = stored();
  definition.questions[0]!.config = { code: 'teacher-authored' };
  for (const row of [draft, edited, answer, reward, prerequisite, version, definition])
    assert.equal(canArchiveStarter(row, original, 0, references), false);
});
