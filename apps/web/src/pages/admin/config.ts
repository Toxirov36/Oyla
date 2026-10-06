export const grades = [5, 6, 7].map((n) => ({ value: String(n), label: `${n}-sinf` }));
export const typeOptions = [
  { value: 'MULTIPLE_CHOICE', label: 'Variantli savol' },
  { value: 'TRUE_FALSE', label: 'To‘g‘ri / noto‘g‘ri' },
  { value: 'NUMERICAL', label: 'Sonli javob' },
  { value: 'TEXT', label: 'Matnli javob' },
];
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
