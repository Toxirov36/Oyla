import { randomUUID } from 'node:crypto';
import * as argon2 from 'argon2';
import { test, expect, db, origin } from './fixtures';
import { lessonId } from '../../apps/api/prisma/curriculum/types';

test('student sidebar opens an empty class page and anonymous visits require login', async ({
  page,
  learner,
}) => {
  await page.goto('/dashboard');
  await page.getByRole('link', { name: 'Mening sinfim', exact: true }).click();
  await expect(page).toHaveURL(/\/my-class$/);
  await expect(page.getByRole('heading', { name: 'Hali sinfga biriktirilmagansiz' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Mustaqil o‘rganish', exact: true })).toBeVisible();
  await page.context().clearCookies();
  await page.reload();
  await expect(page).toHaveURL(/\/login$/);
  expect(await db.classStudent.count({ where: { studentId: learner.user.id } })).toBe(0);
});

test('class page shows own assignments, switches classes and sends/accepts classmate requests on mobile', async ({
  page,
  request,
  learner,
}, info) => {
  const suffix = randomUUID();
  const hash = await argon2.hash(learner.password);
  const teacher = await db.user.create({
    data: {
      name: 'Sinf o‘qituvchisi',
      email: `class-teacher-${suffix}@example.uz`,
      passwordHash: hash,
      role: 'TEACHER',
      teacher: { create: {} },
      teacherAccess: true,
    },
  });
  const peer = await db.user.create({
    data: {
      name: 'Sinfdagi do‘stim',
      email: `class-peer-${suffix}@example.uz`,
      passwordHash: hash,
      role: 'STUDENT',
      student: { create: { grade: 6 } },
    },
  });
  const first = await db.class.create({
    data: {
      name: `Asosiy ${suffix.slice(0, 8)}`,
      grade: 6,
      teacherId: teacher.id,
      students: { create: [{ studentId: learner.user.id }, { studentId: peer.id }] },
    },
  });
  const second = await db.class.create({
    data: {
      name: `Qo‘shimcha ${suffix.slice(0, 8)}`,
      grade: 6,
      teacherId: teacher.id,
      students: { create: [{ studentId: learner.user.id }] },
    },
  });
  const assignments = [];
  for (const [title, pos, deadline] of [
    ['Bajarilgan sinf mashqi', 0, new Date(Date.now() + 2 * 86400000)],
    ['Yangi sinf mashqi', 1, new Date(Date.now() + 86400000)],
    ['Muddati o‘tgan mashq', 2, new Date(Date.now() - 86400000)],
  ] as const) {
    assignments.push(
      await db.assignment.create({
        data: { classId: first.id, title, lessonId: lessonId('mathematics', 6, pos), deadline },
      }),
    );
  }
  for (const [userId, score] of [
    [learner.user.id, 80],
    [peer.id, 100],
  ] as const) {
    const attempt = await db.attempt.create({
      data: {
        userId,
        lessonId: assignments[0]!.lessonId,
        questionIds: [],
        status: 'COMPLETED',
        score,
        completedAt: new Date(),
      },
    });
    await db.assignmentSubmission.create({
      data: { userId, attemptId: attempt.id, assignmentId: assignments[0]!.id, score, late: false },
    });
  }
  await db.xpTransaction.createMany({
    data: [
      {
        userId: learner.user.id,
        amount: 20,
        type: 'TEST',
        sourceKey: `class-browser:${learner.user.id}`,
      },
      { userId: peer.id, amount: 50, type: 'TEST', sourceKey: `class-browser:${peer.id}` },
    ],
  });
  try {
    const response = await request.post('/api/v1/auth/login', {
      headers: { Origin: origin },
      data: { email: peer.email, password: learner.password },
    });
    expect(response.status()).toBe(201);
    const peerToken = ((await response.json()) as { accessToken: string }).accessToken;
    const peerHeaders = { Origin: origin, Authorization: `Bearer ${peerToken}` };
    await page.goto('/dashboard');
    await page.getByRole('link', { name: 'Mening sinfim', exact: true }).click();
    await expect(page.locator('.student-class-summary')).toContainText(first.name);
    await expect(page.locator('.student-class-summary')).toContainText(teacher.name);
    await expect(page.locator('.student-class-summary')).toContainText('6-sinf · 2 o‘quvchi');
    await expect(page.locator('.classmate-list')).toContainText(peer.name);
    await expect(page.locator('.classmate-list')).not.toContainText(peer.email);
    const completed = page
      .locator('.assignment-card')
      .filter({ hasText: 'Bajarilgan sinf mashqi' });
    await expect(completed).toContainText('Bajarilgan');
    await expect(completed).toContainText('80%');
    await expect(completed).not.toContainText('100%');
    await expect(
      page.locator('.assignment-card').filter({ hasText: 'Yangi sinf mashqi' }),
    ).toContainText('Bajarish kerak');
    await expect(
      page.locator('.assignment-card').filter({ hasText: 'Muddati o‘tgan mashq' }),
    ).toContainText('Muddat o‘tgan');
    await page.screenshot({
      path: info.outputPath('student-class-desktop.png'),
      fullPage: true,
      animations: 'disabled',
    });
    await page
      .getByRole('button', { name: `${peer.name}: do‘stlikka taklif qilish`, exact: true })
      .click();
    await expect(page.getByRole('status')).toContainText('do‘stlik so‘rovi yuborildi');
    await expect(page.locator('.classmate-list')).toContainText('So‘rov yuborilgan');
    const connection = await db.friendship.findFirstOrThrow({
      where: { requestedById: learner.user.id },
    });
    expect(await db.notification.count({ where: { userId: peer.id, type: 'FRIEND' } })).toBe(1);
    const accept = await request.patch(`/api/v1/friends/requests/${connection.id}/accept`, {
      headers: peerHeaders,
      data: {},
    });
    expect(accept.status()).toBe(200);
    await page.reload();
    await expect(page.locator('.classmate-list')).toContainText('Do‘stingiz');
    await page.getByRole('link', { name: 'Sinf reytingi', exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`scope=class&classId=${first.id}`));
    await expect(page.getByRole('button', { name: 'Mening sinfim', exact: true })).toHaveClass(
      /btn-primary/,
    );
    await expect(page.locator('.full-leaderboard')).toContainText(peer.name);
    await expect(page.locator('.full-leaderboard')).toContainText('50 XP');
    await page.goto(`/my-class?classId=${first.id}`);
    const picker = page.getByRole('combobox', { name: 'Sinfni tanlash', exact: true });
    await picker.fill(second.name);
    await page.getByRole('option', { name: `${second.name} · 6-sinf`, exact: true }).click();
    await expect(page.locator('.student-class-summary')).toContainText(second.name);
    await expect(page.getByText('Hozircha topshiriqlar yo‘q', { exact: true })).toBeVisible();
    await expect(page.locator('.classmate-list')).not.toContainText(peer.name);
    await page.setViewportSize({ width: 390, height: 844 });
    await picker.fill(first.name);
    await page.getByRole('option', { name: `${first.name} · 6-sinf`, exact: true }).click();
    await expect(completed).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    await page.screenshot({
      path: info.outputPath('student-class-mobile.png'),
      fullPage: true,
      animations: 'disabled',
    });
    await page.getByRole('link', { name: 'Do‘stlik so‘rovlarini boshqarish' }).click();
    await page
      .getByRole('button', { name: `${peer.name}: do‘stlikni tugatish`, exact: true })
      .click();
    await expect(page.getByText('Hali do‘stlar qo‘shilmagan')).toBeVisible();
    await page.goBack();
    await expect(
      page.getByRole('button', { name: `${peer.name}: do‘stlikka taklif qilish`, exact: true }),
    ).toBeVisible();
    const incoming = await request.post('/api/v1/friends/classmates', {
      headers: peerHeaders,
      data: { classId: first.id, userId: learner.user.id },
    });
    expect(incoming.status()).toBe(201);
    await page.reload();
    await page
      .getByRole('button', { name: `${peer.name}: so‘rovni qabul qilish`, exact: true })
      .click();
    await expect(page.locator('.classmate-list')).toContainText('Do‘stingiz');
    await page.goto('/profile');
    await page.getByRole('link', { name: new RegExp(first.name) }).click();
    await expect(page).toHaveURL(new RegExp(`/my-class\\?classId=${first.id}`));
    await page.getByRole('link', { name: 'Topshiriqni boshlash' }).first().click();
    await expect(page).toHaveURL(/\/lessons\//);
  } finally {
    await db.class.deleteMany({ where: { id: { in: [first.id, second.id] } } });
    await db.user.deleteMany({ where: { id: { in: [teacher.id, peer.id] } } });
  }
});
