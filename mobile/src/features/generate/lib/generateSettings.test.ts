/**
 * Unit tests for `generateSettingsChanged` — the rule `useGeneratePlan` uses to
 * decide whether a days/composition edit must invalidate the displayed plan
 * (cancel the scheduled run, clear the plan, return to `idle`), so a stale plan
 * is never rendered under freshly-changed settings.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { generateSettingsChanged } from './generateSettings.ts';

test('no change when both fields are identical (a no-op re-selection)', () => {
  assert.equal(
    generateSettingsChanged(
      { days: 7, composition: 'complete_meal' },
      { days: 7, composition: 'complete_meal' },
    ),
    false,
  );
});

test('a days change invalidates', () => {
  assert.equal(
    generateSettingsChanged(
      { days: 7, composition: 'complete_meal' },
      { days: 3, composition: 'complete_meal' },
    ),
    true,
  );
});

test('a composition change invalidates', () => {
  assert.equal(
    generateSettingsChanged(
      { days: 5, composition: 'meat_veg' },
      { days: 5, composition: 'two_meat_one_veg' },
    ),
    true,
  );
});

test('a change in both fields invalidates', () => {
  assert.equal(
    generateSettingsChanged(
      { days: 3, composition: 'meat_veg' },
      { days: 7, composition: 'complete_meal' },
    ),
    true,
  );
});

test('every distinct days option is treated as a real change from every other', () => {
  const opts = [3, 5, 7] as const;
  for (const a of opts) {
    for (const b of opts) {
      assert.equal(
        generateSettingsChanged(
          { days: a, composition: 'meat_veg' },
          { days: b, composition: 'meat_veg' },
        ),
        a !== b,
      );
    }
  }
});
