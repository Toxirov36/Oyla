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
  const memoryRound = await db.memoryRound.findFirstOrThrow({
    where: { userId: learner.user.id, subject: 'english', status: 'ACTIVE' },
    orderBy: { createdAt: 'desc' },
  });
  const roundCards = memoryRound.cards as { key: number; text: string }[];
  for (const [turn, key] of [...new Set(roundCards.map((card) => card.key))].entries()) {
    const cards = page.locator('.memory-card');
    const pairIndices = roundCards.flatMap((card, index) => card.key === key ? [index] : []);
    expect(pairIndices).toHaveLength(2);
    const left = pairIndices[0]!;
    const right = pairIndices[1]!;
    await cards.nth(left).click();
    await expect(cards.nth(left).locator('span')).toBeVisible();
    await cards.nth(right).click();
    if (turn < 3) await expect(page.locator('.memory-card.is-matched')).toHaveCount((turn + 1) * 2);
  }
  await expect(
    page.getByRole('heading', { name: 'Bilim bog‘ingiz gulladi!', exact: true }),
  ).toBeVisible();
  expect(await db.xpTransaction.count({ where: { userId: learner.user.id } })).toBe(0);
  await page.getByRole('button', { name: 'Keyingi raund', exact: true }).click();
  await expect(page.locator('.memory-card')).toHaveCount(10);
  await expect(page.getByText('2-bosqich', { exact: true })).toBeVisible();
  const nextRound = await db.memoryRound.findFirstOrThrow({
    where: { userId: learner.user.id, subject: 'english', status: 'ACTIVE' },
  });
  await page.reload();
  await expect(page.locator('.memory-card')).toHaveCount(10);
  expect((await db.memoryRound.findFirstOrThrow({
    where: { userId: learner.user.id, subject: 'english', status: 'ACTIVE' },
  })).id).toBe(nextRound.id);
});

test('memory rounds reject client authority and count a repeated guess only once', async ({ page, learner }) => {
  const headers = { Origin: origin, Authorization: `Bearer ${learner.token}` };
  expect((await page.request.post('/api/v1/memory/rounds', {
    headers, data: { subject: 'english', grade: 7 },
  })).status()).toBe(400);
  expect((await page.request.post('/api/v1/memory/rounds', {
    headers, data: { subject: 'english', stage: 3 },
  })).status()).toBe(400);
  const response = await page.request.post('/api/v1/memory/rounds', {
    headers, data: { subject: 'english' },
  });
  expect(response.status()).toBe(201);
  const round = await response.json() as { id: string; cards: { id: string; text: string }[] };
  expect(JSON.stringify(round)).not.toContain('"key"');
  const saved = await db.memoryRound.findUniqueOrThrow({ where: { id: round.id } });
  const cards = saved.cards as { id: string; key: number }[];
  const first = cards[0]!;
  const second = cards.find((card) => card.key === first.key && card.id !== first.id)!;
  expect((await page.request.post(`/api/v1/memory/rounds/${round.id}/guesses`, {
    headers, data: { requestId: randomUUID(), firstId: first.id, secondId: first.id },
  })).status()).toBe(400);
  const requestId = randomUUID();
  const guess = { requestId, firstId: first.id, secondId: second.id };
  const accepted = await page.request.post(`/api/v1/memory/rounds/${round.id}/guesses`, { headers, data: guess });
  expect(accepted.status()).toBe(201);
  expect((await accepted.json()).moves).toBe(1);
  const repeated = await page.request.post(`/api/v1/memory/rounds/${round.id}/guesses`, { headers, data: guess });
  expect((await repeated.json()).moves).toBe(1);
  expect((await db.memoryGuess.count({ where: { roundId: round.id } }))).toBe(1);
  expect((await page.request.post(`/api/v1/memory/rounds/${round.id}/report`, {
    headers, data: { reason: 'WRONG_PAIR' },
  })).status()).toBe(201);
  expect((await page.request.get('/api/v1/admin/memory/reports', { headers })).status()).toBe(403);
  let activeId = round.id;
  for (const expectedPairs of [5, 6]) {
    const current = await db.memoryRound.findUniqueOrThrow({ where: { id: activeId } });
    const currentCards = current.cards as { id: string; key: number }[];
    for (const key of [...new Set(currentCards.map((card) => card.key))]) {
      if (current.matchedKeys.includes(key)) continue;
      const pair = currentCards.filter((card) => card.key === key);
      expect((await page.request.post(`/api/v1/memory/rounds/${activeId}/guesses`, {
        headers, data: { requestId: randomUUID(), firstId: pair[0]!.id, secondId: pair[1]!.id },
      })).status()).toBe(201);
    }
    const next = await page.request.post('/api/v1/memory/rounds', {
      headers, data: { subject: 'english' },
    });
    const nextRound = await next.json() as { id: string; pairCount: number };
    expect(nextRound.pairCount).toBe(expectedPairs);
    activeId = nextRound.id;
  }
  expect((await db.memoryProgress.findUniqueOrThrow({
    where: { userId_subject: { userId: learner.user.id, subject: 'english' } },
  })).stage).toBe(3);
  const finalRound = await db.memoryRound.findUniqueOrThrow({ where: { id: activeId } });
  const finalCards = finalRound.cards as { id: string; key: number }[];
  for (const key of [...new Set(finalCards.map((card) => card.key))]) {
    const pair = finalCards.filter((card) => card.key === key);
    expect((await page.request.post(`/api/v1/memory/rounds/${activeId}/guesses`, {
      headers, data: { requestId: randomUUID(), firstId: pair[0]!.id, secondId: pair[1]!.id },
    })).status()).toBe(201);
  }
  const replay = await page.request.post('/api/v1/memory/rounds', {
    headers, data: { subject: 'english', stage: 1 },
  });
  expect(replay.status()).toBe(201);
  expect((await replay.json() as { stage: number; pairCount: number })).toMatchObject({ stage: 1, pairCount: 4 });
  expect((await db.memoryProgress.findUniqueOrThrow({
    where: { userId_subject: { userId: learner.user.id, subject: 'english' } },
  })).stage).toBe(3);
});

test('admin sees memory card reports without approving generated decks', async ({ page, learner }) => {
  const headers = { Origin: origin, Authorization: `Bearer ${learner.token}` };
  const started = await page.request.post('/api/v1/memory/rounds', {
    headers, data: { subject: 'mathematics' },
  });
  const round = await started.json() as { id: string };
  await page.request.post(`/api/v1/memory/rounds/${round.id}/report`, {
    headers, data: { reason: 'WRONG_PAIR' },
  });
  await db.user.update({ where: { id: learner.user.id }, data: { role: 'ADMIN' } });
  const login = await page.request.post('/api/v1/auth/login', {
    headers: { Origin: origin },
    data: { email: learner.user.email, password: learner.password },
  });
  expect(login.status()).toBe(201);
  await page.goto('/admin/memory');
  await expect(page.getByRole('heading', { name: 'Bilim bog‘i AI' })).toBeVisible();
  await expect(page.getByText('Gemini API kaliti sozlanmagan. Zaxira kartalar ishlayapti.')).toBeVisible();
  await expect(page.getByText('Browser Learner · WRONG_PAIR')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Arxivlash' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Ko‘rib chiqildi' }).click();
  await expect(page.getByText('Hozircha xabar yo‘q.')).toBeVisible();
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
