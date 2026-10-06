import { createHash } from 'node:crypto';
import type { Difficulty, QuestionType } from '@prisma/client';

export type Grade = 5 | 6 | 7;
export type SeedQuestion = {
  text: string;
  type: QuestionType;
  answer: string;
  explanation: string;
  options?: string[];
  difficulty?: Difficulty;
  hint?: string;
  tolerance?: number;
};
export type SeedLesson = {
  title: string;
  topic: string;
  explanation: string;
  example: string;
  questions: SeedQuestion[];
};
export type GradeCurriculum = Record<Grade, SeedLesson[]>;
export type SeedSubject = {
  slug: string;
  title: string;
  description: string;
  grades: GradeCurriculum;
};
export const seedId = (key: string) => {
  const hash = createHash('sha256').update(`oyla:${key}`).digest('hex');
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
};
export const lessonId = (slug: string, grade: Grade, position: number) =>
  seedId(`curriculum:v2:${slug}:${grade}:lesson:${position}`);
export const mc = (
  text: string,
  options: string[],
  answer: string,
  explanation: string,
  hint?: string,
): SeedQuestion => ({ text, options, answer, explanation, hint, type: 'MULTIPLE_CHOICE' });
export const tf = (
  text: string,
  answer: boolean,
  explanation: string,
  hint?: string,
): SeedQuestion => ({ text, answer: String(answer), explanation, hint, type: 'TRUE_FALSE' });
export const num = (
  text: string,
  answer: number,
  explanation: string,
  hint?: string,
): SeedQuestion => ({ text, answer: String(answer), explanation, hint, type: 'NUMERICAL' });
export const txt = (
  text: string,
  answer: string,
  explanation: string,
  hint?: string,
): SeedQuestion => ({ text, answer, explanation, hint, type: 'TEXT' });
export const lesson = (
  title: string,
  topic: string,
  objective: string,
  explanation: string,
  example: string,
  questions: SeedQuestion[],
): SeedLesson => ({
  title,
  topic,
  explanation: `Dars maqsadi: ${objective}\n\n${explanation}`,
  example,
  questions,
});
