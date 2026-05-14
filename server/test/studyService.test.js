import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateXpForRating,
  normalizeStudyFilters,
} from '../src/services/studyService.js';

// Validates that unknown mode/scope fall back safely,
// weakOnly string flags are parsed, and tags are normalized + deduped.
test('normalizeStudyFilters sanitizes tags and normalizes booleans', () => {
  const filters = normalizeStudyFilters({
    mode: 'unknown',
    dueScope: 'invalid',
    weakOnly: 'true',
    tags: '  Cpp , cpp,  Memory , , ',
  });

  assert.deepEqual(filters, {
    mode: 'normal',
    dueScope: 'due',
    weakOnly: true,
    tags: ['cpp', 'memory'],
  });
});

// Validates the happy path where supported mode/scope are preserved
// while tags still get lowercased and deduplicated.
test('normalizeStudyFilters preserves valid mode and dueScope', () => {
  const filters = normalizeStudyFilters({
    mode: 'cram',
    dueScope: 'any',
    weakOnly: false,
    tags: ['DSA', '  dsa ', 'Graph'],
  });

  assert.equal(filters.mode, 'cram');
  assert.equal(filters.dueScope, 'any');
  assert.equal(filters.weakOnly, false);
  assert.deepEqual(filters.tags, ['dsa', 'graph']);
});

// Guards the XP contract used by review flow.
test('calculateXpForRating maps each rating to expected XP', () => {
  assert.equal(calculateXpForRating('easy'), 16);
  assert.equal(calculateXpForRating('good'), 12);
  assert.equal(calculateXpForRating('hard'), 8);
  assert.equal(calculateXpForRating('again'), 4);
  assert.equal(calculateXpForRating('unknown'), 4);
});
