import 'reflect-metadata';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkedGeneratedQuestions } from '../src/admin/ai-question-content';

const question = {
  text: '3 × 4 nechaga teng?',
  options: ['7', '12', '14', '34'],
  answerIndex: 1,
  explanation: '3 ni 4 marta qo‘shamiz: 3 + 3 + 3 + 3 = 12.',
  hint: 'Ko‘paytirishni takroriy qo‘shish deb tasavvur qiling.',
};

test('accepts generated questions with four distinct options and one selected answer', () => {
  const result = checkedGeneratedQuestions({ questions: [question] }, 1);
  assert.equal(result.length, 1);
  assert.equal(result[0]?.options[result[0].answerIndex], '12');
});

test('rejects missing questions, repeated choices, invalid answer indexes, and repeated prompts', () => {
  assert.throws(() => checkedGeneratedQuestions({ questions: [] }, 1));
  assert.throws(() => checkedGeneratedQuestions({ questions: [{ ...question, options: ['A', 'A', 'B', 'C'] }] }, 1));
  assert.throws(() => checkedGeneratedQuestions({ questions: [{ ...question, answerIndex: 4 }] }, 1));
  assert.throws(() => checkedGeneratedQuestions({ questions: [question, question] }, 2));
});
