export type Role = 'STUDENT' | 'TEACHER' | 'ADMIN';
export type Status = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
export type QuestionType = 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'NUMERICAL' | 'TEXT';
export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  teacherAccess?: boolean;
  student: { grade: number } | null;
  active?: boolean;
  createdAt?: string;
}
export interface Profile {
  user: User & { createdAt: string };
  student: {
    totalXp: number;
    level: number;
    levelTitle: string;
    levelThreshold: number;
    nextLevelThreshold: number | null;
    streak: number;
    longestStreak: number;
    completedLessons: number;
    badges: number;
    classes: { id: string; name: string; grade: number; teacher: { name: string } }[];
  } | null;
  teacher: {
    classes: { id: string; name: string; grade: number; _count: { students: number } }[];
    students: number;
    assignments: number;
  } | null;
}
export interface LessonSummary {
  id: string;
  title: string;
  duration: number;
  position?: number;
}
export interface Topic {
  id: string;
  title: string;
  lessons: LessonSummary[];
  status?: Status;
  courseId?: string;
  position?: number;
}
export interface Course {
  id: string;
  title: string;
  grade: number;
  topics: Topic[];
  status?: Status;
  subjectId?: string;
  position?: number;
}
export interface Subject {
  id: string;
  title: string;
  slug: string;
  description: string;
  courses: Course[];
  status?: Status;
  position?: number;
}
export interface Question {
  id: string;
  lessonId: string;
  text: string;
  type: QuestionType;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  hint: string | null;
  xp: number | null;
  position: number;
  options: { id: string; text: string; value: string }[];
}
export interface Lesson extends LessonSummary {
  explanation: string;
  example: string;
  topicId: string;
  questions: Question[];
  topic: {
    id: string;
    title: string;
    course: { id: string; title: string; grade: number; subject: Subject };
  };
}
export interface Result {
  attemptId: string;
  score: number;
  correct: number;
  total: number;
  earnedXp: number;
  totalXp: number;
  level: number;
  streak: number;
  masteryBefore: number;
  masteryAfter: number;
  badges: { id: string; title: string; description: string }[];
  nextLesson: LessonSummary | null;
}
export interface Attempt {
  id: string;
  lessonId: string | null;
  status: 'IN_PROGRESS' | 'COMPLETED';
  questions: Question[];
  answers: { questionId: string; value: string; correct: boolean }[];
  result: Result | null;
}
export interface Feedback {
  questionId: string;
  correct: boolean;
  explanation: string;
  hint: string | null;
  message: string;
  counted?: boolean;
}
export interface Assignment {
  id: string;
  title: string;
  deadline: string;
  class: { id: string; name: string; _count?: { students: number } };
  lesson: { id: string; title: string };
  submissions: {
    score: number;
    late: boolean;
    createdAt: string;
    user?: { id: string; name: string };
  }[];
}
export interface Badge {
  id: string;
  title: string;
  description: string;
  slug: string;
  criterion: string;
  threshold: number;
  unlockedAt?: string | null;
}
export interface Dashboard {
  user: User;
  totalXp: number;
  level: { number: number; title: string; threshold: number };
  nextLevel: { number: number; title: string; threshold: number } | null;
  streak: number;
  longestStreak: number;
  completedLessons: number;
  completedLessonIds: string[];
  totalLessons: number;
  continueLesson: {
    id: string;
    title: string;
    duration: number;
    subject: string;
    slug: string;
    topic: string;
  } | null;
  subjects: {
    id: string;
    slug: string;
    title: string;
    total: number;
    completed: number;
    progress: number;
    mastery: number;
  }[];
  topics: {
    id: string;
    title: string;
    subject: string;
    total: number;
    completed: number;
    progress: number;
    mastery: number;
  }[];
  badges: { badge: Badge; createdAt: string }[];
  assignments: Assignment[];
  dailyCompleted: boolean;
  activity: { day: string; xp: number }[];
}
export interface Ranking {
  rank: number;
  userId: string;
  name: string;
  xp: number;
  isMe: boolean;
}
export interface Daily {
  day: string;
  questionCount: number;
  reward: number;
  status: string;
  attemptId: string | null;
  result: Result | null;
}
export interface StudentPerformance extends User {
  mastery: number;
  completed: number;
  progress: {
    bestScore: number;
    lessonId: string;
    lesson: { title: string; topic: { title: string } };
  }[];
}
export interface Classroom {
  id: string;
  name: string;
  grade: number;
  teacherId: string;
  students: StudentPerformance[];
  assignments: Assignment[];
}
export interface Analytics {
  users: number;
  students: number;
  teachers: number;
  lessons: number;
  published: number;
  draft: number;
  completedAttempts: number;
  averageScore: number;
  totalXp: number;
  subjects: number;
  recent: {
    id: string;
    score: number;
    earnedXp: number;
    completedAt: string;
    user: { name: string };
    lesson: { title: string } | null;
  }[];
}
export interface Level {
  id: string;
  number: number;
  title: string;
  threshold: number;
}
export interface GameConfig {
  rules: { key: string; amount: number }[];
  levels: Level[];
  badges: Badge[];
}
export interface AdminQuestion extends Question {
  answer: string;
  explanation: string;
  status: Status;
  tolerance: number;
}
export interface AdminLesson extends LessonSummary {
  topicId: string;
  explanation: string;
  example: string;
  status: Status;
  questions: AdminQuestion[];
}
export interface AdminTopic extends Omit<Topic, 'lessons'> {
  courseId: string;
  lessons: AdminLesson[];
  status: Status;
}
export interface AdminCourse extends Omit<Course, 'topics'> {
  subjectId: string;
  topics: AdminTopic[];
  status: Status;
}
export interface AdminSubject extends Omit<Subject, 'courses'> {
  courses: AdminCourse[];
  status: Status;
}
export interface AdminClass {
  id: string;
  name: string;
  grade: number;
  teacherId: string;
  teacher: { id: string; name: string };
  students: { studentId: string; student: User }[];
}
