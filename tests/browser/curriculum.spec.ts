import { test, expect, db, origin } from './fixtures';
import { lessonId } from '../../apps/api/prisma/curriculum/types';
import type { Subject } from '../../apps/web/src/lib/types';

test.describe('grade 5 catalog', () => {
  test.use({ learnerGrade: 5 });
  test('shows grade 5 material and blocks a grade 7 lesson', async ({ page, learner }) => {
    await page.goto('/subjects');
    await page.getByRole('link', { name: 'Darslarni ko‘rish' }).first().click();
    await expect(page.getByRole('heading', { name: '5-sinf Matematika' })).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Natural sonlar va xona qiymati' }),
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Bir noma’lumli chiziqli tenglama' }),
    ).toHaveCount(0);
    const forcedGrade = await page.request.get('/api/v1/subjects?grade=7', {
      headers: { Authorization: `Bearer ${learner.token}` },
    });
    const subjects = (await forcedGrade.json()) as Subject[];
    expect(
      subjects.flatMap((subject) => subject.courses).every((course) => course.grade === 5),
    ).toBe(true);
    const inaccessible = await page.request.get(
      `/api/v1/lessons/${lessonId('mathematics', 7, 1)}`,
      { headers: { Authorization: `Bearer ${learner.token}` } },
    );
    expect(inaccessible.status()).toBe(404);
  });
});
test.describe('grade 7 catalog', () => {
  test.use({ learnerGrade: 7 });
  test('shows grade 7 algebra instead of the grade 5 sequence', async ({ page, learner }) => {
    await page.goto('/subjects');
    await page.getByRole('link', { name: 'Darslarni ko‘rish' }).first().click();
    await expect(page.getByRole('heading', { name: '7-sinf Matematika' })).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Bir noma’lumli chiziqli tenglama' }),
    ).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Natural sonlar va xona qiymati' })).toHaveCount(
      0,
    );
    expect(learner.user.student?.grade).toBe(7);
  });
});

for (const { wrongFirst, position, label, mobile } of [
  { wrongFirst: false, position: 0, label: 'correct answers', mobile: false },
  { wrongFirst: true, position: 0, label: 'educational retry', mobile: false },
  { wrongFirst: false, position: 3, label: 'negative numbers on mobile', mobile: true },
]) {
  test(`real lesson grading, ${label}, result and profile XP`, async ({ page, learner }) => {
    if (mobile) await page.setViewportSize({ width: 390, height: 844 });
    const id = lessonId('mathematics', 6, position);
    const questions = await db.question.findMany({
      where: { lessonId: id, status: 'PUBLISHED' },
      orderBy: { position: 'asc' },
      include: { options: { orderBy: { position: 'asc' } } },
    });
    expect(questions).toHaveLength(6);
    await page.goto(`/lessons/${id}`);
    await page.getByRole('button', { name: 'Misolni ko‘rish', exact: true }).click();
    await page.getByRole('button', { name: 'Mashqni boshlash', exact: true }).click();
    for (const [index, question] of questions.entries()) {
      await expect(page.getByRole('heading', { name: question.text, exact: true })).toBeVisible();
      const answer = async () => {
        if (question.type === 'MULTIPLE_CHOICE')
          await page
            .getByRole('radio')
            .nth(question.options.findIndex((option) => option.value === question.answer))
            .check();
        else if (question.type === 'TRUE_FALSE')
          await page
            .getByRole('radio')
            .nth(question.answer === 'true' ? 0 : 1)
            .check();
        else
          await page.getByLabel('Javobingiz', { exact: true }).fill(question.answer.split('|')[0]!);
      };
      if (wrongFirst && index === 0) {
        await page
          .getByRole('radio')
          .nth(question.options.findIndex((option) => option.value !== question.answer))
          .check();
        await page.getByRole('button', { name: 'Javobni tekshirish' }).click();
        await expect(
          page.getByText('Yaqin keldingiz! Keling, yechimni ko‘ramiz.', { exact: true }),
        ).toBeVisible();
        await page.getByRole('button', { name: 'Yana sinab ko‘rish' }).click();
      }
      await answer();
      await page.getByRole('button', { name: 'Javobni tekshirish' }).click();
      await expect(page.getByText('Ajoyib! To‘g‘ri javob.', { exact: true })).toBeVisible();
      await page
        .getByRole('button', {
          name: index === questions.length - 1 ? 'Natijani ko‘rish' : 'Keyingi savol',
          exact: true,
        })
        .click();
    }
    await expect(page.getByRole('heading', { name: 'Ajoyib natija!' })).toBeVisible();
    const correct = wrongFirst ? 5 : 6;
    const rules = await db.xpRule.findMany();
    const correctXp = rules.find((rule) => rule.key === 'CORRECT_ANSWER')!.amount;
    const lessonXp = rules.find((rule) => rule.key === 'LESSON_COMPLETED')!.amount;
    const earnedXp =
      lessonXp +
      questions
        .filter((_, index) => !wrongFirst || index > 0)
        .reduce((sum, q) => sum + (q.xp ?? correctXp), 0);
    const progress = await db.progress.findUniqueOrThrow({
      where: { userId_lessonId: { userId: learner.user.id, lessonId: id } },
    });
    expect(progress.bestScore).toBe(Math.round((correct / 6) * 100));
    expect(
      await db.xpTransaction.count({
        where: { userId: learner.user.id, sourceKey: `lesson:${id}` },
      }),
    ).toBe(1);
    await page.getByRole('link', { name: 'Profilimni ochish' }).click();
    await expect(page.getByText(`${earnedXp.toLocaleString()} XP`, { exact: true })).toBeVisible();
    const profile = await page.request.get('/api/v1/users/me/profile', {
      headers: { Authorization: `Bearer ${learner.token}`, Origin: origin },
    });
    const snapshot = (await profile.json()) as {
      student: { completedLessons: number; totalXp: number; badges: number };
    };
    expect(snapshot.student.completedLessons).toBe(1);
    expect(snapshot.student.totalXp).toBe(earnedXp);
    expect(snapshot.student.badges).toBeGreaterThanOrEqual(1);
  });
}
