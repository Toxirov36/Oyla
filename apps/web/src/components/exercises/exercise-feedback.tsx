import { ArrowRight, CheckCircle2, Lightbulb, RotateCcw } from 'lucide-react';
import type { Feedback } from '../../lib/types';
import { Button } from '../ui';
function ExplanationText({ text }: { text: string }) {
  if (text.length <= 400) return <p className="feedback-text">{text}</p>;
  const boundary = text.lastIndexOf(' ', 400);
  const split = boundary > 200 ? boundary : 400;
  return (
    <>
      <p className="feedback-text">{text.slice(0, split)}</p>
      <details className="feedback-more">
        <summary>Batafsil tushuntirish</summary>
        <p className="feedback-text">{text.slice(split).trim()}</p>
      </details>
    </>
  );
}
export function ExerciseFeedback({
  feedback,
  retry,
  next,
  nextLabel = 'Davom etish',
  busy = false,
}: {
  feedback: Feedback;
  retry: () => void;
  next?: () => void;
  nextLabel?: string;
  busy?: boolean;
}) {
  const issues = (feedback.issues ?? []).filter((issue) => issue !== feedback.reason);
  return (
    <section
      className={`question-feedback ${feedback.correct ? 'correct' : 'incorrect'}`}
      role="status"
      aria-label="Javob izohi"
    >
      <div className="feedback-heading">
        {feedback.correct ? <CheckCircle2 size={23} /> : <Lightbulb size={23} />}
        <strong>{feedback.message}</strong>
      </div>
      {feedback.correct ? (
        <ExplanationText text={feedback.explanation} />
      ) : (
        <div className="feedback-sections">
          {feedback.submittedAnswer !== undefined && (
            <div className="feedback-section">
              <h3>Sizning javobingiz</h3>
              <p className="feedback-answer feedback-text">{feedback.submittedAnswer}</p>
            </div>
          )}
          <div className="feedback-section">
            <h3>Nima uchun xato?</h3>
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
            <h3>Qoida</h3>
            <ExplanationText text={feedback.rule || feedback.explanation} />
          </div>
          <div className="feedback-section">
            <h3>To‘g‘ri yechim va misol</h3>
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
                <strong>Yana bir misol</strong>
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
            Yana urinib ko‘rish
          </Button>
        )}
        {next && (
          <Button type="button" onClick={next} busy={busy}>
            {nextLabel}
            <ArrowRight size={17} />
          </Button>
        )}
      </div>
    </section>
  );
}
