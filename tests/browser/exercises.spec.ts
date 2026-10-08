import { randomUUID } from 'node:crypto';
import type { Locator } from '@playwright/test';
import { test, expect, db, origin } from './fixtures';
import {
  exerciseLabels,
  type ExerciseType,
  type ExercisePayload,
} from '../../apps/web/src/lib/exercises';
import { exampleQuestion, type PreviewDefinition } from '../../apps/web/src/lib/exercise-examples';
import type { Prisma, QuestionType } from '../../apps/api/generated/prisma/client';

async function fillExercise(root: Locator, definition: PreviewDefinition) {
  const { type, grading: g, config: c } = definition;
  if (type === 'MULTIPLE_CHOICE') {
    await root
      .getByRole('radio')
      .nth(definition.options.findIndex((o) => o.value === definition.answer))
      .check();
    return;
  }
  if (type === 'TRUE_FALSE') {
    await root
      .getByRole('radio')
      .nth(definition.answer === 'true' ? 0 : 1)
      .check();
    return;
  }
  if (type === 'TEXT' || type === 'NUMERICAL') {
    await root.getByLabel('Javobingiz', { exact: true }).fill(definition.answer.split('|')[0]!);
    return;
  }
  if (type === 'FILL_GAP') {
    for (const [i, slot] of c!.slots!.entries())
      await root.getByLabel(slot.text, { exact: true }).fill(g!.values![i]!.split('|')[0]!);
    return;
  }
  if (g?.pairs) {
    if (type === 'MEMORY_CARDS') {
      for (const side of ['Chap', 'O‘ng']) {
        const buttons = root.getByRole('button', { name: new RegExp(`^${side} karta`) });
        while (await buttons.count()) await buttons.first().click();
      }
    }
    for (const pair of g.pairs) {
      await root
        .getByRole('button', { name: c!.items!.find((i) => i.id === pair.left)!.text, exact: true })
        .click();
      await root
        .getByRole('button', {
          name: c!.targets!.find((i) => i.id === pair.right)!.text,
          exact: true,
        })
        .click();
    }
    return;
  }
  if (type === 'SORT_ORDER') {
    for (const [target, id] of g!.values!.entries()) {
      const text = c!.items!.find((i) => i.id === id)!.text;
      const rows = root.locator('.sort-exercise li');
      let index = (await rows.locator('strong').allTextContents()).indexOf(text);
      while (index > target) {
        await rows
          .nth(index)
          .getByRole('button', { name: /yuqoriga/ })
          .click();
        index--;
      }
    }
    return;
  }
  if (type === 'FIND_MISTAKE') {
    await root
      .getByRole('button', {
        name: new RegExp(
          c!
            .items!.find((i) => i.id === g!.values![0])!
            .text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
        ),
      })
      .click();
    return;
  }
  if (g?.points) {
    for (const [i, p] of g.points.entries()) {
      await root
        .getByRole('spinbutton', { name: `${i + 1}-nuqta x`, exact: true })
        .fill(String(p.x));
      await root
        .getByRole('spinbutton', { name: `${i + 1}-nuqta y`, exact: true })
        .fill(String(p.y));
    }
    return;
  }
  await root
    .getByLabel(
      type === 'SPEAK' ? 'Aytilgan matn' : type === 'DEBUG_CODE' ? 'Tuzatilgan kod' : 'Javobingiz',
      { exact: true },
    )
    .fill(g!.text!.split('|')[0]!);
}

