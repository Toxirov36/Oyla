import { exerciseLabels } from '../../lib/exercises';
export const grades = [5, 6, 7].map((n) => ({ value: String(n), label: `${n}-sinf` }));
export const typeOptions = Object.entries(exerciseLabels).map(([value, label]) => ({
  value,
  label,
}));
export const roles = [
  { value: 'STUDENT', label: 'O‘quvchi' },
  { value: 'TEACHER', label: 'O‘qituvchi' },
  { value: 'ADMIN', label: 'Admin' },
];
export const criterions = [
  { value: 'LESSONS', label: 'Yakunlangan darslar' },
  { value: 'CHALLENGES', label: 'Kunlik challenge' },
  { value: 'PERFECT', label: '100% natijalar' },
  { value: 'STREAK', label: 'Ketma-ket kunlar' },
  { value: 'MATH', label: 'Matematika darslari' },
  { value: 'ENGLISH', label: 'Ingliz tili darslari' },
  { value: 'CODING', label: 'Informatika darslari' },
  { value: 'ANSWERS', label: 'To‘g‘ri javoblar' },
];
