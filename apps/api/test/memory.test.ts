import 'reflect-metadata';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  checkedGeneratedMemoryPairs, checkedMemoryPairs, deckSignature, fallbackMemoryIds,
  generatedDeckOverlap, generatedDeckSignature, memoryCatalog, memoryGoal, memorySubjects, pairCount,
} from '../src/play/memory-content';
import { memoryRoundView } from '../src/play/memory.service';

test('every curated grade and stage has an unambiguous playable fallback', () => {
  for (const grade of [5, 6, 7]) for (const subject of memorySubjects) for (const stage of [1, 2, 3]) {
    const ids = fallbackMemoryIds(grade, subject, stage);
    const pairs = checkedMemoryPairs(grade, subject, stage, ids);
    assert.equal(pairs.length, pairCount(stage));
    assert.ok(memoryCatalog(grade, subject).length >= 15);
    assert.ok(memoryGoal(grade, subject, stage));
    assert.equal(deckSignature(grade, subject, stage, ids), deckSignature(grade, subject, stage, [...ids].reverse()));
  }
});

test('curated selections cannot add unknown, duplicate, or easier-only pairs', () => {
  assert.throws(() => checkedMemoryPairs(5, 'english', 1, ['1-1', '1-1', '1-2', '1-3']));
  assert.throws(() => checkedMemoryPairs(5, 'english', 2, ['1-1', '1-2', '1-3', '1-4', '2-1']));
  assert.throws(() => checkedMemoryPairs(5, 'english', 3, ['3-1', '3-2', '3-3', '3-4', '2-1', 'unknown']));
});

test('generated cards must be distinct, short, and genuinely different from recent decks', () => {
  const input = [
    { left: 'I watched a film', right: 'Men film ko‘rdim' },
    { left: 'She cooked rice', right: 'U guruch pishirdi' },
    { left: 'We visited a museum', right: 'Biz muzeyga bordik' },
    { left: 'They opened the door', right: 'Ular eshikni ochishdi' },
    { left: 'He carried a box', right: 'U qutini ko‘tardi' },
    { left: 'I painted a tree', right: 'Men daraxt chizdim' },
  ];
  const pairs = checkedGeneratedMemoryPairs(3, input);
  assert.equal(pairs.length, 6);
  assert.equal(generatedDeckOverlap(pairs, [pairs.slice(0, 2)]), 2);
  assert.equal(generatedDeckSignature(6, 'english', 3, pairs),
    generatedDeckSignature(6, 'english', 3, [...pairs].reverse()));
  assert.throws(() => checkedGeneratedMemoryPairs(3, [...input.slice(0, 5), input[0]]));
  assert.throws(() => checkedGeneratedMemoryPairs(3, [...input.slice(0, 5), { left: '<script>', right: 'bad' }]));
  assert.throws(() => checkedGeneratedMemoryPairs(3, input.slice(0, 5)));
});

test('round presentation never includes the hidden pair keys', () => {
  const view = memoryRoundView({
    id: 'round', grade: 5, subject: 'english', stage: 1, status: 'ACTIVE',
    cards: [{ id: 'a', key: 3, text: 'cat' }, { id: 'b', key: 3, text: 'mushuk' }],
    matchedKeys: [], moves: 0, completedAt: null,
  });
  assert.deepEqual(view.cards, [{ id: 'a', text: 'cat' }, { id: 'b', text: 'mushuk' }]);
  assert.equal(JSON.stringify(view).includes('"key"'), false);
});
