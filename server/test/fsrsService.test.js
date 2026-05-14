import test from 'node:test';
import assert from 'node:assert/strict';
import { createEmptyCard } from 'ts-fsrs';
import {
  applyReview,
  normalizeFsrsSettings,
  normalizeRating,
} from '../src/services/fsrsService.js';

// Confirms accepted rating inputs are normalized to canonical keys.
test('normalizeRating accepts valid rating keys case-insensitively', () => {
  assert.equal(normalizeRating('GOOD'), 'good');
  assert.equal(normalizeRating('easy'), 'easy');
  assert.equal(normalizeRating('Hard'), 'hard');
});

// Confirms invalid/empty inputs are rejected instead of coerced.
test('normalizeRating rejects unknown values', () => {
  assert.equal(normalizeRating('perfect'), null);
  assert.equal(normalizeRating(undefined), null);
  assert.equal(normalizeRating(''), null);
});

// Confirms config normalization enforces retention bounds
// and falls back to defaults for invalid booleans.
test('normalizeFsrsSettings clamps requestRetention and applies boolean defaults', () => {
  const lower = normalizeFsrsSettings({
    requestRetention: 0.1,
    enableShortTerm: false,
    enableFuzz: true,
  });
  assert.equal(lower.requestRetention, 0.75);
  assert.equal(lower.enableShortTerm, false);
  assert.equal(lower.enableFuzz, true);

  const upper = normalizeFsrsSettings({
    requestRetention: 3,
    enableShortTerm: 'yes',
  });
  assert.equal(upper.requestRetention, 0.99);
  assert.equal(upper.enableShortTerm, true);
  assert.equal(upper.enableFuzz, true);
});

// Integration-style check: applying a review mutates scheduling state
// and returns Date objects expected by downstream code.
test('applyReview returns updated card and review log with Date fields', () => {
  const now = new Date('2026-01-01T00:00:00.000Z');
  const emptyCard = createEmptyCard(now);

  const result = applyReview(emptyCard, 'good', now, {
    requestRetention: 0.9,
    enableShortTerm: true,
    enableFuzz: false,
  });

  assert.ok(result.fsrsCard);
  assert.ok(result.reviewLog);
  assert.ok(result.fsrsCard.due instanceof Date);
  assert.ok(result.fsrsCard.last_review instanceof Date);
  assert.equal(result.reviewLog.rating, 3);
  assert.equal(result.fsrsCard.reps, 1);
});
