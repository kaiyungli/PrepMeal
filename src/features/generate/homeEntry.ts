/** Only the explicit homepage form may request generation. */
export function parseHomeGenerateEntry(query: Record<string, unknown>) {
  if (query.source !== 'home' || typeof query.days !== 'string' || typeof query.servings !== 'string') return null;
  if (!['3', '5', '7'].includes(query.days) || !['1', '2', '3', '4', '5', '6'].includes(query.servings)) return null;
  return { days: Number(query.days), servings: Number(query.servings) };
}
