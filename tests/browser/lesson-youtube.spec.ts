import { randomUUID } from 'node:crypto';
import { test, expect, db, origin } from './fixtures';

test('admin creates a video lesson without timing fields and the lesson opens with video', async ({
  page,
  learner,
}) => {
  await db.user.update({ where: { id: learner.user.id }, data: { role: 'ADMIN' } });
  const subject = await db.subject.create({
    data: {
      slug: `video-lesson-${randomUUID()}`,
      title: 'Video dars sinovi',
      description: 'Video dars yaratish sinovi',
      status: 'PUBLISHED',
    },
  });
  const course = await db.course.create({
    data: { subjectId: subject.id, title: 'Video kurs', grade: 6, status: 'PUBLISHED' },
  });
  const topic = await db.topic.create({
    data: { courseId: course.id, title: 'Video mavzu', status: 'PUBLISHED' },
  });

  try {
    const login = await page.request.post('/api/v1/auth/login', {
      headers: { Origin: origin },
      data: { email: learner.user.email, password: learner.password },
    });
    expect(login.status()).toBe(201);
    await page.goto('/admin/content');

    const topicNode = page.locator('.content-topic').filter({ hasText: topic.title });
    await topicNode.getByRole('button', { name: 'Dars', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Dars yaratish' });
    await expect(dialog.getByLabel('YouTube video havolasi')).toBeVisible();
    for (const removed of [
      'Tushuntirish',
      'Yechilgan misol',
      'Davomiylik (daqiqa)',
      'Oldingi darsdagi minimal natija (%)',
      'Darsni o‘zlashtirish uchun minimal natija (%)',
      'Tartib raqami',
    ])
      await expect(dialog.getByText(removed, { exact: true })).toHaveCount(0);

    await dialog.getByLabel('Nomi', { exact: true }).fill('YouTube orqali Python');
    await dialog
      .getByLabel('YouTube video havolasi')
      .fill('https://www.youtube.com/watch?v=M7lc1UVf-VE');
    await dialog.getByRole('button', { name: 'Saqlash', exact: true }).click();
    await expect(dialog).toBeHidden();

    const lesson = await db.lesson.findFirstOrThrow({
      where: { topicId: topic.id, title: 'YouTube orqali Python' },
    });
    expect(lesson.youtubeId).toBe('M7lc1UVf-VE');
    expect(lesson.explanation).toBe('');
    expect(lesson.example).toBe('');
    expect(lesson.duration).toBe(0);
    expect(lesson.position).toBe(0);
    expect(lesson.masteryScore).toBe(70);
    expect(lesson.unlockScore).toBe(70);

    await db.question.create({
      data: {
        lessonId: lesson.id,
        text: '2 + 2 = ?',
        type: 'MULTIPLE_CHOICE',
        answer: '4',
        explanation: '2 + 2 = 4',
        status: 'PUBLISHED',
        options: { create: [{ text: '4', value: '4', position: 0 }, { text: '5', value: '5', position: 1 }] },
      },
    });
    await db.lesson.update({ where: { id: lesson.id }, data: { status: 'PUBLISHED' } });
    await db.user.update({ where: { id: learner.user.id }, data: { role: 'STUDENT' } });
    const studentLogin = await page.request.post('/api/v1/auth/login', {
      headers: { Origin: origin },
      data: { email: learner.user.email, password: learner.password },
    });
    expect(studentLogin.status()).toBe(201);
    await page.goto(`/lessons/${lesson.id}`);
    await expect(page.getByRole('button', { name: 'Video', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Misol', exact: true })).toHaveCount(0);
    await page.getByRole('button', { name: 'Videoni ochish' }).click();
    await expect(page.locator('iframe')).toHaveAttribute(
      'src',
      'https://www.youtube-nocookie.com/embed/M7lc1UVf-VE?rel=0',
    );
    await page.getByRole('button', { name: 'Mashqni boshlash' }).click();
    await expect(page.getByText('2 + 2 = ?', { exact: true })).toBeVisible();
  } finally {
    await db.attempt.deleteMany({ where: { lesson: { topicId: topic.id } } });
    await db.question.deleteMany({ where: { lesson: { topicId: topic.id } } });
    await db.lesson.deleteMany({ where: { topicId: topic.id } });
    await db.topic.delete({ where: { id: topic.id } });
    await db.course.delete({ where: { id: course.id } });
    await db.subject.delete({ where: { id: subject.id } });
  }
});
