import { localizeText } from '../../i18n';
import { translate as tx, useI18n as usePageLocale } from '../../i18n';
import { useState } from 'react';
import { api, errorText } from '../../lib/api';
import type { Feedback, Question } from '../../lib/types';
import { ExerciseFeedback } from './exercise-feedback';
import { exampleQuestion, type PreviewDefinition } from '../../lib/exercise-examples';
export { exampleQuestion, type PreviewDefinition } from '../../lib/exercise-examples';
import { Button, ProgressBar } from '../ui';
import { ExerciseRenderer, answerReady } from './exercise-renderer';

export function ExercisePreview({
  definition,
  mode = 'STANDARD',
}: {
  definition: PreviewDefinition;
  mode?: string;
}) {
  usePageLocale();
  const [value, setValue] = useState('');
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [round, setRound] = useState(0);
  const game = mode !== 'STANDARD';
  const current = game
    ? exampleQuestion((['MULTIPLE_CHOICE', 'NUMERICAL', 'TEXT'] as const)[round % 3]!)
    : definition;
  const q = {
    ...current,
    id: `preview-${current.type}-${round}`,
    version: 1,
    difficulty: 'MEDIUM',
    hint: null,
    xp: 0,
    position: 0,
    options: current.options.map((o, i) => ({ ...o, id: String(i) })),
  } as Question;
  return (
    <div className="exercise-preview">
      <span className="pill">{tx('pages.exercises.exercise-preview.previewModeNoXpAwarded')}</span>
      {game && (
        <div className="game-progress">
          <span className="game-character">{mode === 'BOSS_BATTLE' ? '🛡️' : '🚀'}</span>
          <div>
            <strong>
              {mode === 'BOSS_BATTLE' ? tx('lesson.bossBattle') : tx('lesson.miniGame')}
            </strong>
            <ProgressBar
              value={((mode === 'BOSS_BATTLE' ? 3 - round : round) / 3) * 100}
              tone="mint"
            />
          </div>
        </div>
      )}
      {round < 3 ? (
        <>
          <h3>{current.text}</h3>
          <ExerciseRenderer
            key={q.id}
            question={q}
            value={value}
            setValue={setValue}
            disabled={busy || !!feedback}
          />
          {feedback && (
            <ExerciseFeedback
              feedback={feedback}
              retry={() => {
                setFeedback(null);
                setValue('');
              }}
            />
          )}
          {error && (
            <p role="alert" className="form-error">
              {localizeText(error)}
            </p>
          )}
          <div className="modal-actions">
            {feedback ? (
              <Button
                type="button"
                onClick={() => {
                  setFeedback(null);
                  setValue('');
                  if (game && feedback.correct) setRound((v) => v + 1);
                }}
              >
                {' '}
                {game && feedback.correct
                  ? tx('common.continue')
                  : tx('pages.exercises.exercise-preview.tryAgain')}
              </Button>
            ) : (
              <Button
                type="button"
                disabled={!answerReady(q, value)}
                busy={busy}
                onClick={async () => {
                  setBusy(true);
                  setError('');
                  try {
                    setFeedback(
                      await api('/admin/exercise-preview', {
                        method: 'POST',
                        body: { question: current, value },
                      }),
                    );
                  } catch (e) {
                    setError(errorText(e));
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                {tx('pages.exercises.exercise-preview.check')}
              </Button>
            )}
          </div>
        </>
      ) : (
        <>
          <h3>{tx('pages.exercises.exercise-preview.previewCompleted')}</h3>
          <p>{tx('pages.exercises.exercise-preview.threeTasksCompletedInAStudentLessonResults')}</p>
          <Button
            type="button"
            onClick={() => {
              setRound(0);
              setValue('');
              setFeedback(null);
            }}
          >
            {tx('pages.exercises.exercise-preview.startAgain')}
          </Button>
        </>
      )}
    </div>
  );
}
