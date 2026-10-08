import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { test, expect, db, origin } from './fixtures';
import type { BrainMatch, VideoLesson } from '../../apps/web/src/lib/play';
test.use({ learnerGrade: 5 });

test('profile photo is privately served, survives reload and can switch back to existing avatars', async ({
  page,
  learner,
}, info) => {
  const headers = { Origin: origin, Authorization: `Bearer ${learner.token}` };
  const image = await sharp({
    create: { width: 128, height: 96, channels: 3, background: '#1ee1b5' },
  })
    .png()
    .toBuffer();
  await page.goto('/profile');
  await page.getByRole('button', { name: 'Profil rasmi', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Profil rasmi', exact: true });
  await dialog
    .getByLabel('Rasm tanlash', { exact: true })
    .setInputFiles({ name: 'profile.png', mimeType: 'image/png', buffer: image });
  await expect(dialog.getByRole('img', { name: 'Yangi profil rasmi' })).toBeVisible();
  await dialog.getByRole('button', { name: 'Rasmni saqlash', exact: true }).click();
  await expect(dialog).toBeHidden();
  await expect(page.locator('.profile-avatar img')).toHaveAttribute('src', /^blob:/);
  await page.reload();
  await expect(page.locator('.profile-avatar img')).toHaveAttribute('src', /^blob:/);
  expect(
    await page.locator('.profile-avatar img').evaluate((img: HTMLImageElement) => img.naturalWidth),
  ).toBeGreaterThan(0);
  const profile = await (await page.request.get('/api/v1/users/me/profile', { headers })).json();
  expect(profile.user.photo).toBeUndefined();
  expect(profile.student.totalXp).toBe(0);
  const url = profile.user.avatar.imageUrl;
  expect((await page.request.get(url)).status()).toBe(401);
  const media = await page.request.get(url, { headers });
  expect(media.status()).toBe(200);
  expect(media.headers()['content-type']).toContain('image/webp');
  expect(media.headers()['cache-control']).toContain('no-store');
  expect(
    (
      await page.request.post('/api/v1/users/me/photo', {
        headers,
        multipart: {
          file: {
            name: 'fake.png',
            mimeType: 'image/png',
            buffer: Buffer.from('<svg><script>alert(1)</script></svg>'),
          },
        },
      })
    ).status(),
  ).toBe(400);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: info.outputPath('profile-photo-mobile.png') });
  await page.getByRole('button', { name: 'Avatar tanlash', exact: true }).click();
  const avatars = page.getByRole('dialog', { name: 'Avatar tanlash' });
  await avatars.getByRole('radio', { name: 'Tulki', exact: true }).check();
  await avatars.getByRole('button', { name: 'Avatarni saqlash' }).click();
  await expect(avatars).toBeHidden();
  await expect(page.locator('.profile-avatar img')).toHaveAttribute('src', '/avatars/fox.svg');
  expect(await db.profilePhoto.count({ where: { userId: learner.user.id } })).toBe(0);
  expect((await page.request.get(url, { headers })).status()).toBe(404);
});

