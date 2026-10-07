import { randomUUID } from 'node:crypto';
import { test, expect, db } from './fixtures';

test('registration validates the form and creates the selected grade profile', async ({ page }) => {
  const email = `registration-${randomUUID()}@example.uz`;
  try {
    await page.goto('/register');
    await page.getByLabel('Ismingiz', { exact: true }).fill('Registration Learner');
    await page.getByRole('combobox', { name: 'Sinfingiz', exact: true }).selectOption('7');
    await page.getByLabel('Email manzilingiz', { exact: true }).fill('not-an-email');
    await page.getByRole('textbox', { name: /Parolingiz/ }).fill('short');
    await page.getByRole('button', { name: 'Hisob yaratish', exact: true }).click();
    await expect(
      page.getByText('Email manzilini to‘g‘ri kiriting.', { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText('Parol kamida 10 ta belgidan iborat.', { exact: true }),
    ).toBeVisible();
    await page.getByRole('textbox', { name: /Email manzilingiz/ }).fill(email);
    await page.getByRole('textbox', { name: /Parolingiz/ }).fill('BrowserRegistration2026!');
    await page.getByRole('button', { name: 'Hisob yaratish', exact: true }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
    await page.getByRole('button', { name: /^Profil menyusi:/ }).click();
    await page.getByRole('menuitem', { name: 'Profilim', exact: true }).click();
    await expect(page.getByLabel('Email manzili', { exact: true })).toHaveValue(email);
    await expect(page.getByLabel('Sinfingiz', { exact: true })).toHaveValue('7-sinf');
    const user = await db.user.findUniqueOrThrow({ where: { email }, include: { student: true } });
    expect(user.role).toBe('STUDENT');
    expect(user.student?.grade).toBe(7);
  } finally {
    await db.user.deleteMany({ where: { email } });
  }
});
