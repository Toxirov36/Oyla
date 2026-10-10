import { randomBytes, randomUUID } from 'node:crypto';
import * as argon2 from 'argon2';
import type { Page } from '@playwright/test';
import { test, expect, db } from './fixtures';
import { lessonId, seedId } from '../../apps/api/prisma/curriculum/types';

async function fillLogin(page: Page, email: string, password: string) {
  await page.getByLabel('Email manzilingiz', { exact: true }).fill(email);
  await page.getByRole('textbox', { name: 'Parolingiz Parolni ko‘rsatish' }).fill(password);
  await page.getByRole('button', { name: 'Tizimga kirish', exact: true }).click();
}
test('teacher sees weak topics and unstarted learners, filters and assigns the recommended lesson', async ({
  page,
  learner,
}, info) => {
  const suffix = randomUUID();
  const password = `Teacher${randomBytes(14).toString('hex')}!`;
  const hash = await argon2.hash(password);
  const teacher = await db.user.create({
    data: {
      name: 'Topic teacher',
      email: `topic-teacher-${suffix}@example.uz`,
      passwordHash: hash,
      role: 'TEACHER',
      teacherAccess: true,
      teacher: { create: {} },
    },
  });
  const unstarted = await db.user.create({
    data: {
      name: 'Unstarted learner',
      email: `topic-new-${suffix}@example.uz`,
      passwordHash: hash,
      role: 'STUDENT',
      student: { create: { grade: 6 } },
    },
  });
  const group = await db.class.create({
    data: {
      name: `Topic class ${suffix.slice(0, 8)}`,
      grade: 6,
      teacherId: teacher.id,
      students: { create: [{ studentId: learner.user.id }, { studentId: unstarted.id }] },
    },
  });
  const weak = lessonId('mathematics', 6, 0);
  const weakTopic = seedId('curriculum:v2:mathematics:6:topic:0');
  const lesson = await db.lesson.findUniqueOrThrow({
    where: { id: weak },
    include: { topic: true },
  });
  await db.progress.createMany({
    data: [
      { userId: learner.user.id, lessonId: weak, bestScore: 40 },
      { userId: learner.user.id, lessonId: lessonId('mathematics', 6, 1), bestScore: 100 },
    ],
  });
  try {
    await page.context().clearCookies();
    await page.goto('/login');
    await fillLogin(page, teacher.email, password);
    await expect(page).toHaveURL(/\/teacher$/);
    await page.getByRole('link', { name: 'Sinfni ko‘rish' }).click();
    await expect(page.getByRole('heading', { name: 'Mavzular bo‘yicha tahlil' })).toBeVisible();
    await page.getByLabel('Faqat yordam kerak mavzular').check();
    const row = page.locator('.teacher-topic-table tbody tr');
    await expect(row).toHaveCount(1);
    await expect(row).toContainText(lesson.topic.title);
    await expect(row).toContainText('40%');
    await expect(row).toContainText('1 ta boshlamagan');
    await expect(page.locator('.teacher-help-row')).toHaveCount(1);
    await expect(page.locator('.teacher-help-row')).toContainText(learner.user.name);
    await page.screenshot({
      path: info.outputPath('teacher-topic-analysis.png'),
      animations: 'disabled',
    });
    const subject = page.getByRole('combobox', { name: 'Tahlil fanini tanlash' });
    await subject.fill('Ingliz');
    await page.getByRole('option', { name: 'Ingliz tili', exact: true }).click();
    await expect(page.getByText('Filtr bo‘yicha mavzular yo‘q')).toBeVisible();
    await subject.fill('Matematika');
    await page.getByRole('option', { name: 'Matematika', exact: true }).click();
    await row.getByRole('button', { name: 'Mashq tayinlash' }).click();
    const dialog = page.getByRole('dialog', { name: 'Yangi topshiriq' });
    await expect(dialog.getByRole('combobox', { name: 'Sinf', exact: true })).toHaveValue(
      `${group.name} · 6-sinf`,
    );
    await expect(dialog.getByRole('combobox', { name: 'Dars', exact: true })).toHaveValue(
      `Matematika / ${lesson.topic.title} / ${lesson.title}`,
    );
    await dialog.getByLabel('Topshiriq nomi').fill('Mavzu uchun mashq');
    await expect(dialog).toContainText('24 soat ichida');
    await dialog.getByRole('button', { name: 'Topshiriq berish', exact: true }).click();
    await expect(dialog).not.toBeVisible();
    const saved = await db.assignment.findFirstOrThrow({
      where: { classId: group.id, title: 'Mavzu uchun mashq' },
    });
    expect(saved.lessonId).toBe(weak);
    expect(saved.deadline.getTime() - saved.createdAt.getTime()).toBe(86400000);
    expect(weakTopic).toBe(lesson.topicId);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Mavzular bo‘yicha tahlil' })).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    await page.screenshot({
      path: info.outputPath('teacher-topic-mobile.png'),
      animations: 'disabled',
    });
  } finally {
    await db.class.deleteMany({ where: { id: group.id } });
    await db.user.deleteMany({ where: { id: { in: [teacher.id, unstarted.id] } } });
  }
});

