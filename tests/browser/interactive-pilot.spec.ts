import { randomUUID } from 'node:crypto';
import * as argon2 from 'argon2';
import { test, expect, db, origin } from './fixtures';
import { seedId, type Grade } from '../../apps/api/prisma/curriculum/types';
import type { ExerciseGrading } from '../../apps/web/src/lib/exercises';
import type { Question } from '../../apps/api/generated/prisma/client';
const pilotId = (slug: string, grade: Grade) => seedId(`interactive:v1:${slug}:${grade}:lesson`);
function answer(q: Question, wrong = false) {
  if (q.grading) {
    const payload = { ...(q.grading as ExerciseGrading) };
    delete payload.radius;
    if (payload.text) payload.text = wrong ? 'wrong answer' : payload.text.split('|')[0]!;
    if (payload.values)
      payload.values = payload.values.map((v) => (wrong ? 'wrong' : v.split('|')[0]!));
    if (wrong && payload.pairs)
      payload.pairs = payload.pairs.map((p, i) => ({
        ...p,
        right: payload.pairs![(i + 1) % payload.pairs!.length]!.right,
      }));
    if (wrong && payload.points) payload.points = payload.points.map(() => ({ x: 0, y: 0 }));
    return { questionId: q.id, payload };
  }
  return {
    questionId: q.id,
    value: wrong
      ? q.type === 'TRUE_FALSE'
        ? q.answer === 'true'
          ? 'false'
          : 'true'
        : q.type === 'MULTIPLE_CHOICE'
          ? 'wrong'
          : '9999'
      : q.answer.split('|')[0],
  };
}
for (const grade of [5, 6, 7] as Grade[])
  test.describe(`${grade}-sinf interactive pilot`, () => {
    test.use({ learnerGrade: grade });
    test('all three published pilot lessons accept eight answers, persist results and reward once', async ({
      page,
      learner,
    }) => {
      const headers = { Origin: origin, Authorization: `Bearer ${learner.token}` };
      for (const slug of ['mathematics', 'english', 'informatics']) {
        const id = pilotId(slug, grade);
        const questions = await db.question.findMany({
          where: { lessonId: id, status: 'PUBLISHED' },
          orderBy: { position: 'asc' },
        });
        expect(questions).toHaveLength(8);
        const lesson = await page.request.get(`/api/v1/lessons/${id}`, { headers });
        expect(lesson.status()).toBe(200);
        const publicLesson = await lesson.json();
        expect(publicLesson.topic.course.grade).toBe(grade);
        expect(
          publicLesson.questions.every(
            (q: Record<string, unknown>) => !('grading' in q) && !('answer' in q),
          ),
        ).toBe(true);
        const started = await page.request.post('/api/v1/attempts', {
          headers,
          data: { lessonId: id },
        });
        expect(started.status()).toBe(201);
        const attempt = await started.json();
        for (const q of questions) {
          const response = await page.request.post(`/api/v1/attempts/${attempt.id}/answers`, {
            headers,
            data: answer(q),
          });
          expect(response.status()).toBe(201);
          expect((await response.json()).correct).toBe(true);
        }
        const complete = await page.request.post(`/api/v1/attempts/${attempt.id}/complete`, {
          headers,
        });
        expect(complete.status()).toBe(201);
        const result = await complete.json();
        expect(result.score).toBe(100);
        expect(result.mastered).toBe(true);
        expect(
          await db.xpTransaction.count({
            where: { userId: learner.user.id, sourceKey: `lesson:${id}` },
          }),
        ).toBe(1);
      }
      const dashboard = await (await page.request.get('/api/v1/students/me', { headers })).json();
      expect(dashboard.completedLessons).toBe(3);
      expect(dashboard.masteredLessons).toBe(3);
    });
  });

