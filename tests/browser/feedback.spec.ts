import { randomUUID } from 'node:crypto';
import { test, expect, db, origin } from './fixtures';

test('detailed wrong feedback survives refresh and content edits; retries preserve the first score', async ({
  page,
  learner,
}, info) => {
  test.setTimeout(90000);
  page.setDefaultTimeout(10000);
  const subject = await db.subject.create({
    data: {
      slug: `feedback-${randomUUID()}`,
      title: 'Feedback fan',
      description: 'Izoh sinovi',
      status: 'PUBLISHED',
    },
  });
  const course = await db.course.create({
    data: { subjectId: subject.id, title: '6-sinf feedback', grade: 6, status: 'PUBLISHED' },
  });
  const topic = await db.topic.create({
    data: { courseId: course.id, title: 'Present Simple', status: 'PUBLISHED' },
  });
  const lesson = await db.lesson.create({
    data: {
      topicId: topic.id,
      title: 'Batafsil izoh sinovi',
      explanation: 'Present Simple gaplarini tekshiramiz.',
      example: 'He goes home at five.',
      status: 'PUBLISHED',
    },
  });
  const reason = 'She uchinchi shaxs birlik. Go o‘rniga goes ishlatiladi.';
  const headers = { Origin: origin, Authorization: `Bearer ${learner.token}` };
  try {
    const question = await db.question.create({
      data: {
        lessonId: lesson.id,
        text: 'To‘g‘ri gapni tanlang.',
        type: 'MULTIPLE_CHOICE',
        answer: 'correct',
        explanation: 'She bilan goes ishlatiladi.',
        status: 'PUBLISHED',
        options: {
          create: [
            { text: 'She go to school every day.', value: 'base', position: 0 },
            { text: 'She goes to school every day.', value: 'correct', position: 1 },
            { text: 'They goes to school every day.', value: 'plural', position: 2 },
          ],
        },
        feedback: {
          rule: 'Present Simple’da he, she, it bilan -s yoki -es qo‘shiladi.',
          steps: ['Egani topamiz: She.', 'Go o‘rniga goes ishlatamiz.'],
          example: 'He goes home at five.',
          wrongAnswers: [{ value: 'base', reason }],
        },
      },
    });
    await db.question.create({
      data: {
        lessonId: lesson.id,
        text: '2 + 2 = ?',
        type: 'NUMERICAL',
        answer: '4',
        explanation: '2 ga yana 2 qo‘shsak 4 bo‘ladi.',
        status: 'PUBLISHED',
        position: 1,
      },
    });
    await page.goto(`/lessons/${lesson.id}`);
    await page.getByRole('button', { name: 'Misolni ko‘rish', exact: true }).click();
    await page.getByRole('button', { name: 'Mashqni boshlash', exact: true }).click();
    await expect(
      page
        .locator('.exercise-player')
        .getByRole('heading', { name: 'To‘g‘ri gapni tanlang.', exact: true }),
    ).toBeVisible();
    const attempt = await db.attempt.findFirstOrThrow({
      where: { userId: learner.user.id, lessonId: lesson.id },
    });
    const before = await (
      await page.request.get(`/api/v1/attempts/${attempt.id}`, { headers })
    ).json();
    for (const q of before.questions) {
      expect(q.feedback).toBeUndefined();
      expect(q.answer).toBeUndefined();
      expect(q.grading).toBeUndefined();
      expect(q.explanation).toBeUndefined();
    }
    expect(before.answers).toEqual([]);
    expect(
      (
        await page.request.post(`/api/v1/attempts/${attempt.id}/feedback/continue`, {
          headers,
          data: { questionId: question.id },
        })
      ).status(),
    ).toBe(400);
    const player = page.locator('.exercise-player');
    await player.getByRole('radio').nth(0).check();
    await player.getByRole('button', { name: 'Javobni tekshirish' }).click();
    const panel = player.getByRole('status', { name: 'Javob izohi' });
    for (const heading of [
      'Sizning javobingiz',
      'Nima uchun xato?',
      'Qoida',
      'To‘g‘ri yechim va misol',
    ])
      await expect(panel.getByRole('heading', { name: heading, exact: true })).toBeVisible();
    await expect(panel.getByText(reason, { exact: true })).toBeVisible();
    await expect(panel.getByText('He goes home at five.', { exact: true })).toBeVisible();
    await db.question.update({
      where: { id: question.id },
      data: {
        answer: 'plural',
        feedback: { rule: 'Changed after the attempt', example: 'Changed example' },
        version: { increment: 1 },
      },
    });
    await page.setViewportSize({ width: 360, height: 800 });
    await page.reload();
    await expect(panel.getByText(reason, { exact: true })).toBeVisible();
    await expect(panel.getByText('She goes to school every day.', { exact: true })).toBeVisible();
    await expect(player.getByRole('radio').nth(0)).toBeChecked();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({
      path: info.outputPath('detailed-feedback-mobile.png'),
      fullPage: true,
    });
    const restored = await (
      await page.request.get(`/api/v1/attempts/${attempt.id}`, { headers })
    ).json();
    expect(restored.resumeQuestionId).toBe(question.id);
    expect(restored.answers[0].feedback.reason).toBe(reason);
    expect(restored.questions[1].feedback).toBeUndefined();
    await panel.getByRole('button', { name: 'Yana urinib ko‘rish' }).click();
    await player.getByRole('radio').nth(1).check();
    await player.getByRole('button', { name: 'Javobni tekshirish' }).click();
    await expect(panel.getByText('Ajoyib! To‘g‘ri javob.', { exact: true })).toBeVisible();
    await page.reload();
    await expect(panel.getByText('Ajoyib! To‘g‘ri javob.', { exact: true })).toBeVisible();
    const stored = await db.attemptAnswer.findUniqueOrThrow({
      where: { attemptId_questionId: { attemptId: attempt.id, questionId: question.id } },
    });
    expect(stored.value).toBe('base');
    expect(stored.correct).toBe(false);
    await player.getByRole('button', { name: 'Keyingi savol', exact: true }).click();
    await page.reload();
    await expect(player.getByRole('heading', { name: '2 + 2 = ?', exact: true })).toBeVisible();
    await player.getByLabel('Javobingiz', { exact: true }).fill('4');
    await player.getByRole('button', { name: 'Javobni tekshirish' }).click();
    await player.getByRole('button', { name: 'Natijani ko‘rish', exact: true }).click();
    await expect(page.getByText('1 / 2 to‘g‘ri javob', { exact: true })).toBeVisible();
    const result = await (
      await page.request.post(`/api/v1/attempts/${attempt.id}/complete`, { headers })
    ).json();
    expect(result.score).toBe(50);
    expect(
      await db.xpTransaction.count({
        where: { userId: learner.user.id, sourceKey: `lesson:${lesson.id}` },
      }),
    ).toBe(1);
  } finally {
    await db.attempt.deleteMany({ where: { lessonId: lesson.id } });
    await db.progress.deleteMany({ where: { lessonId: lesson.id } });
    await db.question.deleteMany({ where: { lessonId: lesson.id } });
    await db.lesson.delete({ where: { id: lesson.id } });
    await db.topic.delete({ where: { id: topic.id } });
    await db.course.delete({ where: { id: course.id } });
    await db.subject.delete({ where: { id: subject.id } });
  }
});
