import { translate as tx } from '../../i18n';
import { exerciseLabels } from '../../lib/exercises';
export const grades = [5, 6, 7].map((n) => ({
  value: String(n),
  get label() {
    return tx('common.grade', { grade: n });
  },
}));
export const typeOptions = (Object.keys(exerciseLabels) as (keyof typeof exerciseLabels)[]).map(
  (value) => ({
    value,
    get label() {
      return exerciseLabels[value];
    },
  }),
);
export const roles = [
  {
    value: 'STUDENT',
    get label() {
      return tx('role.STUDENT');
    },
  },
  {
    value: 'TEACHER',
    get label() {
      return tx('role.TEACHER');
    },
  },
  {
    value: 'ADMIN',
    get label() {
      return tx('pages.admin.config.admin');
    },
  },
];
export const criterions = [
  {
    value: 'LESSONS',
    get label() {
      return tx('profile.completedLessons');
    },
  },
  {
    value: 'CHALLENGES',
    get label() {
      return tx('navigation.challenge');
    },
  },
  {
    value: 'PERFECT',
    get label() {
      return tx('pages.admin.config.perfectScores');
    },
  },
  {
    value: 'STREAK',
    get label() {
      return tx('pages.admin.config.consecutiveDays');
    },
  },
  {
    value: 'MATH',
    get label() {
      return tx('pages.admin.config.mathematicsLessons');
    },
  },
  {
    value: 'ENGLISH',
    get label() {
      return tx('pages.admin.config.englishLessons');
    },
  },
  {
    value: 'CODING',
    get label() {
      return tx('pages.admin.config.computerScienceLessons');
    },
  },
  {
    value: 'ANSWERS',
    get label() {
      return tx('pages.admin.config.correctAnswers');
    },
  },
];