test('admin catalog: all 18 renderers and both game modes work with real server validation', async ({
  page,
  learner,
}, info) => {
  test.setTimeout(180000);
  await db.user.update({ where: { id: learner.user.id }, data: { role: 'ADMIN' } });
  await page.request.post('/api/v1/auth/login', {
    headers: { Origin: origin },
    data: { email: learner.user.email, password: learner.password },
  });
  await page.goto('/admin/exercises');
  await expect(page.locator('.exercise-catalog button')).toHaveCount(20);
  for (const [type, label] of Object.entries(exerciseLabels)) {
    await page
      .locator('.exercise-catalog')
      .getByRole('button', { name: new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) })
      .click();
    const dialog = page.getByRole('dialog');
    await fillExercise(dialog, exampleQuestion(type as ExerciseType));
    await dialog.getByRole('button', { name: 'Tekshirish', exact: true }).click();
    await expect(dialog.getByText('To‘g‘ri!', { exact: true })).toBeVisible();
    if (type === 'MATCH_PAIRS') await page.screenshot({ path: info.outputPath('match-pairs.png') });
    await dialog.getByRole('button', { name: 'Yopish', exact: true }).click();
  }
  for (const label of ['Bilim parvozi', 'Mavzu sinovi']) {
    await page
      .locator('.exercise-catalog')
      .getByRole('button', { name: new RegExp(label) })
      .click();
    const dialog = page.getByRole('dialog');
    for (const type of ['MULTIPLE_CHOICE', 'NUMERICAL', 'TEXT'] as const) {
      await expect(
        dialog.getByRole('heading', { name: exampleQuestion(type).text, exact: true }),
      ).toBeVisible();
      await fillExercise(dialog, exampleQuestion(type));
      await expect(dialog.getByRole('button', { name: 'Tekshirish', exact: true })).toBeEnabled();
      await dialog.getByRole('button', { name: 'Tekshirish', exact: true }).click();
      await expect(dialog.getByText('To‘g‘ri!', { exact: true })).toBeVisible();
      await dialog.getByRole('button', { name: 'Davom etish', exact: true }).click();
    }
    await expect(dialog.getByText('Sinov yakunlandi!', { exact: true })).toBeVisible();
    await dialog.getByRole('button', { name: 'Yopish', exact: true }).click();
  }
  expect(await db.xpTransaction.count({ where: { userId: learner.user.id } })).toBe(0);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: info.outputPath('exercise-catalog-mobile.png'), fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});

