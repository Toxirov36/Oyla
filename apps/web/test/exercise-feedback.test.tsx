import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ExerciseFeedback } from '../src/components/exercises/exercise-feedback';
import type { Feedback } from '../src/lib/types';

const wrong: Feedback = {
  questionId: 'q',
  correct: false,
  message: 'Keling, xatoni birga tushunamiz.',
  explanation: 'She bilan goes ishlatiladi.',
  hint: null,
  submittedAnswer: 'She go to school every day.',
  reason: 'She uchinchi shaxs birlik.',
  rule: 'Present Simple’da uchinchi shaxs birlik bilan -s yoki -es qo‘shiladi.',
  correctAnswer: 'She goes to school every day.',
  steps: ['Egani aniqlang.', 'Go o‘rniga goes ishlating.'],
  example: 'He goes home at five.',
};

describe('educational answer feedback', () => {
  it('shows the submitted answer, specific reason, rule, solution and example in order with both actions', async () => {
    const retry = vi.fn();
    const next = vi.fn();
    render(<ExerciseFeedback feedback={wrong} retry={retry} next={next} />);
    expect(screen.getAllByRole('heading').map((heading) => heading.textContent)).toEqual([
      'Sizning javobingiz',
      'Nima uchun xato?',
      'Qoida',
      'To‘g‘ri yechim va misol',
    ]);
    expect(screen.getByText(wrong.submittedAnswer!)).toBeVisible();
    expect(screen.getByText(wrong.correctAnswer!)).toBeVisible();
    expect(screen.getByText(wrong.example!)).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: 'Yana urinib ko‘rish' }));
    await userEvent.click(screen.getByRole('button', { name: 'Davom etish' }));
    expect(retry).toHaveBeenCalledOnce();
    expect(next).toHaveBeenCalledOnce();
  });

  it('collapses long explanations and keeps the complete text available', async () => {
    const longRule = 'Bir xil amalni ikkala tomonda bajaramiz. '.repeat(20);
    render(<ExerciseFeedback feedback={{ ...wrong, rule: longRule }} retry={vi.fn()} />);
    const summary = screen.getByText('Batafsil tushuntirish');
    expect(summary.closest('details')).not.toHaveAttribute('open');
    await userEvent.click(summary);
    expect(summary.closest('details')).toHaveAttribute('open');
    expect(summary.closest('details')?.textContent).toContain('Bir xil amalni');
  });

  it('keeps correct feedback brief and disables actions while saving', () => {
    render(
      <ExerciseFeedback
        feedback={{ ...wrong, correct: true }}
        retry={vi.fn()}
        next={vi.fn()}
        busy
      />,
    );
    expect(screen.queryByRole('heading', { name: 'Nima uchun xato?' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Yana urinib ko‘rish' })).not.toBeInTheDocument();
    expect(screen.getByRole('button')).toBeDisabled();
  });
});
