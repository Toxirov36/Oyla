import type { ExerciseConfig, ExerciseGrading, ExerciseType } from './exercises';
import examples from './exercise-examples.json';
export interface ExerciseExample {
  text: string;
  answer?: string;
  options?: string[];
  config?: ExerciseConfig;
  grading?: ExerciseGrading;
  explanation: string;
}
export function exampleQuestion(type: ExerciseType) {
  const e = (examples as Record<string, ExerciseExample>)[type]!;
  return {
    lessonId: '00000000-0000-4000-8000-000000000001',
    type,
    text: e.text,
    answer: e.answer ?? 'structured',
    explanation: e.explanation,
    config: e.config,
    grading: e.grading,
    options: (e.options ?? []).map((text) => ({ text, value: text })),
    tolerance: 0.0001,
  };
}
export type PreviewDefinition = ReturnType<typeof exampleQuestion>;
