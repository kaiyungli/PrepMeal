/** Validate the shared homepage form handoff for generation or preferences. */
export function parseHomeGenerateEntry(query: Record<string, unknown>) {
  if (query.source !== 'home' || typeof query.days !== 'string' || typeof query.servings !== 'string') return null;
  if (!['3', '5', '7'].includes(query.days) || !['1', '2', '3', '4', '5', '6'].includes(query.servings)) return null;
  if (query.intent !== undefined && query.intent !== 'preferences') return null;
  return { ...(query.intent === 'preferences' ? { intent: 'preferences' as const } : {}), days: Number(query.days), servings: Number(query.servings) };
}
