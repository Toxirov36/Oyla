import type { Page } from '@playwright/test';
import { test, expect, db } from './fixtures';

async function login(page: Page, email: string, password: string) {
  await page.context().clearCookies();
  await page.goto('/login');
  await page.getByLabel('Email manzilingiz', { exact: true }).fill(email);
  await page.getByRole('textbox', { name: 'Parolingiz Parolni ko‘rsatish' }).fill(password);
  await page.getByRole('button', { name: 'Tizimga kirish', exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}
async function seed(userId: string) {
  const now = Date.now();
  return db.notification.createManyAndReturn({
    data: [
      {
        userId,
        type: 'ASSIGNMENT',
        title: 'Matematika topshirig‘i',
        body: 'Kasrlarni qo‘shish bo‘yicha yangi mashq tayinlandi. Mustaqil bilimlaringizni sinab ko‘ring.',
        link: '/assignments',
        createdAt: new Date(now - 5 * 60000),
      },
      {
        userId,
        type: 'BADGE',
        title: 'Yangi nishon qo‘lga kiritildi',
        body: 'Birinchi darsni yakunladingiz. Bilim yo‘lidagi birinchi yutug‘ingiz bilan!',
        link: '/badges',
        createdAt: new Date(now - 2 * 3600000),
      },
      {
        userId,
        type: 'SECURITY',
        title: 'Hisob xavfsizligi yangilandi',
        body: 'Hisobingizdagi xavfsizlik sozlamalari yangilandi.',
        link: '/profile',
        createdAt: new Date(now - 86400000),
        readAt: new Date(now - 80000000),
      },
      {
        userId,
        type: 'SYSTEM',
        title: 'O‘quv rejangiz yangilandi',
        body: 'Mavzular ro‘yxatida yangi darslar mavjud. Keyingi qadamni tanlang.',
        link: '/subjects',
        createdAt: new Date(now - 3 * 86400000),
      },
    ],
  });
}
test('desktop popover supports keyboard, read/unread, deletion and related navigation', async ({
  page,
  learner,
}, info) => {
  const items = await seed(learner.user.id);
  await login(page, learner.user.email, learner.password);
  const bell = page.getByRole('button', { name: /Bildirishnomalarni ochish: 3/ });
  await bell.focus();
  await page.keyboard.press('Enter');
  const panel = page.getByRole('dialog', { name: 'Bildirishnomalar paneli' });
  await expect(panel.locator('.notice-item')).toHaveCount(4);
  const width = (await panel.boundingBox())!.width;
  expect(width).toBeGreaterThanOrEqual(380);
  expect(width).toBeLessThanOrEqual(420);
  await panel.screenshot({ path: info.outputPath('desktop-popover.png'), animations: 'disabled' });
  await page.keyboard.press('Escape');
  await expect(panel).not.toBeVisible();
  await expect(bell).toBeFocused();
  await bell.click();
  await panel.getByRole('tab', { name: 'O‘qilmagan', exact: true }).click();
  await expect(panel.locator('.notice-item')).toHaveCount(3);
  await panel.getByRole('button', { name: 'Matematika topshirig‘i: amallar', exact: true }).click();
  await page.getByRole('menuitem', { name: 'O‘qilgan deb belgilash', exact: true }).click();
  await expect(panel.locator('.notice-item')).toHaveCount(2);
  await panel.getByRole('tab', { name: 'Barchasi', exact: true }).click();
  await panel.getByRole('button', { name: 'Matematika topshirig‘i: amallar', exact: true }).click();
  await page.getByRole('menuitem', { name: 'O‘qilmagan deb belgilash', exact: true }).click();
  await expect(page.getByRole('button', { name: /Bildirishnomalarni ochish: 3/ })).toBeVisible();
  await panel
    .getByRole('button', { name: 'O‘quv rejangiz yangilandi: amallar', exact: true })
    .click();
  await page.getByRole('menuitem', { name: 'O‘chirish', exact: true }).click();
  await expect(panel.locator('.notice-item')).toHaveCount(3);
  await panel
    .getByRole('link', { name: 'Matematika topshirig‘i, o‘qilmagan', exact: true })
    .click();
  await expect(page).toHaveURL(/\/assignments$/);
  await expect(panel).not.toBeVisible();
  expect(
    (await db.notification.findUniqueOrThrow({ where: { id: items[0].id } })).readAt,
  ).not.toBeNull();
});
test('mobile sheet has 44px targets and links to grouped searchable notifications', async ({
  page,
  learner,
}, info) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await seed(learner.user.id);
  await db.notification.createMany({
    data: Array.from({ length: 9 }, (_, index) => ({
      userId: learner.user.id,
      type: 'SYSTEM',
      title: `Qo‘shimcha yangilik ${index}`,
      body: 'O‘quv rejangizga oid ma’lumot',
      createdAt: new Date(Date.now() - 4 * 86400000),
    })),
  });
  await login(page, learner.user.email, learner.password);
  await expect(page.locator('.notice-bell-badge')).toHaveText('9+');
  await page.getByRole('button', { name: /Bildirishnomalarni ochish: 12/ }).click();
  const sheet = page.getByRole('dialog', { name: 'Bildirishnomalar', exact: true });
  await expect(sheet.locator('.notice-item')).toHaveCount(10);
  const box = (await sheet.boundingBox())!;
  expect(Math.round(box.width)).toBe(390);
  expect(Math.round(box.height)).toBe(844);
  expect(
    (await sheet.getByRole('button', { name: 'Bildirishnomalar panelini yopish' }).boundingBox())!
      .height,
  ).toBeGreaterThanOrEqual(44);
  expect(
    await sheet
      .locator('.notice-tab-panel')
      .evaluate((node) => node.scrollHeight > node.clientHeight),
  ).toBe(true);
  await sheet.screenshot({ path: info.outputPath('mobile-sheet.png'), animations: 'disabled' });
  await sheet.getByRole('link', { name: 'Barcha bildirishnomalarni ko‘rish' }).click();
  await expect(page).toHaveURL(/\/notifications$/);
  await expect(page.getByRole('heading', { name: 'Avvalroq', exact: true })).toBeVisible();
  await page.getByRole('combobox', { name: 'Bildirishnoma turi' }).selectOption('ASSIGNMENT');
  await expect(page.locator('.notice-item')).toHaveCount(1);
  await page.getByRole('textbox', { name: 'Bildirishnomalarni qidirish' }).fill('Mavjud emas');
  await expect(page.getByRole('heading', { name: 'Hozircha bildirishnomalar yo‘q' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});
test('loading skeleton, retry and optimistic rollback handle API failures', async ({
  page,
  learner,
}) => {
  const items = await seed(learner.user.id);
  await login(page, learner.user.email, learner.password);
  let release: () => void = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  let failing = true;
  await page.route(
    (url) => url.pathname === '/api/v1/notifications',
    async (route) => {
      if (failing) {
        await gate;
        await route.fulfill({ status: 503, json: { message: 'Aloqada muammo.' } });
      } else await route.continue();
    },
  );
  await page.getByRole('button', { name: /Bildirishnomalarni ochish/ }).click();
  const panel = page.getByRole('dialog', { name: 'Bildirishnomalar paneli' });
  await expect(panel.getByRole('status', { name: 'Bildirishnomalar yuklanmoqda' })).toBeVisible();
  release();
  await expect(panel.getByRole('heading', { name: 'Bildirishnomalar yuklanmadi' })).toBeVisible();
  failing = false;
  await panel.getByRole('button', { name: 'Qayta urinish' }).click();
  await expect(panel.locator('.notice-item')).toHaveCount(4);
  let rejectRead: () => void = () => {};
  const readGate = new Promise<void>((resolve) => {
    rejectRead = resolve;
  });
  await page.route(`**/api/v1/notifications/${items[0].id}/read`, async (route) => {
    await readGate;
    await route.fulfill({ status: 503, json: { message: 'O‘zgarish saqlanmadi.' } });
  });
  await panel.getByRole('button', { name: 'Matematika topshirig‘i: amallar', exact: true }).click();
  await page.getByRole('menuitem', { name: 'O‘qilgan deb belgilash', exact: true }).click();
  await expect(page.getByRole('button', { name: /Bildirishnomalarni ochish: 2/ })).toBeVisible();
  rejectRead();
  await expect(panel.getByRole('alert')).toContainText('O‘zgarish saqlanmadi.');
  await expect(page.getByRole('button', { name: /Bildirishnomalarni ochish: 3/ })).toBeVisible();
  expect(
    (await db.notification.findUniqueOrThrow({ where: { id: items[0].id } })).readAt,
  ).toBeNull();
});
test('dark panel colors preserve legibility and an empty unread state', async ({
  page,
  learner,
}, info) => {
  await seed(learner.user.id);
  await login(page, learner.user.email, learner.password);
  await page.evaluate(() => document.documentElement.classList.add('dark'));
  await page.getByRole('button', { name: /Bildirishnomalarni ochish/ }).click();
  const panel = page.getByRole('dialog', { name: 'Bildirishnomalar paneli' });
  await expect(panel.locator('.notice-item')).toHaveCount(4);
  expect(await panel.evaluate((node) => getComputedStyle(node).backgroundColor)).toBe(
    'rgb(23, 33, 46)',
  );
  await panel.screenshot({ path: info.outputPath('dark-popover.png'), animations: 'disabled' });
  await panel.getByRole('button', { name: 'Barchasini o‘qish', exact: true }).click();
  await panel.getByRole('tab', { name: 'O‘qilmagan', exact: true }).click();
  await expect(panel.getByRole('heading', { name: 'Hammasini o‘qib bo‘ldingiz' })).toBeVisible();
});
