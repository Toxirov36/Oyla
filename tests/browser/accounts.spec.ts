import { randomBytes, randomUUID } from 'node:crypto';
import * as argon2 from 'argon2';
import type { Page } from '@playwright/test';
import { test, expect, db } from './fixtures';

async function login(page: Page, email: string, password: string) {
  await page.context().clearCookies();
  await page.goto('/login');
  await page.getByLabel('Email manzilingiz', { exact: true }).fill(email);
  await page.getByRole('textbox', { name: 'Parolingiz Parolni ko‘rsatish' }).fill(password);
  await page.getByRole('button', { name: 'Tizimga kirish', exact: true }).click();
}

test('profile password change logs out and only the new password signs in', async ({
  page,
  learner,
}) => {
  await login(page, learner.user.email, learner.password);
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.goto('/profile');
  const nextPassword = `Changed${randomBytes(12).toString('hex')}!`;
  await page.getByLabel('Hozirgi parol', { exact: true }).fill(learner.password);
  await page.getByLabel('Yangi parol', { exact: true }).fill(nextPassword);
  await page.getByLabel('Yangi parolni takrorlang', { exact: true }).fill('Mismatch');
  await page.getByRole('button', { name: 'Parolni yangilash' }).click();
  await expect(page.getByRole('alert')).toContainText('Parollar bir xil bo‘lsin.');
  await page.getByLabel('Yangi parolni takrorlang', { exact: true }).fill(nextPassword);
  await page.getByRole('button', { name: 'Parolni yangilash' }).click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('status')).toContainText('Parolingiz o‘zgartirildi.');
  await login(page, learner.user.email, learner.password);
  await expect(page.getByRole('alert')).toContainText('Email yoki parol noto‘g‘ri.');
  await page.getByRole('textbox', { name: 'Parolingiz Parolni ko‘rsatish' }).fill(nextPassword);
  await page.getByRole('button', { name: 'Tizimga kirish', exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
});

test('mobile notifications support unread filtering, marking and pagination', async ({
  page,
  learner,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await db.notification.createMany({
    data: Array.from({ length: 23 }, (_, index) => ({
      userId: learner.user.id,
      title: `Browser news ${index}`,
      body: `Yangi topshiriq ${index}`,
      link: '/assignments',
    })),
  });
  await login(page, learner.user.email, learner.password);
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.getByRole('link', { name: /Bildirishnomalarni ochish: 23/ }).click();
  await expect(page.getByRole('heading', { name: 'Bildirishnomalar', exact: true })).toBeVisible();
  await expect(page.locator('.notification-item')).toHaveCount(20);
  await page.getByRole('button', { name: 'Keyingi sahifa', exact: true }).click();
  await expect(page.locator('.notification-item')).toHaveCount(3);
  await page.getByRole('button', { name: 'Oldingi sahifa', exact: true }).click();
  await page.getByRole('checkbox', { name: 'Faqat o‘qilmaganlar' }).check();
  await page
    .getByRole('button', { name: /Browser news.*o‘qilgan deb belgilash/ })
    .first()
    .click();
  await expect(page.getByRole('link', { name: /Bildirishnomalarni ochish: 22/ })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.getByRole('button', { name: 'Barchasini o‘qish' }).click();
  await expect(
    page.getByRole('heading', { name: 'O‘qilmagan bildirishnomalar yo‘q' }),
  ).toBeVisible();
  expect(await db.notification.count({ where: { userId: learner.user.id, readAt: null } })).toBe(0);
});

test('admin edits existing roles, issues a one-time reset link and the user enters both panels', async ({
  page,
  learner,
}) => {
  const managerPassword = `Manager${randomBytes(12).toString('hex')}!`;
  const manager = await db.user.create({
    data: {
      name: 'Browser Manager',
      email: `manager-${randomUUID()}@example.uz`,
      role: 'ADMIN',
      passwordHash: await argon2.hash(managerPassword),
    },
  });
  try {
    await login(page, manager.email, managerPassword);
    await expect(page).toHaveURL(/\/admin$/);
    await page.goto(`/admin/users?search=${encodeURIComponent(manager.email)}`);
    await page.getByRole('button', { name: `${manager.name} tahrirlash`, exact: true }).click();
    await page.getByLabel('Ism va familiya', { exact: true }).fill('Browser Manager Updated');
    await page.getByRole('button', { name: 'Saqlash', exact: true }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible();
    expect((await db.user.findUniqueOrThrow({ where: { id: manager.id } })).name).toBe(
      'Browser Manager Updated',
    );
    await page.goto(`/admin/users?search=${encodeURIComponent(learner.user.email)}`);
    await page
      .getByRole('button', { name: `${learner.user.name} tahrirlash`, exact: true })
      .click();
    await page.getByLabel('Rol', { exact: true }).selectOption('TEACHER');
    await page.getByRole('button', { name: 'Saqlash', exact: true }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible();
    expect((await db.user.findUniqueOrThrow({ where: { id: learner.user.id } })).role).toBe(
      'TEACHER',
    );
    await page
      .getByRole('button', { name: `${learner.user.name} tahrirlash`, exact: true })
      .click();
    await page.getByLabel('Rol', { exact: true }).selectOption('ADMIN');
    await page.getByRole('checkbox', { name: 'O‘qituvchi paneli ham ochilsin' }).check();
    await page.getByRole('button', { name: 'Saqlash', exact: true }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible();
    await page
      .getByRole('button', { name: `${learner.user.name} parolini tiklash`, exact: true })
      .click();
    await page.getByRole('button', { name: 'Bir martalik havola yaratish' }).click();
    const resetUrl = await page.getByLabel('Tiklash havolasi', { exact: true }).inputValue();
    expect(resetUrl).toContain('/reset-password#token=');
    await page.context().clearCookies();
    await page.goto(resetUrl);
    await expect(page.getByRole('heading', { name: 'Yangi parol yarating' })).toBeVisible();
    expect(page.url()).not.toContain('#token=');
    const recoveredPassword = `Recovered${randomBytes(12).toString('hex')}!`;
    await page.getByLabel('Yangi parol', { exact: true }).fill(recoveredPassword);
    await page.getByLabel('Yangi parolni takrorlang', { exact: true }).fill(recoveredPassword);
    await page.getByRole('button', { name: 'Parolni tiklash', exact: true }).click();
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('status')).toContainText('Parolingiz tiklandi.');
    await login(page, learner.user.email, recoveredPassword);
    await expect(page).toHaveURL(/\/admin$/);
    await page.goto('/teacher');
    await expect(page.getByRole('heading', { name: 'Har bir o‘quvchi e’tiborda.' })).toBeVisible();
    await page.goto(resetUrl);
    await page.getByLabel('Yangi parol', { exact: true }).fill(recoveredPassword);
    await page.getByLabel('Yangi parolni takrorlang', { exact: true }).fill(recoveredPassword);
    await page.getByRole('button', { name: 'Parolni tiklash', exact: true }).click();
    await expect(page.getByRole('alert')).toContainText('Tiklash havolasi yaroqsiz');
  } finally {
    await db.user.deleteMany({ where: { id: manager.id } });
  }
});

test('forgot-password form sends a generic recovery request', async ({ page, learner }) => {
  await page.context().clearCookies();
  await page.goto('/login');
  await page.getByRole('link', { name: 'Parolni unutdingizmi?' }).click();
  await expect(page.getByRole('heading', { name: 'Parolni unutdingizmi?' })).toBeVisible();
  await page.getByLabel('Email manzilingiz', { exact: true }).fill(learner.user.email);
  await page.getByRole('button', { name: 'Tiklashni so‘rash' }).click();
  await expect(page.getByRole('status')).toContainText('Agar faol hisob mavjud bo‘lsa');
  expect(
    await db.notification.count({
      where: { link: `/admin/users?search=${encodeURIComponent(learner.user.email)}` },
    }),
  ).toBeGreaterThan(0);
});
