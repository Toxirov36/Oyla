import { QuestionType } from '../../generated/prisma/client';

type CheckableQuestion = {
  type: QuestionType;
  answer: string;
  tolerance: number;
  options?: { value: string }[];
};
const normal = (value: string) =>
  value.normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('en');
const checkers: Record<QuestionType, (q: CheckableQuestion, value: string) => boolean> = {
  MULTIPLE_CHOICE: (q, value) =>
    !!q.options?.some((option) => option.value === value) && value === q.answer,
  TRUE_FALSE: (q, value) => ['true', 'false'].includes(value) && value === q.answer,
  NUMERICAL: (q, value) => {
    const text = value.trim().replace(',', '.');
    return (
      /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(text) &&
      Number.isFinite(Number(text)) &&
      Math.abs(Number(text) - Number(q.answer)) <= q.tolerance
    );
  },
  TEXT: (q, value) => q.answer.split('|').some((answer) => normal(value) === normal(answer)),
};
export const checkAnswer = (q: CheckableQuestion, value: string) => checkers[q.type](q, value);
export const scoreAnswers = (correct: number, total: number) =>
  total ? Math.round((correct / total) * 100) : 0;
export const localDay = (date = new Date()) =>
  new Date(date.getTime() + 5 * 3600000).toISOString().slice(0, 10);
export function nextStreak(
  previous: { lastDay: string; current: number; longest: number } | null,
  day: string,
) {
  if (previous?.lastDay === day) return previous;
  const difference = previous ? (Date.parse(day) - Date.parse(previous.lastDay)) / 86400000 : 0;
  const current = difference === 1 && previous ? previous.current + 1 : 1;
  return { lastDay: day, current, longest: Math.max(current, previous?.longest || 0) };
}
export function weekStart(date = new Date()) {
  const day = new Date(`${localDay(date)}T00:00:00Z`);
  day.setUTCDate(day.getUTCDate() - ((day.getUTCDay() + 6) % 7));
  return new Date(day.getTime() - 5 * 3600000);
}
export const mean = (numbers: number[]) =>
  numbers.length ? Math.round(numbers.reduce((a, b) => a + b, 0) / numbers.length) : 0;
