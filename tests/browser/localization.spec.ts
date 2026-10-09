import { test, expect, db, origin } from './fixtures';
import type { Subject } from '../../apps/web/src/lib/types';

test('language selection preserves an unsaved profile and persists after reload and sign-out', async ({
  page,
  learner,
}) => {
  await page.goto('/profile');
  const name = page.getByLabel('Ism va familiya', { exact: true });
  await name.fill('Unsaved name');
  const saved = page.waitForResponse(
    (response) =>
      response.url().endsWith('/users/me/profile') && response.request().method() === 'PATCH',
  );
  await page.getByLabel('Interfeys tili', { exact: true }).selectOption('ru');
  expect((await saved).status()).toBe(200);
  await expect(page.getByRole('heading', { name: 'Мой профиль' })).toBeVisible();
  await expect(page.getByLabel('Имя и фамилия', { exact: true })).toHaveValue('Unsaved name');
  await expect(page.getByRole('button', { name: 'Сохранить изменения' })).toBeEnabled();
  expect(
    (await db.user.findUniqueOrThrow({ where: { id: learner.user.id } })).preferredLocale,
  ).toBe('ru');
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Мой профиль' })).toBeVisible();
  await expect(page.getByLabel('Имя и фамилия', { exact: true })).toHaveValue(learner.user.name);
  const english = page.waitForResponse(
    (response) =>
      response.url().endsWith('/users/me/profile') && response.request().method() === 'PATCH',
  );
  await page.getByLabel('Язык интерфейса', { exact: true }).selectOption('en');
  expect((await english).status()).toBe(200);
  await expect(page.getByRole('heading', { name: 'My profile' })).toBeVisible();
  await page
    .getByRole('button', { name: `Profile menu: ${learner.user.name}`, exact: true })
    .click();
  await page.getByRole('menuitem', { name: 'Sign out', exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByLabel('Interface language', { exact: true })).toHaveValue('en');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
});

test('an account restores its saved language on a new browser without a manual choice', async ({
  page,
  learner,
}) => {
  await db.user.update({ where: { id: learner.user.id }, data: { preferredLocale: 'ru' } });
  await page.context().clearCookies();
  await page.goto('/login');
  await page.getByLabel('Email manzilingiz', { exact: true }).fill(learner.user.email);
  await page.getByRole('textbox', { name: 'Parolingiz Parolni ko‘rsatish' }).fill(learner.password);
  await page.getByRole('button', { name: 'Tizimga kirish', exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByLabel('Язык интерфейса', { exact: true })).toHaveValue('ru');
  await expect(page.getByRole('heading', { name: 'Привет, Browser! 👋' })).toBeVisible();
});

test('guest form errors switch language without clearing inputs and API errors use stable codes', async ({
  page,
  learner,
}) => {
  await page.context().clearCookies();
  await page.goto('/login');
  await page.getByLabel('Interfeys tili', { exact: true }).selectOption('en');
  await page.getByLabel('Your email', { exact: true }).fill('invalid-email');
  await page.getByRole('textbox', { name: 'Your password Show password' }).fill('abc');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByText('Enter a valid email address.', { exact: true })).toBeVisible();
  await page.getByLabel('Interface language', { exact: true }).selectOption('ru');
  await expect(page.getByText('Введите корректный email.', { exact: true })).toBeVisible();
  await expect(page.getByLabel(/^Ваш email/)).toHaveValue('invalid-email');
  const response = await page.request.post('/api/v1/auth/login', {
    headers: { Origin: origin, 'Accept-Language': 'ru-RU' },
    data: { email: learner.user.email, password: 'WrongPassword123!' },
  });
  expect(response.status()).toBe(401);
  expect(await response.json()).toMatchObject({
    code: 'AUTH_INVALID_CREDENTIALS',
    message: 'Неверный email или пароль.',
  });
});

test('three interface languages fit a narrow mobile profile and retain access to the avatar menu', async ({
  page,
  learner,
}) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto('/profile');
  for (const [locale, label, heading, trigger] of [
    ['uz', 'Interfeys tili', 'Mening profilim', /^Profil menyusi:/],
    ['ru', 'Interfeys tili', 'Мой профиль', /^Меню профиля:/],
    ['en', 'Язык интерфейса', 'My profile', /^Profile menu:/],
  ] as const) {
    const selector = page.getByLabel(label, { exact: true });
    if (locale !== 'uz') {
      const saved = page.waitForResponse(
        (response) =>
          response.url().endsWith('/users/me/profile') && response.request().method() === 'PATCH',
      );
      await selector.selectOption(locale);
      expect((await saved).status()).toBe(200);
    }
    await expect(page.getByRole('heading', { name: heading })).toBeVisible();
    const dimensions = await page.evaluate(() => ({
      width: document.documentElement.clientWidth,
      content: document.documentElement.scrollWidth,
    }));
    expect(dimensions.content, locale).toBeLessThanOrEqual(dimensions.width);
    await expect(page.getByRole('button', { name: trigger })).toBeInViewport();
    await expect(page.getByRole('button', { name: trigger })).toContainText(learner.user.name);
  }
});

test('changing the interface language preserves an in-progress exercise and its draft after reload', async ({
  page,
  learner,
}) => {
  await page.goto('/dashboard');
  const russian = page.waitForResponse(
    (response) =>
      response.url().endsWith('/users/me/profile') && response.request().method() === 'PATCH',
  );
  await page.getByLabel('Interfeys tili', { exact: true }).selectOption('ru');
  expect((await russian).status()).toBe(200);
  const response = await page.request.get('/api/v1/subjects', {
    headers: { Origin: origin, Authorization: `Bearer ${learner.token}` },
  });
  expect(response.status()).toBe(200);
  const subjects = (await response.json()) as Subject[];
  const lesson = subjects
    .flatMap((subject) =>
      subject.courses.flatMap((course) => course.topics.flatMap((topic) => topic.lessons)),
    )
    .find((lesson) => lesson.state === 'AVAILABLE');
  expect(lesson).toBeTruthy();
  await page.goto(`/lessons/${lesson!.id}`);
  await expect(page.getByRole('note')).toContainText(
    'Учебные материалы пока доступны на узбекском языке.',
  );
  await page.getByRole('button', { name: 'Посмотреть пример', exact: true }).click();
  await page.getByRole('button', { name: 'Начать практику', exact: true }).click();
  const input = page.locator('.question-card input').first();
  await expect(input).toBeVisible();
  const radio = (await input.getAttribute('type')) === 'radio';
  if (radio) await input.check();
  else await input.fill('123');
  const answer = await input.inputValue();
  const question = await page.locator('.question-card h2').innerText();
  const english = page.waitForResponse(
    (response) =>
      response.url().endsWith('/users/me/profile') && response.request().method() === 'PATCH',
  );
  await page.getByLabel('Язык интерфейса', { exact: true }).selectOption('en');
  expect((await english).status()).toBe(200);
  await expect(page.getByRole('button', { name: 'Check answer', exact: true })).toBeVisible();
  await expect(page.locator('.question-card h2')).toHaveText(question);
  if (radio) await expect(input).toBeChecked();
  else await expect(input).toHaveValue(answer);
  await page.reload();
  await expect(page.getByRole('button', { name: 'Check answer', exact: true })).toBeVisible();
  await expect(page.locator('.question-card h2')).toHaveText(question);
  if (radio) await expect(input).toBeChecked();
  else await expect(input).toHaveValue(answer);
});
