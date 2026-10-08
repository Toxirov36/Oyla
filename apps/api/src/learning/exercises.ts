import { BadRequestException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { ExerciseConfigDto, ExerciseGradingDto, ExercisePayloadDto } from './exercise.dto';

export const legacyTypes = ['MULTIPLE_CHOICE', 'TRUE_FALSE', 'NUMERICAL', 'TEXT'];
const pairing = ['MATCH_PAIRS', 'DRAG_DROP', 'CONNECT_CONCEPT', 'MEMORY_CARDS'];
const written = ['CODE_COMPLETION', 'DEBUG_CODE', 'LISTEN_ANSWER', 'SPEAK'];
const spatial = ['INTERACTIVE_IMAGE', 'DRAW', 'GEOMETRY'];
const normal = (s: string) => s.normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase();
const matches = (value: string, answer: string) =>
  answer.split('|').some((a) => normal(a) === normal(value));
export type ExerciseDefinition = { type: string; config?: unknown; grading?: unknown };

function validated<T extends object>(ctor: new () => T, input: unknown): T {
  if (!input || typeof input !== 'object' || Array.isArray(input))
    throw new BadRequestException('Mashq ma’lumotlari obyekt bo‘lishi kerak.');
  const dto = plainToInstance(ctor, input);
  if (
    validateSync(dto, { whitelist: true, forbidNonWhitelisted: true, forbidUnknownValues: true })
      .length
  )
    throw new BadRequestException('Mashq maydonlari yoki qiymatlari noto‘g‘ri.');
  return dto;
}
function ensure(ok: unknown, message: string): asserts ok {
  if (!ok) throw new BadRequestException(message);
}
const ids = (items?: { id: string; text: string }[]) => items?.map((i) => i.id) ?? [];
const unique = (items: string[]) => new Set(items).size === items.length;
const same = (a: string[], b: string[]) => a.length === b.length && a.every((v) => b.includes(v));
function safeMedia(url?: string) {
  if (!url) return;
  ensure(
    /^\/(?!\/)[\w/.-]+$/.test(url) || /^https:\/\//.test(url),
    'Media manzili HTTPS yoki mahalliy fayl bo‘lishi kerak.',
  );
  if (url.startsWith('https:')) {
    try {
      const u = new URL(url);
      ensure(!u.username && !u.password, 'Media manzilida login bo‘lmasin.');
    } catch {
      throw new BadRequestException('Media manzili noto‘g‘ri.');
    }
  }
}
export function validateExercise(q: ExerciseDefinition) {
  if (legacyTypes.includes(q.type)) return;
  const c = validated(ExerciseConfigDto, q.config);
  const g = validated(ExerciseGradingDto, q.grading);
  for (const list of [c.items, c.targets, c.slots])
    if (list)
      ensure(
        list.every((i) => /^[a-zA-Z0-9_-]{1,60}$/.test(i.id) && i.text.trim()) && unique(ids(list)),
        'Element identifikatorlari noyob, matnlari to‘ldirilgan bo‘lsin.',
      );
  safeMedia(c.imageUrl);
  safeMedia(c.audioUrl);
  const keys = Object.keys(g).filter((k) => g[k as keyof ExerciseGradingDto] !== undefined);
  const only = (...allowed: string[]) =>
    ensure(
      keys.every((k) => allowed.includes(k)),
      'Baholash maydonlari mashq turiga mos emas.',
    );
  if (pairing.includes(q.type)) {
    only('pairs');
    ensure(
      c.items && c.targets && c.items.length >= 2 && c.items.length === c.targets.length,
      'Kamida ikkita teng miqdordagi juftlik kerak.',
    );
    ensure(
      g.pairs &&
        same(
          g.pairs.map((p) => p.left),
          ids(c.items),
        ) &&
        same(
          g.pairs.map((p) => p.right),
          ids(c.targets),
        ) &&
        unique(g.pairs.map((p) => p.left)) &&
        unique(g.pairs.map((p) => p.right)),
      'Har bir elementga bitta mos juft belgilang.',
    );
  } else if (q.type === 'SORT_ORDER') {
    only('values');
    ensure(
      c.items &&
        c.items.length >= 2 &&
        g.values &&
        same(g.values, ids(c.items)) &&
        unique(g.values),
      'Tartib barcha elementlarni bir marta qamrashi kerak.',
    );
  } else if (q.type === 'FILL_GAP') {
    only('values');
    ensure(
      c.slots?.length &&
        g.values?.length === c.slots.length &&
        g.values.every((v) => v.split('|').every((a) => a.trim())),
      'Har bir bo‘shliq uchun javob kiriting.',
    );
  } else if (q.type === 'FIND_MISTAKE') {
    only('values');
    ensure(
      c.items &&
        c.items.length >= 2 &&
        g.values?.length === 1 &&
        ids(c.items).includes(g.values[0]!),
      'Xato variantni belgilang.',
    );
  } else if (written.includes(q.type)) {
    only('text');
    ensure(
      g.text?.trim() && g.text.split('|').every((a) => a.trim()),
      'Qabul qilinadigan javob kerak.',
    );
    if (['CODE_COMPLETION', 'DEBUG_CODE'].includes(q.type))
      ensure(c.code?.trim(), 'Kod namunasini kiriting.');
    if (['LISTEN_ANSWER', 'SPEAK'].includes(q.type))
      ensure(c.audioUrl || c.audioText?.trim(), 'Audio yoki o‘qiladigan matnni kiriting.');
  } else if (spatial.includes(q.type)) {
    only('points', 'radius');
    ensure(
      g.points?.length === (q.type === 'DRAW' ? 2 : 1),
      'Rasm/grafik uchun bitta nuqta, chiziq uchun ikkita nuqta kerak.',
    );
    if (q.type === 'INTERACTIVE_IMAGE')
      ensure(c.imageUrl && c.imageAlt?.trim(), 'Rasm va uning tavsifi kerak.');
  } else throw new BadRequestException('Mashq turi qo‘llab-quvvatlanmaydi.');
}

export function exercisePayload(type: string, value: string): ExercisePayloadDto {
  let raw: unknown;
  try {
    raw = JSON.parse(value);
  } catch {
    throw new BadRequestException('Tuzilmali javob noto‘g‘ri.');
  }
  const p = validated(ExercisePayloadDto, raw);
  const expected = pairing.includes(type)
    ? 'pairs'
    : spatial.includes(type)
      ? 'points'
      : written.includes(type)
        ? 'text'
        : 'values';
  ensure(
    Object.keys(raw as object).length === 1 && Object.hasOwn(raw as object, expected),
    'Javob formati mashq turiga mos emas.',
  );
  return p;
}
export function checkExercise(q: ExerciseDefinition, value: string) {
  const c = q.config as ExerciseConfigDto;
  const g = q.grading as ExerciseGradingDto;
  const p = exercisePayload(q.type, value);
  if (pairing.includes(q.type))
    return (
      !!p.pairs &&
      p.pairs.length === g.pairs?.length &&
      unique(p.pairs.map((x) => x.left)) &&
      unique(p.pairs.map((x) => x.right)) &&
      p.pairs.every((x) => g.pairs!.some((y) => x.left === y.left && x.right === y.right))
    );
  if (q.type === 'SORT_ORDER' || q.type === 'FIND_MISTAKE')
    return (
      !!p.values &&
      p.values.length === g.values?.length &&
      p.values.every((x, i) => x === g.values![i])
    );
  if (q.type === 'FILL_GAP')
    return (
      !!p.values &&
      p.values.length === c.slots?.length &&
      p.values.every((x, i) => matches(x, g.values![i]!))
    );
  if (q.type === 'CODE_COMPLETION')
    return (
      typeof p.text === 'string' && g.text!.split('|').some((a) => a.trim() === p.text!.trim())
    );
  if (q.type === 'DEBUG_CODE')
    return (
      typeof p.text === 'string' &&
      p.text.replace(/\r\n/g, '\n').trim() === g.text!.replace(/\r\n/g, '\n').trim()
    );
  if (written.includes(q.type)) return typeof p.text === 'string' && matches(p.text, g.text!);
  if (spatial.includes(q.type)) {
    if (p.points?.length !== g.points?.length) return false;
    const near = (points: NonNullable<ExercisePayloadDto['points']>) =>
      points.every(
        (x, i) => Math.hypot(x.x - g.points![i]!.x, x.y - g.points![i]!.y) <= (g.radius ?? 5),
      );
    return near(p.points!) || (q.type === 'DRAW' && near([...p.points!].reverse()));
  }
  return false;
}

export function publicSnapshot(q: Record<string, unknown>) {
  return Object.fromEntries(
    [
      'id',
      'lessonId',
      'text',
      'type',
      'difficulty',
      'hint',
      'xp',
      'position',
      'options',
      'version',
      'config',
    ].map((k) => [k, q[k]]),
  );
}