test('Brain Ring is synchronized between two real players, hides keys and grades only first submissions', async ({
  page,
  learner,
  browser,
}, info) => {
  test.setTimeout(150000);
  const context = await browser.newContext();
  const second = await context.newPage();
  let peerId: string | undefined;
  const headers = { Origin: origin, Authorization: `Bearer ${learner.token}` };
  try {
    const register = await second.request.post(origin + '/api/v1/auth/register', {
      headers: { Origin: origin },
      data: {
        name: 'Brain Partner',
        email: `brain-${randomUUID()}@example.uz`,
        password: learner.password,
        grade: 5,
      },
    });
    expect(register.status()).toBe(201);
    const peer = await register.json();
    peerId = peer.user.id;
    const peerHeaders = { Origin: origin, Authorization: `Bearer ${peer.accessToken}` };
    const profile = await (
      await second.request.get(origin + '/api/v1/friends', { headers: peerHeaders })
    ).json();
    const request = await (
      await page.request.post('/api/v1/friends/requests', {
        headers,
        data: { code: profile.inviteCode },
      })
    ).json();
    expect(
      (
        await second.request.patch(origin + `/api/v1/friends/requests/${request.id}/accept`, {
          headers: peerHeaders,
          data: {},
        })
      ).status(),
    ).toBe(200);
    await page.goto('/brain-ring');
    await page.getByRole('combobox', { name: 'Do‘stingiz', exact: true }).fill('Brain Partner');
    await page.getByRole('option', { name: 'Brain Partner · 5-sinf', exact: true }).click();
    await page.getByRole('button', { name: 'Bellashuvga taklif qilish' }).click();
    await expect(page).toHaveURL(/\/brain-ring\/[a-f0-9-]+$/);
    const id = page.url().split('/').at(-1)!;
    const before = await (await page.request.get(`/api/v1/brain-ring/${id}`, { headers })).json();
    expect(before.question).toBeNull();
    expect(before.questionsSnapshot).toBeUndefined();
    await second.goto(origin + `/brain-ring/${id}`);
    await second.getByRole('button', { name: 'Qabul qilish', exact: true }).click();
    const snapshot = await db.brainMatch.findUniqueOrThrow({ where: { id } });
    const questions = snapshot.questionsSnapshot as unknown as {
      type: string;
      text: string;
      answer: string;
      options: { text: string; value: string }[];
    }[];
    for (const [index, q] of questions.entries()) {
      await expect(
        page.locator('.brain-question').getByRole('heading', { name: q.text, exact: true }),
      ).toBeVisible();
      await expect(
        second.locator('.brain-question').getByRole('heading', { name: q.text, exact: true }),
      ).toBeVisible();
      const safe = (await (
        await page.request.get(`/api/v1/brain-ring/${id}`, { headers })
      ).json()) as BrainMatch;
      expect(safe.roundIndex).toBe(index);
      for (const key of ['answer', 'grading', 'explanation', 'feedback'])
        expect(Object.hasOwn(safe.question!, key)).toBe(false);
      const correctText =
        q.type === 'TRUE_FALSE'
          ? q.answer === 'true'
            ? 'To‘g‘ri'
            : 'Noto‘g‘ri'
          : q.options.find((option) => option.value === q.answer)!.text;
      await page
        .locator('.brain-options')
        .getByRole('button', { name: correctText, exact: true })
        .click();
      await page.getByRole('button', { name: 'Javobni yuborish', exact: true }).click();
      await expect(
        page.getByText('Javobingiz saqlandi. Do‘stingizni kutyapmiz.', { exact: true }),
      ).toBeVisible();
      const pending = await (
        await page.request.get(`/api/v1/brain-ring/${id}`, { headers })
      ).json();
      expect(pending.feedback).toBeNull();
      expect(pending.players.every((player: { score: number }) => player.score <= index * 10)).toBe(
        true,
      );
      const wrong =
        q.type === 'TRUE_FALSE'
          ? q.answer === 'true'
            ? 'false'
            : 'true'
          : q.options.find((option) => option.value !== q.answer)!.value;
      expect(
        (
          await page.request.post(`/api/v1/brain-ring/${id}/answers`, {
            headers,
            data: { roundIndex: index, value: wrong },
          })
        ).status(),
      ).toBe(201);
      expect(
        (
          await page.request.post(`/api/v1/brain-ring/${id}/answers`, {
            headers,
            data: { roundIndex: index, value: q.answer, score: 100 },
          })
        ).status(),
      ).toBe(400);
      expect(
        (
          await second.request.post(origin + `/api/v1/brain-ring/${id}/answers`, {
            headers: peerHeaders,
            data: { roundIndex: index, value: wrong },
          })
        ).status(),
      ).toBe(201);
      await expect(page.getByText('To‘g‘ri javob! +10 ball', { exact: true })).toBeVisible();
      if (index === 0) {
        await page.setViewportSize({ width: 390, height: 844 });
        await page.screenshot({ path: info.outputPath('brain-ring-mobile.png'), fullPage: true });
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
          true,
        );
      }
    }
    await expect(
      page.getByRole('heading', { name: 'G‘alaba sizniki!', exact: true }),
    ).toBeVisible();
    await expect(
      second.getByRole('heading', { name: 'Yaxshi bellashuv bo‘ldi!', exact: true }),
    ).toBeVisible();
    const finished = await (await page.request.get(`/api/v1/brain-ring/${id}`, { headers })).json();
    expect(finished.status).toBe('FINISHED');
    expect(finished.winnerId).toBe(learner.user.id);
    expect(
      finished.players.find((player: { id: string }) => player.id === learner.user.id).score,
    ).toBe(50);
    expect(await db.brainAnswer.count({ where: { matchId: id, userId: learner.user.id } })).toBe(5);
    expect(await db.xpTransaction.count({ where: { userId: learner.user.id } })).toBe(0);
  } finally {
    await context.close();
    if (peerId) await db.user.delete({ where: { id: peerId } });
  }
});

