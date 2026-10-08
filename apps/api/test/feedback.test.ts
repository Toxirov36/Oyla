import 'reflect-metadata';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildFeedback, validateFeedback } from '../src/learning/feedback';
import { publicSnapshot } from '../src/learning/exercises';
import { createValidationPipe } from '../src/common/validation';
import { QuestionFeedbackDto } from '../src/learning/feedback.dto';
import examples from '../../web/src/lib/exercise-examples.json';

test('choice feedback uses the selected option reason and displays human labels', () => {
  const q = {
    type: 'MULTIPLE_CHOICE',
    answer: 'correct',
    explanation: 'She bilan goes.',
    options: [
      { value: 'wrong', text: 'She go.' },
      { value: 'correct', text: 'She goes.' },
    ],
    feedback: {
      rule: 'Uchinchi shaxs birlikda -s yoki -es.',
      wrongAnswers: [{ value: 'wrong', reason: 'She uchinchi shaxs birlik, go o‘rniga goes.' }],
      example: 'He goes home.',
    },
  };
  validateFeedback(q);
  const feedback = buildFeedback(q, 'wrong', false);
  assert.equal(feedback.submittedAnswer, 'She go.');
  assert.equal(feedback.correctAnswer, 'She goes.');
  assert.equal(feedback.reason, q.feedback.wrongAnswers[0]!.reason);
  assert.equal(feedback.example, 'He goes home.');
  assert.equal(Object.hasOwn(publicSnapshot({ ...q, id: 'q' }), 'feedback'), false);
});

test('pair and order diagnostics identify a verifiable mismatch, without exposing IDs as answers', () => {
  const pair = { ...examples.MATCH_PAIRS, type: 'MATCH_PAIRS', answer: 'structured' };
  const feedback = buildFeedback(
    pair,
    JSON.stringify({ pairs: [{ left: 'cpu', right: 'storage' }] }),
    false,
  );
  assert.match(feedback.reason, /CPU.*SSD|CPU.*Doimiy/);
  assert.match(feedback.reason, /CPU → Hisoblash/);
  assert.equal(feedback.submittedAnswer, 'CPU → Doimiy xotira');
  const order = { ...examples.SORT_ORDER, type: 'SORT_ORDER', answer: 'structured' };
  const wrongOrder = [...order.grading.values].reverse();
  const sorted = buildFeedback(order, JSON.stringify({ values: wrongOrder }), false);
  assert.match(sorted.reason, /1-o‘rinda/);
  assert.ok(!sorted.correctAnswer.includes('i1'));
});

test('fill gaps compare accepted alternatives, while numerical answers do not invent a cause', () => {
  const q = {
    type: 'FILL_GAP',
    answer: 'structured',
    explanation: 'So‘zlarni moslang.',
    config: {
      slots: [
        { id: 'a', text: 'Birinchi' },
        { id: 'b', text: 'Ikkinchi' },
      ],
    },
    grading: { values: ['colour|color', 'go'] },
  };
  const feedback = buildFeedback(q, JSON.stringify({ values: [' COLOR ', 'goes'] }), false);
  assert.equal(feedback.issues.length, 1);
  assert.match(feedback.issues[0]!, /2-bo‘shliq/);
  const numeric = buildFeedback(
    { type: 'NUMERICAL', answer: '5', explanation: '20 − 5 = 15; 15 ÷ 3 = 5.' },
    '15',
    false,
  );
  assert.match(numeric.reason, /solishtiring/);
  assert.deepEqual(numeric.steps, []);
  assert.equal(numeric.rule, '20 − 5 = 15; 15 ÷ 3 = 5.');
});

test('debug code solution preserves literal pipe operators and indentation', () => {
  const code = 'flags = first | second\nif flags:\n    print(flags)';
  const feedback = buildFeedback(
    {
      type: 'DEBUG_CODE',
      answer: 'structured',
      explanation: 'Indentatsiyani tekshiring.',
      config: { code },
      grading: { text: code },
    },
    JSON.stringify({ text: 'flags = 0' }),
    false,
  );
  assert.equal(feedback.correctAnswer, code);
});

test('feedback authoring rejects invalid variant mappings, untrusted fields and oversized content', async () => {
  const q = {
    type: 'MULTIPLE_CHOICE',
    answer: 'yes',
    explanation: 'Tekshirilgan izoh.',
    options: [
      { text: 'Ha', value: 'yes' },
      { text: 'Yo‘q', value: 'no' },
    ],
  };
  for (const wrongAnswers of [
    [{ value: 'yes', reason: 'To‘g‘ri variant xato deb belgilangan.' }],
    [{ value: 'missing', reason: 'Bunday variant yo‘q.' }],
    [
      { value: 'no', reason: 'Xato javob.' },
      { value: 'no', reason: 'Takror izoh.' },
    ],
  ])
    assert.throws(() => validateFeedback({ ...q, feedback: { wrongAnswers } }));
  const pipe = createValidationPipe();
  for (const feedback of [
    { rule: 'R', score: 100 },
    { steps: Array(11).fill('Qadam') },
    { wrongAnswers: [{ value: 'no', reason: 'Xato', xp: 100 }] },
    { example: 'x'.repeat(3001) },
    { steps: [null] },
  ])
    await assert.rejects(pipe.transform(feedback, { type: 'body', metatype: QuestionFeedbackDto }));
});
