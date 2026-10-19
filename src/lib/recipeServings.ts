// Legacy recipes without a valid base count retain their one-serving basis.
export function recipeServingScale(target: number, base: unknown): number {
  const count = typeof base === 'number' || typeof base === 'string' ? Number(base) : NaN;
  return target / (Number.isFinite(count) && count > 0 ? count : 1);
}
