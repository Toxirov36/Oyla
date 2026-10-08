import { BadRequestException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { ExerciseConfigDto, ExerciseGradingDto, ExercisePayloadDto } from './exercise.dto';
import { exercisePayload, legacyTypes } from './exercises';
import { QuestionFeedbackDto } from './feedback.dto';

export interface FeedbackQuestion {
  id?: string;
  type: string;
  answer: string;
  explanation: string;
  hint?: string | null;
  options?: { text: string; value: string }[];
  config?: unknown;
  grading?: unknown;
  feedback?: unknown;
}
const normal = (s: string) => s.normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase();
const primary = (s: string) => s.split('|')[0]!.trim();
const matches = (value: string, answers: string) =>
  answers.split('|').some((answer) => normal(value) === normal(answer));
const pairTypes = ['MATCH_PAIRS', 'DRAG_DROP', 'CONNECT_CONCEPT', 'MEMORY_CARDS'];

export function validateFeedback(q: FeedbackQuestion) {
  if (q.feedback == null) return;
  if (typeof q.feedback !== 'object' || Array.isArray(q.feedback))
    throw new BadRequestException('Javob izohi obyekt bo‘lishi kerak.');
  const dto = plainToInstance(QuestionFeedbackDto, q.feedback);
  if (
    validateSync(dto, { whitelist: true, forbidNonWhitelisted: true, forbidUnknownValues: true })
      .length
  )
    throw new BadRequestException('Javob izohi maydonlarini tekshiring.');
  const wrong = dto.wrongAnswers ?? [];
  if (
    (wrong.length && q.type !== 'MULTIPLE_CHOICE') ||
    new Set(wrong.map((item) => item.value)).size !== wrong.length ||
    wrong.some((item) => item.value === q.answer || !q.options?.some((o) => o.value === item.value))
  )
    throw new BadRequestException(
      'Xato izohini faqat mavjud noto‘g‘ri variantga bir marta kiriting.',
    );
}

function display(q: FeedbackQuestion, payload: ExercisePayloadDto | string, solution = false) {
  if (typeof payload === 'string') {
    if (q.type === 'MULTIPLE_CHOICE')
      return q.options?.find((option) => option.value === payload)?.text ?? payload;
    if (q.type === 'TRUE_FALSE')
      return payload === 'true' ? 'To‘g‘ri' : payload === 'false' ? 'Noto‘g‘ri' : payload;
    return solution ? primary(payload) : payload;
  }
  const c = (q.config ?? {}) as ExerciseConfigDto;
  const itemText = (id: string) =>
    c.items?.find((item) => item.id === id)?.text ?? 'Noma’lum element';
  const targetText = (id: string) =>
    c.targets?.find((item) => item.id === id)?.text ?? 'Noma’lum element';
  if (payload.pairs)
    return payload.pairs
      .map((pair) => `${itemText(pair.left)} → ${targetText(pair.right)}`)
      .join('\n');
  if (payload.values) {
    if (q.type === 'FILL_GAP')
      return payload.values
        .map(
          (value, i) =>
            `${i + 1}. ${c.slots?.[i]?.text ?? 'Bo‘shliq'}: ${solution ? primary(value) : value}`,
        )
        .join('\n');
    return payload.values.map(itemText).join(' → ');
  }
  if (payload.points)
    return payload.points
      .map((point, i) => `Nuqta ${i + 1}: x = ${point.x}%, y = ${point.y}%`)
      .join('\n');
  // Debug code can contain a literal | operator, rather than accepted alternatives.
  return solution && q.type !== 'DEBUG_CODE' ? primary(payload.text ?? '') : (payload.text ?? '');
}

function findIssues(q: FeedbackQuestion, submitted: ExercisePayloadDto) {
  const c = (q.config ?? {}) as ExerciseConfigDto;
  const g = (q.grading ?? {}) as ExerciseGradingDto;
  const issues: string[] = [];
  if (pairTypes.includes(q.type)) {
    for (const pair of submitted.pairs ?? []) {
      const left = c.items?.find((item) => item.id === pair.left);
      const right = c.targets?.find((item) => item.id === pair.right);
      const expected = g.pairs?.find((answer) => answer.left === pair.left);
      const target = c.targets?.find((item) => item.id === expected?.right);
      if (left && right && target && expected?.right !== pair.right)
        issues.push(
          `“${left.text}” va “${right.text}” mos juftlik emas. To‘g‘ri juft: ${left.text} → ${target.text}.`,
        );
    }
  } else if (q.type === 'SORT_ORDER') {
    const index = submitted.values?.findIndex((id, i) => id !== g.values?.[i]) ?? -1;
    const actual = c.items?.find((item) => item.id === submitted.values?.[index]);
    const expected = c.items?.find((item) => item.id === g.values?.[index]);
    if (index >= 0 && actual && expected)
      issues.push(
        `${index + 1}-o‘rinda “${actual.text}” qo‘yilgan. Bu o‘rinda “${expected.text}” bo‘lishi kerak.`,
      );
  } else if (q.type === 'FILL_GAP') {
    submitted.values?.forEach((value, i) => {
      if (g.values?.[i] && !matches(value, g.values[i]!))
        issues.push(
          `${i + 1}-bo‘shliqdagi “${value}” mos kelmadi. To‘g‘ri javob: ${primary(g.values[i]!)}.`,
        );
    });
  }
  // Numerical and free text answers alone cannot reveal the student's calculation/reasoning.
  return issues;
}

export function buildFeedback(
  q: FeedbackQuestion,
  value: string,
  correct: boolean,
  counted = false,
) {
  const authored = (q.feedback ?? {}) as QuestionFeedbackDto;
  const structured = !legacyTypes.includes(q.type);
  const submitted = structured ? exercisePayload(q.type, value) : value;
  const solution = structured ? (q.grading as ExerciseGradingDto) : q.answer;
  const issues = !correct && structured ? findIssues(q, submitted as ExercisePayloadDto) : [];
  const variantReason =
    q.type === 'MULTIPLE_CHOICE'
      ? authored.wrongAnswers?.find((item) => item.value === value)?.reason
      : undefined;
  return {
    questionId: q.id ?? 'preview',
    correct,
    counted,
    message: correct ? 'Ajoyib! To‘g‘ri javob.' : 'Keling, xatoni birga tushunamiz.',
    explanation: q.explanation,
    hint: q.hint ?? null,
    submittedValue: value,
    submittedAnswer: display(q, submitted),
    reason:
      variantReason ||
      authored.reason ||
      (issues.length
        ? issues[0]!
        : 'Javob to‘g‘ri yechimga mos kelmadi. Quyidagi qoida va yechim bilan solishtiring.'),
    rule: authored.rule?.trim() || q.explanation,
    correctAnswer: display(q, solution, true),
    steps: authored.steps ?? [],
    example: authored.example?.trim() || null,
    issues: variantReason ? [] : issues,
  };
}
