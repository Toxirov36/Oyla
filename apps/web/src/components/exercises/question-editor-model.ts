import { translate as tx } from '../../i18n';
import type { AdminQuestion } from '../../lib/types';
import type { ExerciseConfig, ExerciseGrading, ExerciseType } from '../../lib/exercises';
import type { PreviewDefinition } from './exercise-preview';

export const pairTypes = ['MATCH_PAIRS', 'DRAG_DROP', 'CONNECT_CONCEPT', 'MEMORY_CARDS'];
export const pointTypes = ['DRAW', 'GEOMETRY', 'INTERACTIVE_IMAGE'];
export const lines = (s: string) =>
  s
    .split('\n')
    .map((v) => v.trim())
    .filter(Boolean);
export function fromDefinition(q: PreviewDefinition) {
  const c = q.config ?? {};
  const g = q.grading ?? {};
  let answer = q.answer;
  if (pairTypes.includes(q.type))
    answer =
      g.pairs
        ?.map(
          (p) =>
            `${(c.items?.findIndex((i) => i.id === p.left) ?? -1) + 1}:${(c.targets?.findIndex((i) => i.id === p.right) ?? -1) + 1}`,
        )
        .join('\n') ?? '';
  else if (q.type === 'SORT_ORDER' || q.type === 'FIND_MISTAKE')
    answer =
      g.values?.map((id) => (c.items?.findIndex((i) => i.id === id) ?? -1) + 1).join(', ') ?? '';
  else if (q.type === 'FILL_GAP') answer = g.values?.join('\n') ?? '';
  else if (pointTypes.includes(q.type))
    answer = g.points?.map((p) => `${p.x}, ${p.y}`).join('\n') ?? '';
  else if (g.text) answer = g.text;
  return {
    text: q.text,
    answer: answer ?? '',
    explanation: q.explanation,
    feedbackReason: q.feedback?.reason ?? '',
    feedbackRule: q.feedback?.rule ?? '',
    feedbackSteps: q.feedback?.steps?.join('\n') ?? '',
    feedbackExample: q.feedback?.example ?? '',
    items: c.items?.map((i) => i.text).join('\n') ?? '',
    targets: c.targets?.map((i) => i.text).join('\n') ?? '',
    slots: c.slots?.map((i) => i.text).join('\n') ?? '',
    code: c.code ?? '',
    audioText: c.audioText ?? '',
    audioUrl: c.audioUrl ?? '',
    language: c.language ?? 'en-US',
    imageUrl: c.imageUrl ?? '',
    imageAlt: c.imageAlt ?? '',
    markers: c.markers?.map((p) => `${p.x}, ${p.y}`).join('\n') ?? '',
    radius: String(g.radius ?? 5),
    optionsText: q.options.map((o) => o.text).join('\n'),
  };
}

export type EditorFields = ReturnType<typeof fromDefinition>;

/** Turns the editor's text fields into the exercise definition sent to the API. */
export function buildDefinition({
  type,
  fields,
  question,
  selectedLesson,
  tolerance,
  wrongReasons,
}: {
  type: ExerciseType;
  fields: EditorFields;
  question?: AdminQuestion;
  selectedLesson: string;
  tolerance: number;
  wrongReasons: Record<string, string>;
}): PreviewDefinition {
  const c: ExerciseConfig = {};
  const g: ExerciseGrading = {};
  const parsePoints = (text: string) =>
    lines(text).map((row) => {
      const [x, y] = row.split(',').map(Number);
      if (x === undefined || y === undefined || !Number.isFinite(x) || !Number.isFinite(y))
        throw Error(tx('pages.exercises.question-editor.enterCoordinatesInXYFormat'));
      return { x, y };
    });
  if (pairTypes.includes(type) || ['SORT_ORDER', 'FIND_MISTAKE'].includes(type))
    c.items = lines(fields.items).map((text, i) => ({ id: `i${i + 1}`, text }));
  if (pairTypes.includes(type)) {
    c.targets = lines(fields.targets).map((text, i) => ({ id: `t${i + 1}`, text }));
    g.pairs = lines(fields.answer).map((row) => {
      const [l, r] = row.split(':').map((v) => Number(v.trim()));
      return { left: `i${l}`, right: `t${r}` };
    });
  }
  if (type === 'SORT_ORDER' || type === 'FIND_MISTAKE')
    g.values = fields.answer.split(',').map((v) => `i${Number(v.trim())}`);
  if (type === 'FILL_GAP') {
    c.slots = lines(fields.slots).map((text, i) => ({ id: `s${i + 1}`, text }));
    g.values = lines(fields.answer);
  }
  if (['CODE_COMPLETION', 'DEBUG_CODE'].includes(type)) c.code = fields.code;
  if (['LISTEN_ANSWER', 'SPEAK'].includes(type)) {
    c.audioText = fields.audioText;
    c.language = fields.language;
    if (fields.audioUrl) c.audioUrl = fields.audioUrl;
  }
  if (['CODE_COMPLETION', 'DEBUG_CODE', 'LISTEN_ANSWER', 'SPEAK'].includes(type))
    g.text = fields.answer;
  if (pointTypes.includes(type)) {
    g.points = parsePoints(fields.answer);
    g.radius = Number(fields.radius);
    if (fields.markers) c.markers = parsePoints(fields.markers);
  }
  if (type === 'INTERACTIVE_IMAGE') {
    c.imageUrl = fields.imageUrl;
    c.imageAlt = fields.imageAlt;
  }
  const structured = Object.keys(g).length > 0;
  const options =
    type === 'MULTIPLE_CHOICE'
      ? lines(fields.optionsText).map((text) => ({
          text,
          value: question?.options.find((o) => o.text === text)?.value ?? text,
        }))
      : [];
  return {
    lessonId: selectedLesson,
    type,
    text: fields.text,
    answer: structured ? 'structured' : fields.answer,
    explanation: fields.explanation,
    options,
    tolerance,
    config: structured ? c : undefined,
    grading: structured ? g : undefined,
    feedback: {
      reason: fields.feedbackReason.trim(),
      rule: fields.feedbackRule.trim(),
      steps: lines(fields.feedbackSteps),
      example: fields.feedbackExample.trim(),
      wrongAnswers: options
        .filter((o) => o.value !== fields.answer.trim() && wrongReasons[o.value]?.trim())
        .map((o) => ({ value: o.value, reason: wrongReasons[o.value]!.trim() })),
    },
  };
}
