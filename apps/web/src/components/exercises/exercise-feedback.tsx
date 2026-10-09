import { useI18n, localizeText } from '../../i18n';
import { ArrowRight, CheckCircle2, Lightbulb, RotateCcw } from 'lucide-react';
import type { Feedback } from '../../lib/types';
import { Button } from '../ui';
function ExplanationText({ text }: { text: string }) {
  const { t } = useI18n();
  text = localizeText(text);
  if (text.length <= 400) return <p className="feedback-text">{text}</p>;
  const boundary = text.lastIndexOf(' ', 400);
  const split = boundary > 200 ? boundary : 400;
  return (
    <>
      <p className="feedback-text">{text.slice(0, split)}</p>
      <details className="feedback-more">
        <summary>{t('exercise.details')}</summary>
        <p className="feedback-text">{text.slice(split).trim()}</p>
      </details>
    </>
  );
}
export function ExerciseFeedback({
  feedback,
  retry,
  next,
  nextLabel,
  busy = false,
}: {
  feedback: Feedback;
  retry: () => void;
  next?: () => void;
  nextLabel?: string;
  busy?: boolean;
}) {
  const { t } = useI18n();
  const issues = (feedback.issues ?? []).filter((issue) => issue !== feedback.reason);
  return (
    <section
      className={`question-feedback ${feedback.correct ? 'correct' : 'incorrect'}`}
      role="status"
      aria-label={t('exercise.feedback')}
    >
      <div className="feedback-heading">
        {feedback.correct ? <CheckCircle2 size={23} /> : <Lightbulb size={23} />}
        <strong>{localizeText(feedback.message)}</strong>
      </div>
      {feedback.correct ? (
        <ExplanationText text={feedback.explanation} />
      ) : (
        <div className="feedback-sections">
          {feedback.submittedAnswer !== undefined && (
            <div className="feedback-section">
              <h3>{t('exercise.yourAnswer')}</h3>
              <p className="feedback-answer feedback-text">{feedback.submittedAnswer}</p>
            </div>
          )}
          <div className="feedback-section">
            <h3>{t('exercise.whyWrong')}</h3>
            <ExplanationText text={feedback.reason || feedback.explanation} />
            {issues.length > 0 && (
              <ul className="feedback-issues">
                {issues.map((issue, i) => (
                  <li key={i}>{issue}</li>
                ))}
              </ul>
            )}
          </div>
          <div className="feedback-section">
            <h3>{t('exercise.rule')}</h3>
            <ExplanationText text={feedback.rule || feedback.explanation} />
          </div>
          <div className="feedback-section">
            <h3>{t('exercise.solution')}</h3>
            {feedback.correctAnswer !== undefined && (
              <p className="feedback-answer feedback-solution feedback-text">
                {feedback.correctAnswer}
              </p>
            )}
            {!!feedback.steps?.length && (
              <ol className="feedback-steps">
                {feedback.steps.map((step, i) => (
                  <li key={i}>
                    <ExplanationText text={step} />
                  </li>
                ))}
              </ol>
            )}
            {feedback.example && (
              <div className="feedback-example">
                <strong>{t('exercise.anotherExample')}</strong>
                <ExplanationText text={feedback.example} />
              </div>
            )}
          </div>
        </div>
      )}
      <div className="feedback-actions">
        {!feedback.correct && (
          <Button type="button" variant="secondary" onClick={retry} disabled={busy}>
            <RotateCcw size={16} />
            {t('exercise.retry')}
          </Button>
        )}
        {next && (
          <Button type="button" onClick={next} busy={busy}>
            {nextLabel ?? t('common.continue')}
            <ArrowRight size={17} />
          </Button>
        )}
      </div>
    </section>
  );
}
