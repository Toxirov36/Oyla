import { BadRequestException } from '@nestjs/common';

export interface GeneratedQuestionContent {
  text: string;
  options: string[];
  answerIndex: number;
  explanation: string;
  hint: string;
}

const clean = (value: unknown, max: number) =>
  typeof value === 'string' ? value.trim().slice(0, max) : '';

export function checkedGeneratedQuestions(value: unknown, count: number): GeneratedQuestionContent[] {
  const questions =
    value && typeof value === 'object' && !Array.isArray(value)
      ? (value as { questions?: unknown }).questions
      : undefined;
  if (!Array.isArray(questions) || questions.length !== count)
    throw new BadRequestException('AI kutilgan miqdordagi savollarni yaratolmadi. Qayta urinib ko‘ring.');

  const result = questions.map((raw): GeneratedQuestionContent => {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw))
      throw new BadRequestException('AI yaratgan savol formati noto‘g‘ri.');
    const item = raw as Record<string, unknown>;
    const text = clean(item.text, 5000);
    const explanation = clean(item.explanation, 5000);
    const hint = clean(item.hint, 2000);
    const options = Array.isArray(item.options)
      ? item.options.map((option) => clean(option, 1000))
      : [];
    const normalizedOptions = options.map((option) => option.normalize('NFKC').toLowerCase());
    if (
      text.length < 3 ||
      !explanation ||
      !hint ||
      options.length !== 4 ||
      options.some((option) => !option) ||
      new Set(normalizedOptions).size !== options.length ||
      !Number.isInteger(item.answerIndex) ||
      (item.answerIndex as number) < 0 ||
      (item.answerIndex as number) > 3
    )
      throw new BadRequestException('AI yaratgan savolda to‘rtta noyob variant va bitta to‘g‘ri javob bo‘lishi kerak.');
    return { text, options, answerIndex: item.answerIndex as number, explanation, hint };
  });
  if (new Set(result.map((item) => item.text.normalize('NFKC').toLowerCase())).size !== result.length)
    throw new BadRequestException('AI takroriy savollar yaratdi. Qayta urinib ko‘ring.');
  return result;
}