test('student structured answers survive edits and refresh, unlock lessons, and award XP once', async ({
  page,
  learner,
}, info) => {
  test.setTimeout(150000);
  const suffix = randomUUID();
  const subject = await db.subject.create({
    data: {
      slug: `exercise-${suffix}`,
      title: 'Interaktiv fan',
      description: 'Interaktiv mashqlar sinovi',
      status: 'PUBLISHED',
    },
  });
  const course = await db.course.create({
    data: { subjectId: subject.id, title: '6-sinf interaktiv', grade: 6, status: 'PUBLISHED' },
  });
  const topic = await db.topic.create({
    data: { courseId: course.id, title: 'Bilim sayohati', status: 'PUBLISHED' },
  });
  const first = await db.lesson.create({
    data: {
      topicId: topic.id,
      title: 'Interaktiv dars',
      explanation: 'Interaktiv mashqlar orqali bilimni mustahkamlaymiz.',
      example: 'Savolni o‘qing va mos javobni tanlang.',
      status: 'PUBLISHED',
    },
  });
  const second = await db.lesson.create({
    data: {
      topicId: topic.id,
      title: 'Keyingi bosqich',
      explanation: 'Yangi mavzuga o‘tish uchun oldingi darsni yakunlang.',
      example: 'Darslarni ketma-ket bajaring.',
      position: 1,
      status: 'PUBLISHED',
      prerequisiteId: first.id,
      unlockScore: 70,
    },
  });
  const headers = { Origin: origin, Authorization: `Bearer ${learner.token}` };
  try {
    const types = ['FILL_GAP', 'MATCH_PAIRS', 'SORT_ORDER', 'DRAW'] as const;
    const questions = [];
    for (const [position, type] of types.entries()) {
      const d = exampleQuestion(type);
      questions.push(
        await db.question.create({
          data: {
            lessonId: first.id,
            text: d.text,
            type: type as QuestionType,
            answer: d.answer,
            explanation: d.explanation,
            config: d.config as Prisma.InputJsonValue,
            grading: d.grading as Prisma.InputJsonValue,
            status: 'PUBLISHED',
            position,
          },
        }),
      );
    }
    expect((await page.request.get(`/api/v1/lessons/${second.id}`, { headers })).status()).toBe(
      403,
    );
    expect(
      (
        await page.request.post('/api/v1/attempts', { headers, data: { lessonId: second.id } })
      ).status(),
    ).toBe(403);
    await page.goto(`/subjects/${subject.id}`);
    await expect(page.getByText('Oldingi darsdan 70% oling')).toBeVisible();
    await page.screenshot({ path: info.outputPath('lesson-path-desktop.png'), fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: info.outputPath('lesson-path-mobile.png'), fullPage: true });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.getByRole('link', { name: /Interaktiv dars/ }).click();
    await page.getByRole('button', { name: 'Misolni ko‘rish', exact: true }).click();
    await page.getByRole('radio', { name: 'Mavzu sinovi', exact: true }).check();
    await page.getByRole('button', { name: 'Mashqni boshlash', exact: true }).click();
    const player = page.locator('.exercise-player');
    await expect(
      player.getByRole('heading', { name: exampleQuestion('FILL_GAP').text, exact: true }),
    ).toBeVisible();
    const attempt = await db.attempt.findFirstOrThrow({
      where: { userId: learner.user.id, lessonId: first.id },
    });
    await db.question.update({
      where: { id: questions[0]!.id },
      data: {
        grading: { values: ['goes'] },
        text: 'Changed after attempt',
        version: { increment: 1 },
        xp: 999,
      },
    });
    await player.getByLabel('Mos fe’lni yozing', { exact: true }).fill('go');
    await page.reload();
    await expect(player.getByLabel('Mos fe’lni yozing', { exact: true })).toHaveValue('go');
    const snapshot = await (
      await page.request.get(`/api/v1/attempts/${attempt.id}`, { headers })
    ).json();
    expect(snapshot.questionsSnapshot).toBeUndefined();
    expect(snapshot.questions[0].grading).toBeUndefined();
    expect(snapshot.questions[0].answer).toBeUndefined();
    expect(snapshot.questions[0].version).toBe(1);
    for (const [i, type] of types.entries()) {
      await fillExercise(player, exampleQuestion(type));
      await player.getByRole('button', { name: 'Javobni tekshirish' }).click();
      await expect(player.getByText('Ajoyib! To‘g‘ri javob.', { exact: true })).toBeVisible();
      if (type === 'DRAW')
        await page.screenshot({
          path: info.outputPath('exercise-draw-mobile.png'),
          fullPage: true,
        });
      await player
        .getByRole('button', {
          name: i === types.length - 1 ? 'Natijani ko‘rish' : 'Keyingi savol',
          exact: true,
        })
        .click();
    }
    await expect(page.getByRole('heading', { name: 'Ajoyib natija!' })).toBeVisible();
    await page.screenshot({ path: info.outputPath('exercise-result-mobile.png'), fullPage: true });
    const duplicate = await page.request.post(`/api/v1/attempts/${attempt.id}/complete`, {
      headers,
    });
    expect(duplicate.status()).toBe(201);
    const result = await duplicate.json();
    expect(result.score).toBe(100);
    expect(result.earnedXp).toBeLessThan(999);
    expect(result.nextLesson.id).toBe(second.id);
    expect(
      await db.xpTransaction.count({
        where: { userId: learner.user.id, sourceKey: `lesson:${first.id}` },
      }),
    ).toBe(1);
    expect((await page.request.get(`/api/v1/lessons/${second.id}`, { headers })).status()).toBe(
      200,
    );
    const stored = await db.attemptAnswer.findMany({ where: { attemptId: attempt.id } });
    expect(stored.every((a) => !!a.payload)).toBe(true);
    const malicious: ExercisePayload & { xp: number } = { values: ['go'], xp: 1000 };
    expect(
      (
        await page.request.post(`/api/v1/attempts/${attempt.id}/answers`, {
          headers,
          data: { questionId: questions[0]!.id, payload: malicious },
        })
      ).status(),
    ).toBe(400);
  } finally {
    await db.attempt.deleteMany({ where: { lessonId: { in: [first.id, second.id] } } });
    await db.progress.deleteMany({ where: { lessonId: { in: [first.id, second.id] } } });
    await db.question.deleteMany({ where: { lessonId: { in: [first.id, second.id] } } });
    await db.lesson.delete({ where: { id: second.id } });
    await db.lesson.delete({ where: { id: first.id } });
    await db.topic.delete({ where: { id: topic.id } });
    await db.course.delete({ where: { id: course.id } });
    await db.subject.delete({ where: { id: subject.id } });
  }
});