test('private invite survives login, recipient accepts and Friends ranking updates on mobile', async ({
  page,
  browser,
  learner,
}, info) => {
  const password = `Friend${randomBytes(14).toString('hex')}!`;
  const peer = await db.user.create({
    data: {
      name: 'Friends browser peer',
      email: `friend-browser-${randomUUID()}@example.uz`,
      passwordHash: await argon2.hash(password),
      role: 'STUDENT',
      student: { create: { grade: 7 } },
    },
  });
  const peerContext = await browser.newContext({ baseURL: 'http://localhost:5180' });
  const peerPage = await peerContext.newPage();
  try {
    await db.xpTransaction.create({
      data: { userId: peer.id, amount: 42, type: 'TEST', sourceKey: `friend-browser:${peer.id}` },
    });
    await peerPage.goto('/login');
    await fillLogin(peerPage, peer.email, password);
    await expect(peerPage).toHaveURL(/\/dashboard$/);
    await peerPage.goto('/friends');
    const code = await peerPage.getByLabel('Taklif kodi', { exact: true }).inputValue();
    expect(code).toMatch(/^[A-Za-z0-9_-]{16}$/);
    await page.context().clearCookies();
    await page.goto(`/friends?code=${code}`);
    await expect(page).toHaveURL(/\/login$/);
    await fillLogin(page, learner.user.email, learner.password);
    await expect(page).toHaveURL(/\/friends\?code=/);
    await expect(page.getByLabel('Do‘stingizning taklif kodi')).toHaveValue(code);
    await page.getByRole('button', { name: 'So‘rov yuborish' }).click();
    await expect(page.getByRole('status')).toContainText('Do‘stlik so‘rovi yuborildi.');
    await peerPage.reload();
    await peerPage
      .getByRole('button', { name: `${learner.user.name} so‘rovini qabul qilish`, exact: true })
      .click();
    await expect(
      peerPage.locator('.friend-row').filter({ hasText: learner.user.name }),
    ).toContainText('Do‘stlikni tugatish');
    await page.reload();
    await expect(page.locator('.friend-row').filter({ hasText: peer.name })).toContainText(
      'Do‘stlikni tugatish',
    );
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: info.outputPath('friends-mobile.png'), animations: 'disabled' });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    await page.getByRole('link', { name: 'Do‘stlar reytingi', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Do‘stlar', exact: true })).toHaveClass(
      /btn-primary/,
    );
    const ranking = page.locator('.full-leaderboard');
    await expect(ranking).toContainText(peer.name);
    await expect(ranking).toContainText('42 XP');
    await expect(ranking).toContainText('0 XP');
    await expect(ranking).not.toContainText('Student');
    await page.screenshot({
      path: info.outputPath('friends-leaderboard-mobile.png'),
      animations: 'disabled',
    });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    await page.getByRole('link', { name: 'Do‘stlarimni boshqarish' }).click();
    await page
      .getByRole('button', { name: `${peer.name}: do‘stlikni tugatish`, exact: true })
      .click();
    await expect(page.getByText('Hali do‘stlar qo‘shilmagan')).toBeVisible();
    await page.getByRole('link', { name: 'Do‘stlar reytingi', exact: true }).click();
    await expect(page.locator('.full-leaderboard')).not.toContainText(peer.name);
  } finally {
    await peerContext.close();
    await db.user.deleteMany({ where: { id: peer.id } });
  }
});
