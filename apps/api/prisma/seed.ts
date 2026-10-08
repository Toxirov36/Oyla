import { config as loadEnv } from 'dotenv';
import { BadgeCriterion } from '../generated/prisma/client';
import { createPrismaClient } from './client';
import * as argon2 from 'argon2';
import { createHash } from 'node:crypto';
import { syncCurriculum } from './curriculum/sync';
import { lessonId } from './curriculum/types';
import { installInteractivePilot } from './interactive-pilot';

loadEnv({ override: true, quiet: true });
const db = createPrismaClient();
const id = (key: string) => {
  const hash = createHash('sha256').update(`oyla:${key}`).digest('hex');
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
};
async function main() {
  if (process.env.NODE_ENV === 'production')
    throw new Error('Demo seeding is disabled in production.');
  const password = process.env.DEMO_PASSWORD;
  if (!password || password.length < 10)
    throw new Error('Set DEMO_PASSWORD (at least 10 characters) for development seeding.');
  const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
  const accounts = [
    { email: 'admin@oyla.uz', name: 'OYLA Admin', role: 'ADMIN' as const },
    { email: 'teacher@oyla.uz', name: 'Aziza Karimova', role: 'TEACHER' as const },
    { email: 'teacher2@oyla.uz', name: 'Jasur Rahimov', role: 'TEACHER' as const },
    ...[
      'Ali Valiyev',
      'Madina Sobirova',
      'Sardor Aliyev',
      'Zuhra Usmonova',
      'Bekzod Karimov',
      'Malika Ergasheva',
    ].map((name, i) => ({
      email: i ? `student${i + 1}@oyla.uz` : 'student@oyla.uz',
      name,
      role: 'STUDENT' as const,
      grade: 6,
    })),
    { email: 'grade5@oyla.uz', name: 'Nodira Abduvaliyeva', role: 'STUDENT' as const, grade: 5 },
    { email: 'grade7@oyla.uz', name: 'Temur Sodiqov', role: 'STUDENT' as const, grade: 7 },
  ];
  for (const account of accounts)
    await db.user.upsert({
      where: { email: account.email },
      update: {},
      create: {
        id: id(account.email),
        email: account.email,
        name: account.name,
        role: account.role,
        passwordHash,
        ...(account.role === 'STUDENT'
          ? { student: { create: { grade: account.grade } } }
          : account.role === 'TEACHER'
            ? { teacher: { create: {} } }
            : {}),
      },
    });
  for (const [key, amount] of Object.entries({
    LESSON_COMPLETED: 100,
    CORRECT_ANSWER: 20,
    DAILY_CHALLENGE: 50,
    STREAK_7: 200,
  }))
    await db.xpRule.upsert({ where: { key }, update: {}, create: { key, amount } });
  const thresholds = [0, 200, 500, 900, 1400, 2000, 2800, 3800, 5000, 6500];
  for (let i = 0; i < thresholds.length; i++)
    await db.level.upsert({
      where: { number: i + 1 },
      update: {},
      create: {
        number: i + 1,
        title: ['Boshlovchi', 'Izlanuvchi', 'Bilimdon', 'Kashfiyotchi', 'Usta'][Math.min(i, 4)]!,
        threshold: thresholds[i]!,
      },
    });
  const badgeSeeds: [string, string, string, BadgeCriterion, number][] = [
    ['first-lesson', 'Birinchi qadam', 'Birinchi darsni yakunlang.', 'LESSONS', 1],
    ['first-challenge', 'Challenger', 'Birinchi kunlik challengeni yakunlang.', 'CHALLENGES', 1],
    ['perfect-score', 'Mukammal natija', 'Barcha savollarga to‘g‘ri javob bering.', 'PERFECT', 1],
    ['seven-day', '7 kunlik odat', 'Ketma-ket 7 kun bilim oling.', 'STREAK', 7],
    ['math-explorer', 'Matematika bilimdoni', '3 ta matematika darsini yakunlang.', 'MATH', 3],
    ['english-explorer', 'English explorer', '3 ta ingliz tili darsini yakunlang.', 'ENGLISH', 3],
    ['coding-explorer', 'Raqamli kashfiyotchi', '3 ta informatika darsini yakunlang.', 'CODING', 3],
    ['problem-solver', 'Masala ustasi', '20 ta savolga to‘g‘ri javob bering.', 'ANSWERS', 20],
  ];
  for (const [slug, title, description, criterion, threshold] of badgeSeeds)
    await db.badge.upsert({
      where: { slug },
      update: {},
      create: { slug, title, description, criterion, threshold },
    });
  const curriculumReport = await syncCurriculum(db);
  await installInteractivePilot(db);
  for (const [name, teacher, emails] of [
    [
      '6-A',
      'teacher@oyla.uz',
      accounts
        .filter((a) => a.role === 'STUDENT' && a.email.startsWith('student'))
        .map((a) => a.email),
    ],
    ['6-B', 'teacher2@oyla.uz', ['student2@oyla.uz']],
  ] as [string, string, string[]][]) {
    const classId = id(`class:${name}`);
    await db.class.upsert({
      where: { id: classId },
      update: {},
      create: { id: classId, name, grade: 6, teacherId: id(teacher) },
    });
    for (const email of emails)
      await db.classStudent.upsert({
        where: { classId_studentId: { classId, studentId: id(email) } },
        update: {},
        create: { classId, studentId: id(email) },
      });
  }
  await db.assignment.upsert({
    where: { id: id('first-assignment') },
    update: {},
    create: {
      id: id('first-assignment'),
      classId: id('class:6-A'),
      lessonId: lessonId('mathematics', 6, 0),
      title: 'Kasrlarni ko‘paytirishni mustahkamlaymiz',
      deadline: new Date(Date.now() + 7 * 86400000),
    },
  });
  console.log(
    `Seed ready: 3 subjects, 9 courses, ${curriculumReport.lessons} grade-specific lessons, ${curriculumReport.questions} questions; ${curriculumReport.archivedLegacy} unused starter lessons archived, ${curriculumReport.preservedLegacy} referenced or edited starter lessons preserved. No learning statistics are fabricated.`,
  );
  console.log('Content review corrections:', curriculumReport.review);
}
main().finally(() => db.$disconnect());