test('animated videos are grade-scoped and the mini game completes through visible card interactions', async ({
  page,
  learner,
}, info) => {
  test.setTimeout(90000);
  const headers = { Origin: origin, Authorization: `Bearer ${learner.token}` };
  const videos = (await (
    await page.request.get('/api/v1/video-lessons', { headers })
  ).json()) as VideoLesson[];
  expect(videos.every((video) => video.grade === 5)).toBe(true);
  expect(videos.filter((video) => video.kind === 'ANIMATION').length).toBeGreaterThanOrEqual(3);
  expect(
    (
      await page.request.get('/api/v1/video-lessons/a7020000-0000-4000-8000-000000000003', {
        headers,
      })
    ).status(),
  ).toBe(404);
  const video = videos.find((video) => video.animationKey === 'math-5')!;
  await page.goto(`/videos/${video.id}`);
  await page.getByRole('button', { name: 'Ko‘rishni boshlash', exact: true }).click();
  await expect(page.locator('.video-controls>span')).not.toHaveText('0 / 48 s');
  await page.getByRole('button', { name: 'Pauza', exact: true }).click();
  await page.getByRole('button', { name: '2. Yarim', exact: true }).click();
  await expect(page.getByRole('img', { name: '1/2', exact: true })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: info.outputPath('animated-lesson-mobile.png'), fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.goto('/games/memory');
  await expect(page.locator('.memory-card')).toHaveCount(8);
  const remembered = new Map<number, string>();
  const partner: Record<string, string> = {
    cat: 'Mushuk',
    Mushuk: 'cat',
    dog: 'Kuchuk',
    Kuchuk: 'dog',
    rabbit: 'Quyon',
    Quyon: 'rabbit',
    fox: 'Tulki',
    Tulki: 'fox',
  };
  for (let turn = 0; turn < 24; turn++) {
    if (await page.getByRole('heading', { name: 'Bilim bog‘ingiz gulladi!', exact: true }).count())
      break;
    const cards = page.locator('.memory-card');
    const count = await cards.count();
    const remaining: number[] = [];
    for (let i = 0; i < count; i++)
      if (!(await cards.nth(i).getAttribute('class'))!.includes('is-matched')) remaining.push(i);
    if (!remaining.length) break;
    const left = remaining.find((i) => !remembered.has(i)) ?? remaining[0]!;
    await cards.nth(left).click();
    await expect(cards.nth(left).locator('span')).toBeVisible();
    const label = (await cards.nth(left).innerText()).trim();
    remembered.set(left, label);
    const right =
      remaining.find((i) => i !== left && remembered.get(i) === partner[label]) ??
      remaining.find((i) => i !== left && !remembered.has(i)) ??
      remaining.find((i) => i !== left)!;
    await cards.nth(right).click();
    await expect(cards.nth(right).locator('span')).toBeVisible();
    remembered.set(right, (await cards.nth(right).innerText()).trim());
    await expect(page.locator('.memory-card.is-open:not(.is-matched)')).toHaveCount(0);
  }
  await expect(
    page.getByRole('heading', { name: 'Bilim bog‘ingiz gulladi!', exact: true }),
  ).toBeVisible();
  expect(await db.xpTransaction.count({ where: { userId: learner.user.id } })).toBe(0);
});

test('admin can create, publish and archive a YouTube lesson through the new catalog', async ({
  page,
  learner,
}) => {
  await db.user.update({ where: { id: learner.user.id }, data: { role: 'ADMIN' } });
  const login = await page.request.post('/api/v1/auth/login', {
    headers: { Origin: origin },
    data: { email: learner.user.email, password: learner.password },
  });
  const session = await login.json();
  const headers = { Origin: origin, Authorization: `Bearer ${session.accessToken}` };
  const title = `Video ${randomUUID().slice(0, 8)}`;
  let id: string | undefined;
  try {
    await page.goto('/admin/videos');
    await page.getByRole('button', { name: 'Videodars qo‘shish', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Videodars qo‘shish', exact: true });
    await dialog.getByLabel('Nomi', { exact: true }).fill(title);
    await dialog
      .getByLabel('Tavsif', { exact: true })
      .fill('Kundalik odatlar haqidagi inglizcha video.');
    await dialog.getByRole('combobox', { name: 'Fan', exact: true }).fill('Ingliz');
    await dialog.getByRole('option', { name: 'Ingliz tili', exact: true }).click();
    await dialog.getByRole('combobox', { name: 'Manba', exact: true }).fill('YouTube');
    await dialog.getByRole('option', { name: 'YouTube', exact: true }).click();
    await dialog
      .getByLabel('YouTube havolasi yoki ID', { exact: true })
      .fill('https://www.youtube.com/watch?v=synTxcnHyrA');
    await dialog.getByRole('button', { name: 'Saqlash', exact: true }).click();
    await expect(dialog).toBeHidden();
    const row = await db.videoLesson.findFirstOrThrow({ where: { title } });
    id = row.id;
    expect(row.kind).toBe('YOUTUBE');
    expect(row.youtubeId).toBe('synTxcnHyrA');
    expect(row.status).toBe('DRAFT');
    expect(
      (
        await page.request.patch(`/api/v1/admin/video-lessons/${id}`, {
          headers,
          data: { status: 'PUBLISHED' },
        })
      ).status(),
    ).toBe(200);
    expect((await db.videoLesson.findUniqueOrThrow({ where: { id } })).status).toBe('PUBLISHED');
    expect(
      (
        await page.request.patch(`/api/v1/admin/video-lessons/${id}`, {
          headers,
          data: { status: 'ARCHIVED' },
        })
      ).status(),
    ).toBe(200);
  } finally {
    if (id) await db.videoLesson.delete({ where: { id } });
  }
});

test('Brain Ring requires accepted friends, rejects outsider access and finishes disconnected games by server time', async ({
  page,
  learner,
  browser,
}) => {
  const peerContext = await browser.newContext();
  const observerContext = await browser.newContext();
  const ids: string[] = [];
  const headers = { Origin: origin, Authorization: `Bearer ${learner.token}` };
  try {
    const peer = await (
      await peerContext.request.post(origin + '/api/v1/auth/register', {
        headers: { Origin: origin },
        data: {
          name: 'Timeout Peer',
          email: `peer-${randomUUID()}@example.uz`,
          password: learner.password,
          grade: 5,
        },
      })
    ).json();
    ids.push(peer.user.id);
    const peerHeaders = { Origin: origin, Authorization: `Bearer ${peer.accessToken}` };
    const observer = await (
      await observerContext.request.post(origin + '/api/v1/auth/register', {
        headers: { Origin: origin },
        data: {
          name: 'Observer',
          email: `observer-${randomUUID()}@example.uz`,
          password: learner.password,
          grade: 5,
        },
      })
    ).json();
    ids.push(observer.user.id);
    expect(
      (
        await page.request.post('/api/v1/brain-ring', {
          headers,
          data: { opponentId: learner.user.id },
        })
      ).status(),
    ).toBe(400);
    expect(
      (
        await page.request.post('/api/v1/brain-ring', {
          headers,
          data: { opponentId: peer.user.id },
        })
      ).status(),
    ).toBe(400);
    const friends = await (
      await peerContext.request.get(origin + '/api/v1/friends', { headers: peerHeaders })
    ).json();
    const request = await (
      await page.request.post('/api/v1/friends/requests', {
        headers,
        data: { code: friends.inviteCode },
      })
    ).json();
    await peerContext.request.patch(origin + `/api/v1/friends/requests/${request.id}/accept`, {
      headers: peerHeaders,
      data: {},
    });
    const invited = await (
      await page.request.post('/api/v1/brain-ring', { headers, data: { opponentId: peer.user.id } })
    ).json();
    expect(
      (
        await observerContext.request.get(origin + `/api/v1/brain-ring/${invited.id}`, {
          headers: { Authorization: `Bearer ${observer.accessToken}` },
        })
      ).status(),
    ).toBe(404);
    expect(
      (
        await page.request.post(`/api/v1/brain-ring/${invited.id}/actions`, {
          headers,
          data: { action: 'accept' },
        })
      ).status(),
    ).toBe(400);
    await db.brainMatch.update({
      where: { id: invited.id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    expect(
      (await (await page.request.get(`/api/v1/brain-ring/${invited.id}`, { headers })).json())
        .status,
    ).toBe('EXPIRED');
    const active = await (
      await page.request.post('/api/v1/brain-ring', { headers, data: { opponentId: peer.user.id } })
    ).json();
    await peerContext.request.post(origin + `/api/v1/brain-ring/${active.id}/actions`, {
      headers: peerHeaders,
      data: { action: 'accept' },
    });
    const old = new Date(Date.now() - 300000);
    await db.brainMatch.update({
      where: { id: active.id },
      data: { startedAt: old, roundStartedAt: old, expiresAt: new Date(Date.now() - 1000) },
    });
    const history = await (await page.request.get('/api/v1/brain-ring', { headers })).json();
    expect(history.find((match: { id: string }) => match.id === active.id).status).toBe('FINISHED');
    expect(
      (await db.brainMatch.findUniqueOrThrow({ where: { id: active.id } })).winnerId,
    ).toBeNull();
  } finally {
    await peerContext.close();
    await observerContext.close();
    await db.user.deleteMany({ where: { id: { in: ids } } });
  }
});
