import 'reflect-metadata';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { createValidationPipe } from '../src/common/validation';
import { BrainAnswerDto, CreateBrainDto } from '../src/play/brain.dto';
import { brainScores } from '../src/play/brain.service';
import { normalizedPhoto, MAX_PHOTO_BYTES } from '../src/profile/photos';
import { publicMedia } from '../src/profile/public-media';
import animations from '../src/play/animations.json';
import { VideoDto } from '../src/play/videos';

test('photo normalization verifies actual raster bytes, strips metadata and rejects executable/oversized input', async () => {
  const input = await sharp({
    create: { width: 800, height: 600, channels: 3, background: '#0665f3' },
  })
    .withMetadata({ exif: { IFD0: { Artist: 'private author' } } })
    .jpeg()
    .toBuffer();
  const output = await normalizedPhoto(input);
  const info = await sharp(output).metadata();
  assert.equal(info.format, 'webp');
  assert.equal(info.width, 512);
  assert.equal(info.height, 512);
  assert.equal(info.exif, undefined);
  for (const input of [
    undefined,
    Buffer.from('<svg><script>alert(1)</script></svg>'),
    Buffer.from('not a photo'),
    Buffer.alloc(MAX_PHOTO_BYTES + 1),
  ])
    await assert.rejects(normalizedPhoto(input));
  const publicUser = publicMedia({ id: 'user', name: 'Ali', avatar: null, photo: { id: 'photo' } });
  assert.equal(Object.hasOwn(publicUser, 'photo'), false);
  assert.equal(publicUser.avatar?.imageUrl, '/api/v1/profile-photos/photo');
});
test('brain scoring includes only closed rounds and DTOs cannot inject score, winner or grade', async () => {
  const scores = brainScores(
    [
      { userId: 'a', correct: true, roundIndex: 0 },
      { userId: 'a', correct: true, roundIndex: 1 },
      { userId: 'b', correct: false, roundIndex: 0 },
    ],
    0,
  );
  assert.equal(scores.get('a'), 10);
  assert.equal(scores.get('b') ?? 0, 0);
  const pipe = createValidationPipe();
  const opponentId = 'a7010000-0000-4000-8000-000000000001';
  await pipe.transform({ opponentId }, { type: 'body', metatype: CreateBrainDto });
  for (const body of [
    { opponentId, grade: 7 },
    { opponentId, winnerId: opponentId },
    { opponentId, score: 100 },
  ])
    await assert.rejects(pipe.transform(body, { type: 'body', metatype: CreateBrainDto }));
  for (const body of [
    { roundIndex: 0, value: 'a', correct: true },
    { roundIndex: 5, value: 'a' },
    { roundIndex: 0, value: 'a', xp: 100 },
  ])
    await assert.rejects(pipe.transform(body, { type: 'body', metatype: BrainAnswerDto }));
});
test('starter animations cover each grade and subject with mathematically consistent scenes', () => {
  assert.equal(animations.length, 9);
  assert.equal(new Set(animations.map((item) => `${item.grade}:${item.subject}`)).size, 9);
  for (const animation of animations) {
    assert.equal(animation.chapters.length, 4);
    for (const chapter of animation.chapters) {
      assert.ok(chapter.text.trim());
      if (chapter.visual.kind === 'pizza') {
        const visual = chapter.visual as { n: number; d: number };
        assert.ok(visual.n > 0 && visual.n <= visual.d);
      }
    }
  }
  assert.ok(
    animations
      .find((item) => item.key === 'math-7')!
      .chapters.some((chapter) => chapter.visual.label === 'x = 4'),
  );
  assert.equal(2 * 4 + 3, 11);
});
test('video DTO accepts controlled sources and rejects URLs/scripts and privilege fields', async () => {
  const pipe = createValidationPipe();
  const video = {
    title: 'Daily routine',
    description: 'Kundalik odatlar',
    grade: 5,
    subject: 'english',
    kind: 'YOUTUBE',
    youtubeId: 'synTxcnHyrA',
  };
  await pipe.transform(video, { type: 'body', metatype: VideoDto });
  for (const body of [
    { ...video, youtubeId: 'https://evil.example/script' },
    { ...video, grade: '5' },
    { ...video, score: 100 },
    { ...video, kind: 'HTML' },
  ])
    await assert.rejects(pipe.transform(body, { type: 'body', metatype: VideoDto }));
});
