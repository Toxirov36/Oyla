import { CheckCircle2, Lightbulb, RotateCcw } from 'lucide-react';
import type { Feedback } from '../../lib/types';
import { Button } from '../ui';
export function ExerciseFeedback({ feedback, retry }: { feedback: Feedback; retry: () => void }) {
  return (
    <div
      className={`question-feedback ${feedback.correct ? 'correct' : 'incorrect'}`}
      role="status"
    >
      <div>
        {feedback.correct ? <CheckCircle2 size={23} /> : <Lightbulb size={23} />}
        <strong>{feedback.message}</strong>
      </div>
      <p>{feedback.explanation}</p>
      {!feedback.correct && (
        <Button variant="ghost" onClick={retry}>
          <RotateCcw size={16} />
          Yana sinab ko‘rish
        </Button>
      )}
    </div>
  );
}
