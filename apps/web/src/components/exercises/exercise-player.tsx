import { localizeText } from '../../i18n';
import { useI18n } from '../../i18n';
import { useEffect, useState } from 'react';
import { ArrowRight, Lightbulb, Target } from 'lucide-react';
import { api, errorText } from '../../lib/api';
import type { Attempt, Feedback, Result } from '../../lib/types';
import { isStructured, parsePayload } from '../../lib/exercises';
import { Button, Card, ProgressBar } from '../ui';
import { ExerciseRenderer, answerReady } from './exercise-renderer';
import { ExerciseFeedback } from './exercise-feedback';
export function ExercisePlayer({
  attempt,
  setAttempt,
  onComplete,
}: {
  attempt: Attempt;
  setAttempt: (attempt: Attempt) => void;
  onComplete: (result: Result) => void;
}) {
  const { t } = useI18n();
  const [index, setIndex] = useState(() => {
    if (attempt.resumeQuestionId) {
      const resumed = attempt.questions.findIndex((q) => q.id === attempt.resumeQuestionId);
      if (resumed !== -1) return resumed;
    }
    const n = attempt.questions.findIndex(
      (q) => !attempt.answers.some((a) => a.questionId === q.id),
    );
    return n === -1 ? attempt.questions.length - 1 : n;
  });
  const [value, setValue] = useState('');
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [showHint, setShowHint] = useState(false);
  const question = attempt.questions[index]!;
  const existing = attempt.answers.find((a) => a.questionId === question.id);
  useEffect(() => {
    const saved = attempt.answers.find((answer) => answer.questionId === question.id);
    const restored = saved?.feedbackSeen === false ? saved.feedback : null;
    try {
      setValue(
        restored?.submittedValue ??
          sessionStorage.getItem(`oyla:draft:${attempt.id}:${question.id}`) ??
          saved?.value ??
          '',
      );
    } catch {
      setValue(restored?.submittedValue ?? saved?.value ?? '');
    }
    setFeedback(restored ?? null);
    setShowHint(false);
    setError('');
  }, [index, attempt.id, question.id]);
  const answered = !!existing;
  const submit = async () => {
    if (!answerReady(question, value)) return;
    setBusy(true);
    setError('');
    try {
      const response = await api<Feedback>(`/attempts/${attempt.id}/answers`, {
        method: 'POST',
        body: {
          questionId: question.id,
          ...(isStructured(question.type) ? { payload: parsePayload(value) } : { value }),
        },
      });
      setFeedback(response);
      setAttempt({
        ...attempt,
        answers: existing
          ? attempt.answers.map((answer) =>
              answer.questionId === question.id
                ? { ...answer, feedback: response, feedbackSeen: false }
                : answer,
            )
          : [
              ...attempt.answers,
              {
                questionId: question.id,
                value,
                correct: response.correct,
                feedback: response,
                feedbackSeen: false,
              },
            ],
      });
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  };
  const next = async () => {
    setBusy(true);
    setError('');
    try {
      await api(`/attempts/${attempt.id}/feedback/continue`, {
        method: 'POST',
        body: { questionId: question.id },
      });
      setAttempt({
        ...attempt,
        answers: attempt.answers.map((answer) =>
          answer.questionId === question.id ? { ...answer, feedbackSeen: true } : answer,
        ),
      });
      if (index < attempt.questions.length - 1) {
        setIndex(index + 1);
        return;
      }
      const result = await api<Result>(`/attempts/${attempt.id}/complete`, { method: 'POST' });
      try {
        for (const q of attempt.questions)
          sessionStorage.removeItem(`oyla:draft:${attempt.id}:${q.id}`);
      } catch {
        /* The server result is saved even when browser storage is unavailable. */
      }
      onComplete(result);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="practice-layout exercise-player">
      {attempt.mode && attempt.mode !== 'STANDARD' && (
        <div className={`game-progress ${attempt.mode.toLowerCase()}`}>
          <span className="game-character" aria-hidden="true">
            {attempt.mode === 'BOSS_BATTLE' ? '🛡️' : '🚀'}
          </span>
          <div>
            <strong>
              {attempt.mode === 'BOSS_BATTLE' ? t('lesson.bossBattle') : t('lesson.miniGame')}
            </strong>
            <p>
              {t('exercise.gameProgress', {
                correct: attempt.answers.filter((a) => a.correct).length,
                remaining: attempt.questions.length - attempt.answers.length,
              })}
            </p>
            <ProgressBar
              value={
                (100 *
                  (attempt.mode === 'BOSS_BATTLE'
                    ? attempt.questions.length - attempt.answers.filter((a) => a.correct).length
                    : attempt.answers.filter((a) => a.correct).length)) /
                attempt.questions.length
              }
              tone="mint"
            />
          </div>
        </div>
      )}
      <div className="practice-header">
        <span className="eyebrow">
          {question.difficulty === 'HARD' ? 'CHALLENGE' : t('exercise.practiceTime')}
        </span>
        <span className="subtle">
          {t('exercise.questions', { index: index + 1, total: attempt.questions.length })}
        </span>
      </div>
      <ProgressBar value={(attempt.answers.length / attempt.questions.length) * 100} tone="mint" />
      <Card className="question-card">
        <div className="question-card-meta">
          <span className={`pill ${question.difficulty === 'HARD' ? 'warm' : ''}`}>
            {
              { EASY: t('exercise.easy'), MEDIUM: t('exercise.medium'), HARD: t('exercise.hard') }[
                question.difficulty
              ]
            }
          </span>
          <span>
            <Target size={16} />
            {t(`exercise.${question.type}`)}
          </span>
        </div>
        <h2>{question.text}</h2>
        <ExerciseRenderer
          key={question.id}
          question={question}
          value={value}
          setValue={(v) => {
            setValue(v);
            try {
              sessionStorage.setItem(`oyla:draft:${attempt.id}:${question.id}`, v);
            } catch {
              /* Storage may be unavailable in private browsing. */
            }
          }}
          disabled={busy || !!feedback}
        />
        {question.hint && !feedback && (
          <Button variant="ghost" onClick={() => setShowHint(!showHint)}>
            <Lightbulb size={17} />
            {t('exercise.hint')}
          </Button>
        )}
        {showHint && <p className="question-hint">{question.hint}</p>}
        {feedback && (
          <ExerciseFeedback
            feedback={feedback}
            next={() => void next()}
            nextLabel={
              index === attempt.questions.length - 1
                ? t('dashboard.viewResult')
                : t('exercise.next')
            }
            busy={busy}
            retry={() => {
              setFeedback(null);
              setValue('');
            }}
          />
        )}
        {existing && !feedback && <p className="subtle">{t('exercise.saved')}</p>}
        {error && (
          <div className="form-error" role="alert">
            {localizeText(error)}
          </div>
        )}
        <div className="question-actions">
          {!feedback && (
            <Button
              onClick={() => void submit()}
              busy={busy}
              disabled={!answerReady(question, value)}
            >
              {t('exercise.check')}
              <ArrowRight size={17} />
            </Button>
          )}
          {answered && !feedback && (
            <Button
              variant={feedback ? 'primary' : 'secondary'}
              onClick={() => void next()}
              busy={busy}
            >
              {index === attempt.questions.length - 1
                ? t('dashboard.viewResult')
                : t('exercise.next')}
              <ArrowRight size={17} />
            </Button>
          )}
        </div>
      </Card>
      <p className="practice-note">{t('exercise.note')}</p>
    </div>
  );
}
