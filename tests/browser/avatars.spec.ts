import { randomUUID } from 'node:crypto';
import { test, expect, db, origin } from './fixtures';
import { brand, brandTitle } from '../../apps/web/src/lib/brand';
import catalog from '../../apps/api/src/profile/avatar-catalog.json';

test('free avatar selection persists across sessions and appears in profile, header, friends, class and ranking', async ({
  page,
  learner,
  browser,
}, info) => {
  test.setTimeout(90000);
  const headers = { Origin: origin, Authorization: `Bearer ${learner.token}` };
  const available = await (await page.request.get('/api/v1/avatars', { headers })).json();
  for (const avatar of catalog)
    expect(available.some((item: { id: string }) => item.id === avatar.id)).toBe(true);
  expect(
    (
      await page.request.post('/api/v1/admin/avatars', {
        headers,
        data: { name: 'Denied', imageUrl: catalog[0]!.imageUrl },
      })
    ).status(),
  ).toBe(403);
  expect(
    (
      await page.request.patch('/api/v1/users/me/profile', {
        headers,
        data: { avatarId: randomUUID() },
      })
    ).status(),
  ).toBe(400);
  await page.goto('/profile');
  await expect(page).toHaveTitle(brandTitle);
  await page.getByRole('button', { name: 'Avatar tanlash', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Avatar tanlash', exact: true });
  await expect(dialog.getByRole('radio', { name: 'Tulki', exact: true })).toBeVisible();
  await dialog.getByRole('radio', { name: 'Tulki', exact: true }).check();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: info.outputPath('avatar-picker-mobile.png'), fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await dialog.getByRole('button', { name: 'Avatarni saqlash', exact: true }).click();
  await expect(dialog).toBeHidden();
  await expect(page.locator('.profile-avatar img')).toHaveAttribute('src', '/avatars/fox.svg');
  await expect(page.locator('.user-menu-avatar img')).toHaveAttribute('src', '/avatars/fox.svg');
  await page.reload();
  await expect(page.locator('.profile-avatar img')).toHaveAttribute('src', '/avatars/fox.svg');
  const updated = await (await page.request.get('/api/v1/users/me/profile', { headers })).json();
  expect(updated.user.avatarId).toBe(catalog[0]!.id);
  expect(updated.student.totalXp).toBe(0);
  const context = await browser.newContext();
  let peerId: string | undefined;
  let classId: string | undefined;
  try {
    const second = await context.newPage();
    await second.request.post(origin + '/api/v1/auth/login', {
      headers: { Origin: origin },
      data: { email: learner.user.email, password: learner.password },
    });
    await second.goto(origin + '/profile');
    await expect(second.locator('.profile-avatar img')).toHaveAttribute('src', '/avatars/fox.svg');
    const current = await db.user.findUniqueOrThrow({ where: { id: learner.user.id } });
    const peer = await db.user.create({
      data: {
        email: `avatar-peer-${randomUUID()}@example.uz`,
        name: 'Avatar Friend',
        passwordHash: current.passwordHash,
        avatarId: catalog[10]!.id,
        student: { create: { grade: 6 } },
      },
    });
    peerId = peer.id;
    const teacher = await db.user.findFirstOrThrow({ where: { role: 'TEACHER', active: true } });
    const group = await db.class.create({
      data: {
        name: `Avatar ${randomUUID()}`,
        grade: 6,
        teacherId: teacher.id,
        students: { create: [{ studentId: learner.user.id }, { studentId: peer.id }] },
      },
    });
    classId = group.id;
    const [low, high] = [learner.user.id, peer.id].sort();
    await db.friendship.create({
      data: {
        userLowId: low!,
        userHighId: high!,
        requestedById: learner.user.id,
        status: 'ACCEPTED',
        acceptedAt: new Date(),
      },
    });
    await page.goto('/friends');
    await expect(page.locator('.friend-row img')).toHaveAttribute('src', '/avatars/robot.svg');
    await page.goto('/my-class');
    await expect(
      page
        .locator('.friend-row')
        .filter({ has: page.locator('.classmate-me') })
        .locator('img'),
    ).toHaveAttribute('src', '/avatars/fox.svg');
    await page.goto('/leaderboard');
    await page.getByRole('button', { name: 'Do‘stlar', exact: true }).click();
    await expect(page.locator('.ranking-row.is-me img')).toHaveAttribute('src', '/avatars/fox.svg');
    await second.request.post(origin + '/api/v1/auth/login', {
      headers: { Origin: origin },
      data: { email: peer.email, password: learner.password },
    });
    await second.goto(origin + '/friends');
    await expect(second.locator('.friend-row img')).toHaveAttribute('src', '/avatars/fox.svg');
    const loginHtml = await (await page.request.get('/login')).text();
    expect(loginHtml).toContain(brand.name);
    expect(loginHtml).toContain(brand.logo.favicon);
  } finally {
    await context.close();
    if (classId) await db.class.delete({ where: { id: classId } });
    if (peerId) await db.user.delete({ where: { id: peerId } });
  }
});

test('admin creates, previews, edits and hides a reviewed avatar without accepting arbitrary image URLs', async ({
  page,
  learner,
}) => {
  await db.user.update({ where: { id: learner.user.id }, data: { role: 'ADMIN' } });
  const login = await page.request.post('/api/v1/auth/login', {
    headers: { Origin: origin },
    data: { email: learner.user.email, password: learner.password },
  });
  const { accessToken } = await login.json();
  const headers = { Origin: origin, Authorization: `Bearer ${accessToken}` };
  const name = `Sinov ${randomUUID().slice(0, 8)}`;
  let id: string | undefined;
  try {
    await page.goto('/admin/avatars');
    await page.getByRole('button', { name: 'Avatar qo‘shish', exact: true }).click();
    const create = page.getByRole('dialog', { name: 'Avatar qo‘shish', exact: true });
    await create.getByLabel('Nomi', { exact: true }).fill(name);
    await create.getByRole('checkbox').uncheck();
    await create.getByRole('button', { name: 'Saqlash', exact: true }).click();
    await expect(create).toBeHidden();
    const stored = await db.avatar.findFirstOrThrow({ where: { name } });
    id = stored.id;
    expect(stored.active).toBe(false);
    expect(
      (await (await page.request.get('/api/v1/avatars', { headers })).json()).some(
        (avatar: { id: string }) => avatar.id === id,
      ),
    ).toBe(false);
    expect(
      (
        await page.request.patch(`/api/v1/users/me/profile`, { headers, data: { avatarId: id } })
      ).status(),
    ).toBe(400);
    await page.getByRole('button', { name: `${name} avatarini tahrirlash`, exact: true }).click();
    const edit = page.getByRole('dialog', { name: 'Avatarni tahrirlash', exact: true });
    await edit.getByRole('combobox', { name: 'Tekshirilgan rasm', exact: true }).fill('Robot');
    await edit.getByRole('option', { name: 'Robot', exact: true }).click();
    await edit.getByRole('checkbox').check();
    await edit.getByRole('button', { name: 'Saqlash', exact: true }).click();
    await expect(edit).toBeHidden();
    const updated = await db.avatar.findUniqueOrThrow({ where: { id } });
    expect(updated.imageUrl).toBe('/avatars/robot.svg');
    expect(updated.active).toBe(true);
    expect(
      (
        await page.request.patch(`/api/v1/admin/avatars/${id}`, {
          headers,
          data: { imageUrl: 'https://example.com/unreviewed.svg' },
        })
      ).status(),
    ).toBe(400);
  } finally {
    if (id) await db.avatar.delete({ where: { id } });
  }
});
