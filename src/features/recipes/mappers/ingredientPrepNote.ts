// Imported notes include ledger IDs and repeated quantity/state summaries.
// Keep cooking instructions and meaningful weight states reader-facing.
export function ingredientPrepNote(value: string | null | undefined, unit?: string | { code?: string } | null): string {
  if (!value) return '';
  const unitCode = typeof unit === 'string' ? unit : unit?.code;
  if (unitCode === 'egg' && value === '去殼蛋液重量，約1隻') return '去殼打散';
  const states: Record<string, string> = { dry: '按乾重計', cooked: '按熟重計', drained: '瀝乾後稱重', drained_ready_to_eat: '瀝乾後稱重', raw: '按生重計', raw_or_packaged: '按未烹調／包裝原重計' };
  const notes = value.split(/\r?\n/).flatMap(line => {
    const summary = line.match(/^\d{2}-\d{2}\s+.*\(([^)]+)\)\s*$/);
    if (summary) return states[summary[1]] ? [states[summary[1]]] : [];
    const note = line.replace(/^\d{2}-\d{2}[：:]\s*/, '')
      .replace(/；本次重新訂定用量(?=[；。]|$)/g, '').trim();
    if (!note || note === '按表中生／熟／瀝水狀態備料；用量為每人份。') return [];
    // These lines describe import conversions rather than preparation.
    if (/^(合併採用編定參考克重|來源杯約)/.test(note)) return [];
    return [note];
  });
  return [...new Set(notes)].join('；');
}
