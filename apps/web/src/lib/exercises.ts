export const exerciseLabels = {
  MULTIPLE_CHOICE: 'Variantli savol',
  TRUE_FALSE: 'To‘g‘ri / noto‘g‘ri',
  TEXT: 'Matnli javob',
  NUMERICAL: 'Sonli javob',
  FILL_GAP: 'Bo‘shliqni to‘ldirish',
  MATCH_PAIRS: 'Juftliklarni topish',
  SORT_ORDER: 'Tartiblash',
  DRAG_DROP: 'Sudrab joylashtirish',
  FIND_MISTAKE: 'Xatoni topish',
  CODE_COMPLETION: 'Kodni to‘ldirish',
  DEBUG_CODE: 'Kodni tuzatish',
  CONNECT_CONCEPT: 'Tushunchalarni bog‘lash',
  LISTEN_ANSWER: 'Tinglash va javob berish',
  INTERACTIVE_IMAGE: 'Rasmda topish',
  MEMORY_CARDS: 'Xotira kartalari',
  SPEAK: 'Nutq mashqi',
  DRAW: 'Chiziq chizish',
  GEOMETRY: 'Geometriya va grafik',
} as const;
export type ExerciseType = keyof typeof exerciseLabels;
export interface ExerciseItem {
  id: string;
  text: string;
}
export interface ExercisePoint {
  x: number;
  y: number;
}
export interface ExerciseConfig {
  items?: ExerciseItem[];
  targets?: ExerciseItem[];
  slots?: ExerciseItem[];
  code?: string;
  audioText?: string;
  audioUrl?: string;
  imageUrl?: string;
  imageAlt?: string;
  language?: string;
  markers?: ExercisePoint[];
}
export interface ExercisePayload {
  text?: string;
  values?: string[];
  pairs?: { left: string; right: string }[];
  points?: ExercisePoint[];
}
export interface ExerciseGrading extends ExercisePayload {
  radius?: number;
}
export const isStructured = (type: string) =>
  !['MULTIPLE_CHOICE', 'TRUE_FALSE', 'NUMERICAL', 'TEXT'].includes(type);
export function parsePayload(value: string): ExercisePayload {
  try {
    return JSON.parse(value) as ExercisePayload;
  } catch {
    return {};
  }
}
export function shuffled<T>(items: T[], seed: string): T[] {
  let n = [...seed].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7919);
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    n = (Math.imul(n, 1664525) + 1013904223) >>> 0;
    const j = n % (i + 1);
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}
