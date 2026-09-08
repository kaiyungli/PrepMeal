/**
 * Unit tests for the pure plan date helpers.
 * Run with: `npm test`.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  formatPlanDateRange,
  formatPlanDayHeading,
  parseLocalDate,
} from './planDates.ts';

test('parseLocalDate reads YYYY-MM-DD as a local calendar date', () => {
  const d = parseLocalDate('2026-09-01');
  assert.equal(d?.getFullYear(), 2026);
  assert.equal(d?.getMonth(), 8); // 0-indexed
  assert.equal(d?.getDate(), 1);
});

test('parseLocalDate returns null for malformed / missing input', () => {
  for (const value of ['', '2026-9-1', '2026/09/01', 'nope', null, undefined]) {
    assert.equal(parseLocalDate(value), null, String(value));
  }
});

test('parseLocalDate rejects calendar-invalid values JS Date would roll over', () => {
  for (const value of [
    '2026-02-31', // → 3 March
    '2026-13-01', // → January 2027
    '2026-00-10', // → December 2025
    '2026-04-31', // → 1 May
    '2026-02-29', // not a leap year → 1 March
  ]) {
    assert.equal(parseLocalDate(value), null, value);
  }
});

test('parseLocalDate accepts a real leap day', () => {
  const d = parseLocalDate('2024-02-29');
  assert.equal(d?.getFullYear(), 2024);
  assert.equal(d?.getMonth(), 1);
  assert.equal(d?.getDate(), 29);
});

test('parseLocalDate accepts month/day boundaries', () => {
  assert.equal(parseLocalDate('2026-01-31')?.getDate(), 31);
  assert.equal(parseLocalDate('2026-12-31')?.getMonth(), 11);
  assert.equal(parseLocalDate('2026-04-30')?.getDate(), 30);
});

test('formatPlanDateRange renders both ends, start-only, or null', () => {
  assert.equal(
    formatPlanDateRange('2026-09-01', '2026-09-07'),
    '2026/9/1 至 2026/9/7',
  );
  assert.equal(formatPlanDateRange('2026-09-01', null), '2026/9/1');
  assert.equal(formatPlanDateRange('2026-09-01', 'bad'), '2026/9/1');
  assert.equal(formatPlanDateRange(null, '2026-09-07'), null);
  assert.equal(formatPlanDateRange('', ''), null);
});

test('formatPlanDayHeading renders a M月D日 label or the 其他 fallback', () => {
  assert.equal(formatPlanDayHeading('2026-09-01'), '9月1日');
  assert.equal(formatPlanDayHeading('2026-12-25'), '12月25日');
  assert.equal(formatPlanDayHeading(null), '其他');
  assert.equal(formatPlanDayHeading('garbage'), '其他');
});
