export interface GuideRecipe {
  id: string; slug: string; name: string; cuisine?: string;
  is_complete_meal?: boolean; total_time_minutes?: number | null;
}
export type GuideKind = 'quick' | 'classic' | 'week' | 'market';

// Select only catalogue-backed links; never guess a replacement for an old slug.
function isGuideRecipe(value: unknown): value is GuideRecipe {
  if (!value || typeof value !== 'object') return false;
  const row = value as Record<string, unknown>;
  return typeof row.id === 'string' && typeof row.slug === 'string' && typeof row.name === 'string'
    && (row.total_time_minutes == null || typeof row.total_time_minutes === 'number')
    && (row.cuisine == null || typeof row.cuisine === 'string')
    && (row.is_complete_meal == null || typeof row.is_complete_meal === 'boolean');
}

export function selectGuideRecipes(catalogue: unknown[], kind: GuideKind): GuideRecipe[] {
  const unique = [...new Map(catalogue.filter(isGuideRecipe).filter(r => r.id && r.name?.trim() &&
    r.slug?.trim() && !/[/?#]/.test(r.slug)).map(r => [r.id, r])).values()];
  const candidates = unique.filter(r => kind === 'quick'
    ? Number.isFinite(r.total_time_minutes) && Number(r.total_time_minutes) > 0 && Number(r.total_time_minutes) <= 30
    : kind === 'week' ? r.is_complete_meal === true : r.cuisine === 'chinese');
  return candidates.slice(0, { quick: 20, classic: 50, week: 7, market: 12 }[kind])
    .map(r => ({ id: r.id, slug: r.slug, name: r.name, total_time_minutes: r.total_time_minutes ?? null }));
}