test('teacher type analysis counts first answers, distinguishes mastery and assigned lessons bypass prerequisites', async ({
  page,
  learner,
}, info) => {
  const password = 'TeacherPilotPassword2026!';
  const teacher = await db.user.create({
    data: {
      name: 'Interactive teacher',
      email: `interactive-teacher-${randomUUID()}@example.uz`,
      passwordHash: await argon2.hash(password),
      role: 'TEACHER',
      teacherAccess: true,
      teacher: { create: {} },
    },
  });
  const group = await db.class.create({
    data: {
      name: 'Interaktiv tahlil sinfi',
      grade: 6,
      teacherId: teacher.id,
      students: { create: { studentId: learner.user.id } },
    },
  });
  const headers = { Origin: origin, Authorization: `Bearer ${learner.token}` };
  let childId: string | undefined;
  try {
    for (const [slug, low] of [
      ['mathematics', false],
      ['english', true],
    ] as const) {
      const id = pilotId(slug, 6);
      const qs = await db.question.findMany({
        where: { lessonId: id, status: 'PUBLISHED' },
        orderBy: { position: 'asc' },
      });
      const attempt = await (
        await page.request.post('/api/v1/attempts', { headers, data: { lessonId: id } })
      ).json();
      for (const q of qs) {
        const wrong = low || q.type === 'FILL_GAP';
        let data = answer(q, wrong);
        if (low && q.type === 'MULTIPLE_CHOICE') {
          const options = await db.questionOption.findMany({ where: { questionId: q.id } });
          data = { questionId: q.id, value: options.find((o) => o.value !== q.answer)!.value };
        }
        const response = await page.request.post(`/api/v1/attempts/${attempt.id}/answers`, {
          headers,
          data,
        });
        expect(response.status()).toBe(201);
        if (!low && q.type === 'FILL_GAP') {
          const retry = await page.request.post(`/api/v1/attempts/${attempt.id}/answers`, {
            headers,
            data: answer(q),
          });
          expect(await retry.json()).toMatchObject({ correct: true, counted: false });
        }
      }
      const result = await (
        await page.request.post(`/api/v1/attempts/${attempt.id}/complete`, { headers })
      ).json();
      expect(result.mastered).toBe(!low);
    }
    const dashboard = await (await page.request.get('/api/v1/students/me', { headers })).json();
    expect(dashboard.completedLessons).toBe(2);
    expect(dashboard.masteredLessons).toBe(1);
    const parent = await db.lesson.findUniqueOrThrow({ where: { id: pilotId('mathematics', 6) } });
    const child = await db.lesson.create({
      data: {
        topicId: parent.topicId,
        title: 'Teacher-assigned advanced lesson',
        explanation: 'Topshiriq asosida ochiladigan interaktiv dars.',
        example: 'O‘qituvchi bergan topshiriqni bajaring.',
        position: 1,
        status: 'PUBLISHED',
        prerequisiteId: parent.id,
        unlockScore: 95,
      },
    });
    childId = child.id;
    expect((await page.request.get(`/api/v1/lessons/${child.id}`, { headers })).status()).toBe(403);
    const teacherSession = await page.request.post('/api/v1/auth/login', {
      headers: { Origin: origin },
      data: { email: teacher.email, password },
    });
    const { accessToken } = await teacherSession.json();
    const teacherHeaders = { Origin: origin, Authorization: `Bearer ${accessToken}` };
    const assignment = await page.request.post('/api/v1/teacher/assignments', {
      headers: teacherHeaders,
      data: {
        classId: group.id,
        lessonId: child.id,
        title: 'Qo‘shimcha mashq',
        deadline: new Date(Date.now() + 86400000).toISOString(),
      },
    });
    expect(assignment.status()).toBe(201);
    expect((await page.request.get(`/api/v1/lessons/${child.id}`, { headers })).status()).toBe(200);
    const report = await (
      await page.request.get(`/api/v1/teacher/classes/${group.id}`, { headers: teacherHeaders })
    ).json();
    expect(report.students[0]).toMatchObject({ completed: 2, mastered: 1 });
    expect(
      report.exerciseTypes.find(
        (t: { subject: string; type: string }) =>
          t.subject === 'Matematika' && t.type === 'FILL_GAP',
      ),
    ).toMatchObject({ answers: 1, correct: 0, accuracy: 0, struggling: 1 });
    await page.goto(`/teacher/classes/${group.id}`);
    await expect(
      page.getByRole('heading', { name: 'Mashq turlari bo‘yicha tahlil' }),
    ).toBeVisible();
    await expect(page.locator('.teacher-exercise-table')).toContainText('Bo‘shliqni to‘ldirish');
    await page.screenshot({
      path: info.outputPath('teacher-exercise-analysis.png'),
      fullPage: true,
    });
    await page.setViewportSize({ width: 390, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  } finally {
    await db.class.delete({ where: { id: group.id } });
    if (childId) await db.lesson.delete({ where: { id: childId } });
    await db.user.delete({ where: { id: teacher.id } });
  }
});
