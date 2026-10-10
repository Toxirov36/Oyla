import { randomBytes, randomUUID } from 'node:crypto';
import argon2 from 'argon2';
import { test, expect, db } from './fixtures';

test('admin users show ten accounts per page and search returns to page one', async ({ page }, info) => {
  const prefix = `pager-${randomUUID()}`;
  const password = `Manager${randomBytes(12).toString('hex')}!`;
  const passwordHash = await argon2.hash(password);
  const manager = await db.user.create({
    data: { name: 'Pagination Manager', email: `manager-${prefix}@example.uz`, role: 'ADMIN', passwordHash },
  });
  try {
    await db.user.createMany({
      data: Array.from({ length: 12 }, (_, index) => ({
        name: `Pagination User ${index + 1}`,
        email: `${prefix}-${index}@example.uz`,
        role: 'TEACHER' as const,
        passwordHash,
      })),
    });
    await page.goto('/login');
    await page.getByLabel('Email manzilingiz', { exact: true }).fill(manager.email);
    await page.getByRole('textbox', { name: 'Parolingiz Parolni ko‘rsatish' }).fill(password);
    await page.getByRole('button', { name: 'Tizimga kirish', exact: true }).click();
    await expect(page).toHaveURL(/\/admin$/);
    await page.goto(`/admin/users?search=${prefix}-`);
    const rows = page.locator('.data-table-card tbody tr');
    const pages = page.getByRole('navigation', { name: 'Foydalanuvchilar sahifalari' });
    await expect(rows).toHaveCount(10);
    await expect(page.getByText('1–10 / 12')).toBeVisible();
    await expect(pages.getByRole('button', { name: '1-sahifa' })).toHaveAttribute('aria-current', 'page');
    await page.screenshot({ path: info.outputPath('admin-users-pagination.png'), fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await pages.getByRole('button', { name: 'Keyingi sahifa' }).click();
    await expect(rows).toHaveCount(2);
    await expect(page.getByText('11–12 / 12')).toBeVisible();
    await page.getByRole('textbox', { name: 'Foydalanuvchini qidirish' }).fill(`${prefix}-0@example.uz`);
    await expect(rows).toHaveCount(1);
    await expect(page.getByText('1–1 / 1')).toBeVisible();
    await expect(pages).toHaveCount(0);
  } finally {
    await db.user.deleteMany({ where: { email: { startsWith: prefix } } });
    await db.user.delete({ where: { id: manager.id } });
  }
});
