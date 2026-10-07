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
test('admin modal combobox searches, handles keyboard/ESC and submits grade plus teacher UUID', async ({
  page,
}, info) => {
  const password = `Combobox${randomBytes(12).toString('hex')}!`;
  const suffix = randomUUID().slice(0, 8);
  const targetTeacher = await db.user.create({
    data: {
      name: `Combobox Target ${suffix}`,
      email: `target-combo-${suffix}@example.uz`,
      passwordHash: await argon2.hash(password),
      role: 'TEACHER',
      teacherAccess: true,
      teacher: { create: {} },
      createdAt: new Date(Date.now() - 60000),
    },
  });
  const manager = await db.user.create({
    data: {
      name: `Combobox Manager ${suffix}`,
      email: `combobox-${suffix}@example.uz`,
      passwordHash: await argon2.hash(password),
      role: 'ADMIN',
      teacherAccess: true,
      teacher: { create: {} },
    },
  });
  const className = `Combobox class ${suffix}`;
  try {
    await login(page, manager.email, password);
    await expect(page).toHaveURL(/\/admin$/);
    await page.goto('/admin/classes');
    await page.getByRole('button', { name: 'Sinf yaratish', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Yangi sinf', exact: true });
    await expect(dialog.locator('select')).toHaveCount(0);
    await dialog.getByLabel('Sinf nomi', { exact: true }).fill(className);
    const grade = dialog.getByRole('combobox', { name: 'Bosqich', exact: true });
    await grade.fill('Mavjud emas');
    await expect(page.getByText('Hech narsa topilmadi.', { exact: true })).toBeVisible();
    await grade.fill('5');
    await grade.press('ArrowDown');
    await grade.press('Enter');
    await expect(grade).toHaveValue('5-sinf');
    await expect(dialog).toBeVisible();
    const teacher = dialog.getByRole('combobox', { name: 'O‘qituvchi', exact: true });
    await teacher.fill('Combobox Target');
    await expect(page.getByRole('option', { name: targetTeacher.name, exact: true })).toBeVisible();
    await page.screenshot({
      path: info.outputPath('admin-modal-combobox.png'),
      animations: 'disabled',
    });
    await teacher.press('Escape');
    await expect(dialog).toBeVisible();
    await expect(page.getByRole('listbox')).not.toBeVisible();
    await teacher.fill('Combobox Target');
    await page.getByRole('option', { name: targetTeacher.name, exact: true }).click();
    await dialog.getByRole('button', { name: 'Saqlash', exact: true }).click();
    await expect(dialog).not.toBeVisible();
    const saved = await db.class.findUniqueOrThrow({
      where: { teacherId_name: { teacherId: targetTeacher.id, name: className } },
    });
    expect(saved.grade).toBe(5);
    expect(saved.teacherId).toBe(targetTeacher.id);
  } finally {
    await db.class.deleteMany({ where: { teacherId: { in: [manager.id, targetTeacher.id] } } });
    await db.user.deleteMany({ where: { id: { in: [manager.id, targetTeacher.id] } } });
  }
});

test('teacher class combobox resets the previous lesson and saves a matching grade assignment on mobile', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const password = `TeacherCombo${randomBytes(12).toString('hex')}!`;
  const suffix = randomUUID().slice(0, 8);
  const teacher = await db.user.create({
    data: {
      name: `Combobox Teacher ${suffix}`,
      email: `teacher-combo-${suffix}@example.uz`,
      passwordHash: await argon2.hash(password),
      role: 'TEACHER',
      teacherAccess: true,
      teacher: { create: {} },
    },
  });
  const class6 = await db.class.create({
    data: { name: `Combobox 6 ${suffix}`, grade: 6, teacherId: teacher.id },
  });
  const class7 = await db.class.create({
    data: { name: `Combobox 7 ${suffix}`, grade: 7, teacherId: teacher.id },
  });
  const title = `Combobox assignment ${suffix}`;
  try {
    await login(page, teacher.email, password);
    await expect(page).toHaveURL(/\/teacher$/);
    await page.getByRole('button', { name: 'Topshiriq berish', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Yangi topshiriq', exact: true });
    await expect(dialog.locator('select')).toHaveCount(0);
    const group = dialog.getByRole('combobox', { name: 'Sinf', exact: true });
    await expect(group).toHaveValue(`${class6.name} · 6-sinf`);
    const lesson = dialog.getByRole('combobox', { name: 'Dars', exact: true });
    await expect(lesson).toBeEnabled();
    await lesson.fill('Matematika');
    await page.getByRole('option').first().click();
    await expect(lesson).not.toHaveValue('');
    await group.fill(class7.name);
    await page.getByRole('option', { name: `${class7.name} · 7-sinf`, exact: true }).click();
    await expect(lesson).toHaveValue('');
    await lesson.fill('Matematika');
    await page.getByRole('option').first().click();
    await dialog.getByLabel('Topshiriq nomi', { exact: true }).fill(title);
    await dialog
      .getByLabel('Topshirish muddati', { exact: true })
      .fill(new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 16));
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    await dialog.getByRole('button', { name: 'Topshiriq berish', exact: true }).click();
    await expect(dialog).not.toBeVisible();
    const assignment = await db.assignment.findFirstOrThrow({
      where: { title, classId: class7.id },
      include: { lesson: { include: { topic: { include: { course: true } } } } },
    });
    expect(assignment.lesson.topic.course.grade).toBe(7);
  } finally {
    await db.class.deleteMany({ where: { teacherId: teacher.id } });
    await db.user.deleteMany({ where: { id: teacher.id } });
  }
});
