export const HOME_EXAMPLE_COUNT = 7;
const DAY = 86400000;
/** UTC arithmetic deliberately ignores the host and browser timezone. */
export function hongKongDateKey(date = new Date()): string {
  return new Date(date.getTime() + 8 * 3600000).toISOString().slice(0, 10);
}
export function homeExampleIndex(date = new Date()): number {
  const day = Math.floor((date.getTime() + 8 * 3600000) / DAY);
  const anchor = Math.floor(Date.UTC(2026, 10, 9) / DAY);
  return ((day - anchor) % HOME_EXAMPLE_COUNT + HOME_EXAMPLE_COUNT) % HOME_EXAMPLE_COUNT;
}
