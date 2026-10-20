import { expect, it } from 'vitest';
import { ingredientPrepNote } from '@/features/recipes/mappers/ingredientPrepNote';

it('keeps cooking notes and weight states without import IDs or repeated quantities', () => {
  expect(ingredientPrepNote('03-01 豆: 100 g (drained)\n03-01：瀝乾備用\n03-02：瀝乾備用')).toBe('瀝乾後稱重；瀝乾備用');
  expect(ingredientPrepNote('02-01 雞肉: 100 g (cooked)\n02-01：切粒')).toBe('按熟重計；切粒');
  expect(ingredientPrepNote('04-01 米: 100 g (dry)')).toBe('按乾重計');
  expect(ingredientPrepNote('04-01 豆: 100 g (drained_ready_to_eat)')).toBe('瀝乾後稱重');
});
it('removes generic ledger boilerplate and retains ordinary notes', () => {
  expect(ingredientPrepNote('16-04 紅洋蔥: 0.125 pc (raw_or_packaged)\n16-04：按表中生／熟／瀝水狀態備料；用量為每人份。')).toBe('按未烹調／包裝原重計');
  expect(ingredientPrepNote('去皮切幼絲')).toBe('去皮切幼絲');
  expect(ingredientPrepNote(null)).toBe('');
});
