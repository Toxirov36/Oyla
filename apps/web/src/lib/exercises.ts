import { translate as tx } from '../i18n';
export const exerciseLabels = {
  get MULTIPLE_CHOICE() {
    return tx('exercise.MULTIPLE_CHOICE');
  },
  get TRUE_FALSE() {
    return tx('exercise.TRUE_FALSE');
  },
  get TEXT() {
    return tx('exercise.TEXT');
  },
  get NUMERICAL() {
    return tx('exercise.NUMERICAL');
  },
  get FILL_GAP() {
    return tx('exercise.FILL_GAP');
  },
  get MATCH_PAIRS() {
    return tx('exercise.MATCH_PAIRS');
  },
  get SORT_ORDER() {
    return tx('exercise.SORT_ORDER');
  },
  get DRAG_DROP() {
    return tx('exercise.DRAG_DROP');
  },
  get FIND_MISTAKE() {
    return tx('exercise.FIND_MISTAKE');
  },
  get CODE_COMPLETION() {
    return tx('exercise.CODE_COMPLETION');
  },
  get DEBUG_CODE() {
    return tx('exercise.DEBUG_CODE');
  },
  get CONNECT_CONCEPT() {
    return tx('exercise.CONNECT_CONCEPT');
  },
  get LISTEN_ANSWER() {
    return tx('exercise.LISTEN_ANSWER');
  },
  get INTERACTIVE_IMAGE() {
    return tx('exercise.INTERACTIVE_IMAGE');
  },
  get MEMORY_CARDS() {
    return tx('exercise.MEMORY_CARDS');
  },
  get SPEAK() {
    return tx('exercise.SPEAK');
  },
  get DRAW() {
    return tx('exercise.DRAW');
  },
  get GEOMETRY() {
    return tx('exercise.GEOMETRY');
  },
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
export interface QuestionFeedbackDefinition {
  reason?: string;
  rule?: string;
  steps?: string[];
  example?: string;
  wrongAnswers?: { value: string; reason: string }[];
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
