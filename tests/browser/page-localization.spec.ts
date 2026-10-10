import type { Page } from '@playwright/test';
import { test, expect, db, origin } from './fixtures';

async function language(page: Page, locale: 'ru' | 'en') {
  await page.locator('.language-switcher-trigger').click();
  await page.getByRole('menuitem', { name: locale === 'ru' ? /^Русский/ : /^English/ }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', locale);
  await expect(page.locator('.language-switcher-trigger')).toBeEnabled();
}

test('admin page bodies, tables and editors follow Russian and English', async ({
  page,
  learner,
}, info) => {
  await db.user.update({
    where: { id: learner.user.id },
    data: { role: 'ADMIN', teacherAccess: true, teacher: { create: {} } },
  });
  const login = await page.request.post('/api/v1/auth/login', {
    headers: { Origin: origin },
    data: { email: learner.user.email, password: learner.password },
  });
  expect(login.status()).toBe(201);
  await page.goto('/admin');
  await language(page, 'ru');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Bilify: обзор');
  await expect(page.locator('main')).toContainText('Опубликованные уроки');
  await expect(
    page.getByRole('heading', { name: 'Последняя учебная активность', exact: true }),
  ).toBeVisible();
  await expect(page.locator('main')).not.toContainText('Haqiqiy faoliyat');
  await page.screenshot({ path: info.outputPath('admin-russian.png'), fullPage: true });
  for (const [path, ru, en] of [
    ['/admin/users', 'Пользователи', 'Users'],
    ['/admin/content', 'Библиотека знаний', 'Learning library'],
    ['/admin/gamification', 'Поощряйте обучение', 'Encourage learning'],
    ['/admin/classes', 'Классы и учителя', 'Classes and teachers'],
    ['/admin/avatars', 'Каталог аватаров', 'Avatar catalog'],
    ['/admin/videos', 'Видеоуроки', 'Video lessons'],
    ['/admin/exercises', '20 способов учиться', '20 ways to learn'],
  ]) {
    await page.goto(path!);
    await language(page, 'ru');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(ru!);
    await language(page, 'en');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(en!);
  }
  await page.goto('/admin/users');
  await page.getByRole('button', { name: 'User', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByLabel('Full name', { exact: true })).toBeVisible();
  await expect(dialog.getByRole('combobox', { name: 'Role', exact: true })).toHaveValue('Student');
  await dialog.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(dialog.getByText('Enter a valid email address.', { exact: true })).toBeVisible();
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  await page.goto('/admin/content');
  await page.getByRole('button', { name: 'Add subject', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('Short name (Latin letters)');
  await expect(page.getByRole('combobox', { name: 'Status', exact: true })).toHaveValue('Draft');
});

test('student pages render their body text in both additional languages', async ({
  page,
  learner,
}) => {
  await page.goto('/dashboard');
  await expect(page.locator('.user-profile-nav')).toContainText(learner.user.name);
  for (const [path, ru, en] of [
    ['/friends', 'Мои друзья', 'My friends'],
    ['/my-class', 'Мой класс', 'My class'],
    ['/progress', 'Мой прогресс', 'My progress'],
    ['/badges', 'Мои значки', 'My badges'],
    ['/leaderboard', 'Рейтинг знатоков', 'Learner rankings'],
    ['/assignments', 'Мои задания', 'My assignments'],
    ['/notifications', 'Уведомления', 'Notifications'],
    ['/games', 'Игры', 'Games'],
    ['/games/memory', 'Найди пару: сад знаний', 'Find a pair: knowledge garden'],
    ['/brain-ring', 'Brain Ring', 'Brain Ring'],
    ['/videos', 'Видеоуроки', 'Video lessons'],
  ]) {
    await page.goto(path!);
    await language(page, 'ru');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(ru!);
    await language(page, 'en');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(en!);
  }
  await page.goto('/badges');
  await expect(page.getByRole('heading', { name: 'First step', exact: true })).toBeVisible();
  await expect(page.locator('main')).toContainText('Complete your first lesson.');
});

test('teacher pages and assignment forms are localized', async ({ page, learner }) => {
  await db.user.update({
    where: { id: learner.user.id },
    data: { role: 'TEACHER', teacherAccess: true, teacher: { create: {} } },
  });
  const group = await db.class.create({
    data: { name: 'Locale class', grade: 6, teacherId: learner.user.id },
  });
  try {
    const login = await page.request.post('/api/v1/auth/login', {
      headers: { Origin: origin },
      data: { email: learner.user.email, password: learner.password },
    });
    expect(login.status()).toBe(201);
    await page.goto('/teacher');
    await language(page, 'ru');
    await expect(page.locator('main')).toContainText('Мои классы');
    await expect(page.locator('main')).toContainText('На основе реальных учебных результатов');
    await page.goto(`/teacher/classes/${group.id}`);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Класс Locale class');
    await expect(page.locator('main')).toContainText('Анализ по темам');
    await language(page, 'en');
    await expect(page.locator('main')).toContainText('Topic analysis');
    await page.goto('/teacher/assignments');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Assignments and results');
    await page.getByRole('button', { name: 'Assign task', exact: true }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByLabel('Assignment title', { exact: true })).toBeVisible();
    await expect(dialog).toContainText('Students have 24 hours after the assignment is created.');
    await dialog.getByRole('button', { name: 'Assign task', exact: true }).click();
    await expect(dialog.getByText('Select a lesson.', { exact: true })).toBeVisible();
  } finally {
    await db.class.delete({ where: { id: group.id } });
  }
});
