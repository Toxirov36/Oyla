import { localizeText } from '../../i18n';
import { translate as tx, useI18n as usePageLocale } from '../../i18n';
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Sparkles } from 'lucide-react';
import { api, errorText } from '../../lib/api';
import type { AdminQuestion } from '../../lib/types';
import { ComboboxField } from '../combobox-field';
import { Button } from '../ui';

type Difficulty = AdminQuestion['difficulty'];
type GeneratedQuestion = {
  id: string;
  text: string;
  answer: string;
  explanation: string;
  options: { text: string; value: string }[];
};

/** Asks the API to draft questions for a lesson with AI; drafts are saved server-side for review. */
export function AiQuestionGenerator({
  lessonId,
  difficulty,
  onDifficulty,
  close,
}: {
  lessonId: string;
  difficulty: Difficulty;
  onDifficulty: (value: Difficulty) => void;
  close: () => void;
}) {
  const { locale } = usePageLocale();
  const cache = useQueryClient();
  const [generating, setGenerating] = useState(false);
  const [generationCount, setGenerationCount] = useState(3);
  const [generatedQuestions, setGeneratedQuestions] = useState<GeneratedQuestion[]>([]);
  const [error, setError] = useState('');
  const generateQuestions = async () => {
    if (!lessonId) return;
    setError('');
    setGeneratedQuestions([]);
    setGenerating(true);
    try {
      const created = await api<GeneratedQuestion[]>('/admin/questions/generate', {
        method: 'POST',
        body: { lessonId, count: generationCount, difficulty, locale },
      });
      setGeneratedQuestions(created);
      await cache.invalidateQueries({ queryKey: ['admin', 'content'] });
    } catch (err) {
      setError(errorText(err));
    } finally {
      setGenerating(false);
    }
  };
  return (
    <section className="ai-question-generator" aria-label={tx('pages.admin.createQuestionsWithAi')}>
      <p>{tx('pages.admin.aiQuestionsUseLessonSubjectTopicAndGrade')}</p>
      <div className="ai-question-generator-controls">
        <label>
          {tx('pages.admin.numberOfQuestions')}
          <select
            value={generationCount}
            onChange={(event) => setGenerationCount(Number(event.target.value))}
          >
            {[1, 3, 5, 10].map((count) => (
              <option key={count} value={count}>
                {count}
              </option>
            ))}
          </select>
        </label>
        <label>
          {tx('pages.exercises.question-editor.difficulty')}
          <ComboboxField
            label={tx('pages.exercises.question-editor.difficulty')}
            value={difficulty}
            options={[
              {
                value: 'EASY',
                get label() {
                  return tx('exercise.easy');
                },
              },
              {
                value: 'MEDIUM',
                get label() {
                  return tx('exercise.medium');
                },
              },
              {
                value: 'HARD',
                get label() {
                  return tx('exercise.hard');
                },
              },
            ]}
            onChange={(value) => onDifficulty(value as Difficulty)}
          />
        </label>
      </div>
      <small className="field-help">
        {tx('pages.admin.aiGeneratedQuestionsAreSavedAsDraftForReview')}
      </small>
      <Button
        type="button"
        onClick={() => void generateQuestions()}
        busy={generating}
        disabled={!lessonId}
      >
        <Sparkles size={16} />
        {tx('pages.admin.generateQuestions')}
      </Button>
      {error && (
        <p className="form-error" role="alert">
          {localizeText(error)}
        </p>
      )}
      {generatedQuestions.length > 0 && (
        <div className="ai-question-generated-list" role="status">
          <strong>
            {tx('pages.admin.aiQuestionDraftsCreated', { value1: generatedQuestions.length })}
          </strong>
          {generatedQuestions.map((generated, index) => (
            <article key={generated.id}>
              <strong>
                {index + 1}. {generated.text}
              </strong>
              <ul>
                {generated.options.map((option) => (
                  <li
                    key={option.value}
                    className={option.value === generated.answer ? 'correct-option' : undefined}
                  >
                    {option.text}
                    {option.value === generated.answer
                      ? ` · ${tx('pages.admin.gamification.correctAnswer')}`
                      : ''}
                  </li>
                ))}
              </ul>
              <p>{generated.explanation}</p>
            </article>
          ))}
          <Button type="button" variant="secondary" onClick={close}>
            {tx('pages.admin.viewLessonQuestions')}
          </Button>
        </div>
      )}
    </section>
  );
}
