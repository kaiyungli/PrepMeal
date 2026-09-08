/**
 * Pure date helpers for plan rendering.
 *
 * Plan dates are stored as bare `YYYY-MM-DD` strings. They are parsed as
 * LOCAL calendar dates (never `new Date('YYYY-MM-DD')`, which is UTC and
 * shifts a day in negative-offset zones) — the same fix the web
 * `PlanCard` / `PlanDaySection` apply.
 *
 * Zero imports — unit-tested directly by `node --test`.
 */

/**
 * Parse a bare `YYYY-MM-DD` as a local date, or `null` if malformed OR
 * calendar-invalid. JS `Date` silently rolls over out-of-range parts
 * (`2026-02-31` → 3 Mar, `2026-13-01` → Jan 2027, `2026-00-10` → Dec 2025), so
 * the constructed date is accepted only when its local year, month and day are
 * exactly the requested ones. `2024-02-29` is valid; `2026-02-29` is not.
 */
export function parseLocalDate(value: string | null | undefined): Date | null {
  if (typeof value !== 'string') return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const [, y, m, d] = match;
  const year = Number(y);
  const month = Number(m);
  const day = Number(d);
  const date = new Date(year, month - 1, day);
  if (Number.isNaN(date.getTime())) return null;
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return date;
}

function formatYMD(date: Date): string {
  return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
}

/**
 * `"2026/9/1 至 2026/9/7"`, or a single date when only the start parses, or
 * `null` when the start date is missing / malformed.
 */
export function formatPlanDateRange(
  start: string | null | undefined,
  end: string | null | undefined,
): string | null {
  const startDate = parseLocalDate(start);
  if (!startDate) return null;
  const endDate = parseLocalDate(end);
  if (!endDate) return formatYMD(startDate);
  return `${formatYMD(startDate)} 至 ${formatYMD(endDate)}`;
}

/** `"9月1日"` for a day-section heading, or `"其他"` when the date is unusable. */
export function formatPlanDayHeading(date: string | null | undefined): string {
  const parsed = parseLocalDate(date);
  if (!parsed) return '其他';
  return `${parsed.getMonth() + 1}月${parsed.getDate()}日`;
}
