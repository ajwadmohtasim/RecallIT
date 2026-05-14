import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getHeatmapWindowStart,
  startOfDayUtcKey,
} from '../src/services/progressService.js';

const DAY_MS = 24 * 60 * 60 * 1000;

// Ensures calendar bucketing always uses UTC day keys.
test('startOfDayUtcKey returns UTC YYYY-MM-DD key', () => {
  const sample = new Date('2026-05-14T23:45:00+06:00');
  assert.equal(startOfDayUtcKey(sample), '2026-05-14');
});

// Ensures heatmap range starts at UTC midnight and spans exact day count.
test('getHeatmapWindowStart returns UTC-midnight start for requested day window', () => {
  const days = 10;
  const now = new Date();
  const todayUtcStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const expected = new Date(todayUtcStart.getTime() - (days - 1) * DAY_MS);
  const actual = getHeatmapWindowStart(days);

  assert.equal(actual.toISOString(), expected.toISOString());
  assert.equal(actual.getUTCHours(), 0);
  assert.equal(actual.getUTCMinutes(), 0);
  assert.equal(actual.getUTCSeconds(), 0);
});
