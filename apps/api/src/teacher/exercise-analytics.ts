import type { QuestionType } from '../../generated/prisma/client';

export interface ExerciseAttempt {
  id: string;
  userId: string;
  lessonId: string | null;
  completedAt: Date | null;
  questionsSnapshot: unknown;
  answers: { questionId: string; correct: boolean; question: { type: QuestionType } }[];
}
export interface ExerciseLesson {
  id: string;
  topicId: string;
  topic: { course: { subject: { title: string } } };
}
export function exerciseAnalysis(
  attempts: ExerciseAttempt[],
  lessons: ExerciseLesson[],
  rosterIds: string[],
  topicId?: string,
) {
  const roster = new Set(rosterIds);
  const visible = new Map(
    lessons.filter((l) => !topicId || l.topicId === topicId).map((l) => [l.id, l]),
  );
  const latest = new Map<string, ExerciseAttempt>();
  for (const attempt of attempts) {
    if (
      !attempt.lessonId ||
      !visible.has(attempt.lessonId) ||
      !roster.has(attempt.userId) ||
      !attempt.completedAt
    )
      continue;
    const key = `${attempt.userId}:${attempt.lessonId}`;
    const previous = latest.get(key);
    if (
      !previous ||
      attempt.completedAt > previous.completedAt! ||
      (+attempt.completedAt === +previous.completedAt! && attempt.id > previous.id)
    )
      latest.set(key, attempt);
  }
  const groups = new Map<
    string,
    {
      type: QuestionType;
      subject: string;
      answers: number;
      correct: number;
      students: Map<string, { answers: number; correct: number }>;
    }
  >();
  for (const attempt of latest.values()) {
    const subject = visible.get(attempt.lessonId!)!.topic.course.subject.title;
    const snapshots = Array.isArray(attempt.questionsSnapshot)
      ? (attempt.questionsSnapshot as { id: string; type: QuestionType }[])
      : [];
    for (const answer of attempt.answers) {
      const type = snapshots.find((q) => q.id === answer.questionId)?.type ?? answer.question.type;
      const key = `${subject}:${type}`;
      const group = groups.get(key) ?? {
        type,
        subject,
        answers: 0,
        correct: 0,
        students: new Map<string, { answers: number; correct: number }>(),
      };
      group.answers++;
      if (answer.correct) group.correct++;
      const student = group.students.get(attempt.userId) ?? { answers: 0, correct: 0 };
      student.answers++;
      if (answer.correct) student.correct++;
      group.students.set(attempt.userId, student);
      groups.set(key, group);
    }
  }
  return [...groups.values()]
    .map((g) => ({
      type: g.type,
      subject: g.subject,
      answers: g.answers,
      correct: g.correct,
      accuracy: Math.round((g.correct / g.answers) * 100),
      participants: g.students.size,
      struggling: [...g.students.values()].filter((s) => s.correct / s.answers < 0.6).length,
    }))
    .sort((a, b) => a.accuracy - b.accuracy || a.type.localeCompare(b.type));
}
