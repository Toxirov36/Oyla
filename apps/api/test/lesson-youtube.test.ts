import 'reflect-metadata';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AdminService } from '../src/admin/admin.service';
import { youtubeVideoId } from '../src/admin/youtube';
import type { PrismaService } from '../src/common/prisma.service';

test('YouTube lesson links accept video formats and reject other hosts', () => {
  const id = 'dQw4w9WgXcQ';
  for (const link of [
    `https://www.youtube.com/watch?v=${id}`,
    `https://youtu.be/${id}?si=sample`,
    `https://youtube.com/shorts/${id}`,
    `https://www.youtube-nocookie.com/embed/${id}`,
  ])
    assert.equal(youtubeVideoId(link), id);

  for (const link of [
    `https://youtube.com.evil.example/watch?v=${id}`,
    `https://www.youtube.com/watch?v=invalid`,
    'https://www.youtube.com/playlist?list=PL123',
    `http://www.youtube.com/watch?v=${id}`,
  ])
    assert.throws(() => youtubeVideoId(link), /YouTube video havolasini/);
});

test('new video lessons get their order and internal defaults from the server', async () => {
  let saved: Record<string, unknown> | undefined;
  const db = {
    lesson: {
      findFirst: async () => ({ position: 2 }),
      create: async ({ data }: { data: Record<string, unknown> }) => {
        saved = data;
        return data;
      },
    },
  } as unknown as PrismaService;

  await new AdminService(db).createLesson({
    topicId: 'topic-id',
    title: 'Video lesson',
    youtubeUrl: 'https://youtu.be/dQw4w9WgXcQ',
  });

  assert.ok(saved);
  assert.equal(saved.youtubeId, 'dQw4w9WgXcQ');
  assert.equal(saved.position, 3);
  assert.equal(saved.duration, 0);
  assert.equal(saved.explanation, '');
  assert.equal(saved.example, '');
});
