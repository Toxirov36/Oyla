import { test, expect, db, demoPassword, origin } from './fixtures';

test('anonymous profile visits require login', async ({ page }) => {
  await page.goto('/profile');
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('button', { name: 'Tizimga kirish', exact: true })).toBeVisible();
});

test('login, profile validation, save and reload persist the real user name', async ({
  page,
  learner,
}) => {
  await page.context().clearCookies();
  await page.goto('/login');
  await page.getByLabel('Email manzilingiz', { exact: true }).fill(learner.user.email);
  await page.getByRole('textbox', { name: 'Parolingiz Parolni ko‘rsatish' }).fill(learner.password);
  await page.getByRole('button', { name: 'Tizimga kirish', exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.getByRole('button', { name: /^Profil menyusi:/ }).click();
  await page.getByRole('menuitem', { name: 'Profilim', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Mening profilim' })).toBeVisible();
  const name = page.getByLabel('Ism va familiya', { exact: true });
  await name.fill('');
  await page.getByRole('button', { name: 'O‘zgarishlarni saqlash' }).click();
  await expect(page.getByRole('alert')).toContainText('Ism kamida 2 ta belgidan');
  await name.fill('Browser Updated');
  await page.getByRole('button', { name: 'O‘zgarishlarni saqlash' }).click();
  await expect(page.getByRole('status')).toContainText('Profilingiz saqlandi.');
  await expect(page.getByRole('button', { name: /^Profil menyusi:/ })).toContainText(
    'Browser Updated',
  );
  await expect(page.getByLabel('Email manzili', { exact: true })).toHaveAttribute('readonly');
  await expect(page.getByLabel('Sinfingiz', { exact: true })).toHaveValue('6-sinf');
  await page.reload();
  await expect(name).toHaveValue('Browser Updated');
  expect((await db.user.findUniqueOrThrow({ where: { id: learner.user.id } })).name).toBe(
    'Browser Updated',
  );
  const forbidden = await page.request.patch('/api/v1/users/me/profile', {
    headers: { Origin: origin, Authorization: `Bearer ${learner.token}` },
    data: { name: 'Browser Updated', role: 'ADMIN', grade: 7 },
  });
  expect(forbidden.status()).toBe(400);
  await page.getByRole('button', { name: 'Chiqish', exact: true }).click();
  await page.goto('/profile');
  await expect(page).toHaveURL(/\/login$/);
});

test('mobile profile has no horizontal overflow and supports name editing', async ({
  page,
  learner,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/profile');
  await expect(page.getByLabel('Ism va familiya', { exact: true })).toHaveValue(learner.user.name);
  const dimensions = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    content: document.documentElement.scrollWidth,
  }));
  expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport);
  const longName = 'M'.repeat(80);
  await page.getByLabel('Ism va familiya', { exact: true }).fill(longName);
  await page.getByRole('button', { name: 'O‘zgarishlarni saqlash' }).click();
  await expect(page.getByRole('status')).toContainText('Profilingiz saqlandi.');
  await expect(page.getByRole('button', { name: /^Profil menyusi:/ })).toContainText(longName);
  const savedDimensions = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    content: document.documentElement.scrollWidth,
  }));
  expect(savedDimensions.content).toBeLessThanOrEqual(savedDimensions.viewport);
});

for (const [email, role] of [
  ['teacher@oyla.uz', 'O‘qituvchi'],
  ['admin@oyla.uz', 'Administrator'],
] as const) {
  test(`${role} can open their own profile without student-only fields`, async ({ page }) => {
    const login = await page.request.post('/api/v1/auth/login', {
      headers: { Origin: origin },
      data: { email, password: demoPassword },
    });
    expect(login.status()).toBe(201);
    const session = (await login.json()) as { user: { name: string }; accessToken: string };
    try {
      await page.goto('/profile');
      await expect(page.getByLabel('Ism va familiya', { exact: true })).toHaveValue(
        session.user.name,
      );
      await expect(page.getByRole('button', { name: /^Profil menyusi:/ })).toContainText(role);
      await expect(page.getByLabel('Sinfingiz', { exact: true })).toHaveCount(0);
      await expect(page.getByText('Bilim darajangiz', { exact: true })).toHaveCount(0);
      if (email.startsWith('teacher'))
        await expect(page.getByText('O‘quvchilarim', { exact: true })).toBeVisible();
    } finally {
      await page.request.post('/api/v1/auth/logout', {
        headers: { Origin: origin, Authorization: `Bearer ${session.accessToken}` },
      });
    }
  });
}