test('admin creates and previews structured content without an accidental form submission', async ({
  page,
  learner,
}) => {
  await db.user.update({ where: { id: learner.user.id }, data: { role: 'ADMIN' } });
  await page.request.post('/api/v1/auth/login', {
    headers: { Origin: origin },
    data: { email: learner.user.email, password: learner.password },
  });
  const suffix = randomUUID();
  const subject = await db.subject.create({
    data: {
      slug: `editor-${suffix}`,
      title: 'Editor sinovi',
      description: 'Mashq yaratish sinovi',
      status: 'PUBLISHED',
    },
  });
  const course = await db.course.create({
    data: { subjectId: subject.id, title: 'Editor kursi', grade: 6, status: 'PUBLISHED' },
  });
  const topic = await db.topic.create({
    data: { courseId: course.id, title: 'Editor mavzusi', status: 'PUBLISHED' },
  });
  const lesson = await db.lesson.create({
    data: {
      topicId: topic.id,
      title: `Editor darsi ${suffix}`,
      explanation: 'Interaktiv mashqni yaratish va oldindan tekshirish.',
      example: 'Mos so‘zni bo‘shliqqa kiriting.',
    },
  });
  try {
    await page.goto('/admin/content');
    const node = page
      .locator('.content-lesson')
      .filter({ has: page.getByText(lesson.title, { exact: true }) });
    await node.locator('summary').click();
    await node.getByRole('button', { name: 'Savol qo‘shish', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Savol yaratish', exact: true });
    const type = dialog.getByRole('combobox', { name: 'Savol turi', exact: true });
    await type.fill('Bo‘shliq');
    await dialog.getByRole('option', { name: 'Bo‘shliqni to‘ldirish', exact: true }).click();
    await expect(dialog.getByRole('textbox', { name: 'Savol matni', exact: true })).toHaveValue(
      'I ___ to school every day.',
    );
    await dialog.getByRole('button', { name: 'O‘quvchi ko‘rinishida sinash', exact: true }).click();
    const preview = dialog.locator('.exercise-preview');
    await preview.getByLabel('Mos fe’lni yozing', { exact: true }).fill('go');
    await preview.getByRole('button', { name: 'Tekshirish', exact: true }).click();
    await expect(preview.getByText('To‘g‘ri!', { exact: true })).toBeVisible();
    expect(await db.question.count({ where: { lessonId: lesson.id } })).toBe(0);
    await dialog.getByRole('button', { name: 'Saqlash', exact: true }).click();
    await expect(dialog).toBeHidden();
    const q = await db.question.findFirstOrThrow({ where: { lessonId: lesson.id } });
    expect(q.type).toBe('FILL_GAP');
    expect(q.grading).toEqual({ values: ['go'] });
    expect(q.version).toBe(1);
    const session = await page.request.post('/api/v1/auth/login', {
      headers: { Origin: origin },
      data: { email: learner.user.email, password: learner.password },
    });
    const { accessToken } = await session.json();
    const headers = { Origin: origin, Authorization: `Bearer ${accessToken}` };
    const invalid = await page.request.patch(`/api/v1/admin/questions/${q.id}`, {
      headers,
      data: { grading: { values: ['go'], xp: 999 } },
    });
    expect(invalid.status()).toBe(400);
    const updated = await page.request.patch(`/api/v1/admin/questions/${q.id}`, {
      headers,
      data: { grading: { values: ['walk'] } },
    });
    expect(updated.status()).toBe(200);
    expect((await updated.json()).version).toBe(2);
    expect(
      (
        await page.request.post('/api/v1/admin/exercise-preview', {
          headers,
          data: { value: '{}' },
        })
      ).status(),
    ).toBe(400);
  } finally {
    await db.question.deleteMany({ where: { lessonId: lesson.id } });
    await db.lesson.delete({ where: { id: lesson.id } });
    await db.topic.delete({ where: { id: topic.id } });
    await db.course.delete({ where: { id: course.id } });
    await db.subject.delete({ where: { id: subject.id } });
  }
});
