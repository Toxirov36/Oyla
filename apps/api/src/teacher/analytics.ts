import { mean } from '../learning/rules';

export interface LearningLesson {
  masteryScore?: number;
  id: string;
  title: string;
  topic: {
    id: string;
    title: string;
    course: { grade: number; subject: { id: string; title: string; slug: string } };
  };
}
export interface LearningProgress {
  userId: string;
  lessonId: string;
  bestScore: number;
}
export function studentLearning(
  userId: string,
  lessons: LearningLesson[],
  rows: LearningProgress[],
) {
  const byId = new Map(lessons.map((lesson) => [lesson.id, lesson]));
  const progress = rows
    .filter((row) => row.userId === userId && byId.has(row.lessonId))
    .map((row) => ({
      lessonId: row.lessonId,
      bestScore: row.bestScore,
      lesson: byId.get(row.lessonId)!,
    }));
  const topicIds = [...new Set(lessons.map((lesson) => lesson.topic.id))];
  const topics = topicIds.map((id) => {
    const available = lessons.filter((lesson) => lesson.topic.id === id);
    const completed = progress.filter((row) => row.lesson.topic.id === id);
    const first = available[0]!;
    const mastery = completed.length ? mean(completed.map((row) => row.bestScore)) : null;
    const suggested =
      available.find((lesson) => !completed.some((row) => row.lessonId === lesson.id)) ||
      [...completed].sort((a, b) => a.bestScore - b.bestScore)[0]?.lesson ||
      first;
    return {
      id,
      title: first.topic.title,
      subject: first.topic.course.subject.title,
      totalLessons: available.length,
      completed: completed.length,
      mastered: completed.filter((row) => row.bestScore >= (row.lesson.masteryScore ?? 70)).length,
      progressPercent: Math.round((completed.length / available.length) * 100),
      mastery,
      needsHelp: mastery !== null && mastery < 60,
      suggestedLesson: { id: suggested.id, title: suggested.title },
    };
  });
  return {
    progress,
    completed: progress.length,
    mastered: progress.filter((row) => row.bestScore >= (row.lesson.masteryScore ?? 70)).length,
    totalLessons: lessons.length,
    progressPercent: lessons.length ? Math.round((progress.length / lessons.length) * 100) : 0,
    mastery: mean(progress.map((row) => row.bestScore)),
    topics,
    needsHelp: topics.some((topic) => topic.needsHelp),
  };
}
export function classTopics(
  lessons: LearningLesson[],
  students: ReturnType<typeof studentLearning>[],
) {
  const definitions = studentLearning('', lessons, []).topics;
  return definitions
    .map((topic) => {
      const scores = students
        .map((student) => student.topics.find((entry) => entry.id === topic.id)!)
        .filter(Boolean);
      const started = scores.filter((entry) => entry.mastery !== null);
      const completed = scores.reduce((sum, entry) => sum + entry.completed, 0);
      const struggling = started.filter((entry) => entry.needsHelp).length;
      const candidates = lessons
        .filter((lesson) => lesson.topic.id === topic.id)
        .map((lesson) => {
          const results = students.flatMap((student) =>
            student.progress.filter((row) => row.lessonId === lesson.id),
          );
          return {
            lesson,
            mastery: results.length ? mean(results.map((row) => row.bestScore)) : null,
          };
        });
      const suggested = [...candidates].sort((a, b) => (a.mastery ?? 101) - (b.mastery ?? 101))[0]!
        .lesson;
      return {
        id: topic.id,
        title: topic.title,
        subject: topic.subject,
        totalLessons: topic.totalLessons,
        mastery: started.length ? mean(started.map((entry) => entry.mastery!)) : null,
        participants: started.length,
        notStarted: students.length - started.length,
        struggling,
        completed,
        mastered: scores.reduce((sum, entry) => sum + entry.mastered, 0),
        progressPercent: students.length
          ? Math.round((completed / (students.length * topic.totalLessons)) * 100)
          : 0,
        suggestedLesson: { id: suggested.id, title: suggested.title },
      };
    })
    .sort((a, b) => b.struggling - a.struggling || (a.mastery ?? 101) - (b.mastery ?? 101));
}
