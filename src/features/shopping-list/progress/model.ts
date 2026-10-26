import type { ShoppingListItemViewModel, ShoppingListViewModel } from '../types';

export type Purchase = { checked: boolean; note: string; quantity: number | null; unit: string; quantityText: string };
export type ExtraItem = { id: string; name: string; quantity: string; unit: string; note: string; checked: boolean };
export type ShoppingProgress = { version: 1; items: Record<string, Purchase>; extras: ExtraItem[] };
export const emptyProgress = (): ShoppingProgress => ({ version: 1, items: {}, extras: [] });
export const itemKey = (item: Pick<ShoppingListItemViewModel, 'ingredientId' | 'name' | 'unit'>) =>
  JSON.stringify([item.ingredientId || item.name.trim().toLowerCase(), item.unit || '']);

export function validProgress(value: unknown): value is ShoppingProgress {
  if (!value || typeof value !== 'object') return false;
  const v = value as ShoppingProgress;
  const text = (s: unknown, n: number) => typeof s === 'string' && s.length <= n;
  return v.version === 1 && !!v.items && typeof v.items === 'object' && !Array.isArray(v.items) &&
    Object.keys(v.items).length <= 500 && Object.entries(v.items).every(([key, item]) => text(key, 500) && item &&
      typeof item.checked === 'boolean' && text(item.note, 300) && text(item.unit, 50) && text(item.quantityText, 100) &&
      (item.quantity === null || (Number.isFinite(item.quantity) && item.quantity >= 0))) &&
    Array.isArray(v.extras) && v.extras.length <= 100 && new Set(v.extras.map(x => x?.id)).size === v.extras.length &&
    v.extras.every(x => x && text(x.id, 100) && !!x.id && text(x.name, 100) && !!x.name.trim() &&
      text(x.quantity, 30) && text(x.unit, 30) && text(x.note, 300) && typeof x.checked === 'boolean');
}

// Compare canonical quantities, never rounded display strings. A unit change or
// an unknown quantity change requires a fresh check, even if the item keeps its ID.
export function reconcileProgress(progress: ShoppingProgress, view: ShoppingListViewModel) {
  const items: ShoppingProgress['items'] = {};
  const changed: string[] = [];
  for (const item of view.sections.flatMap(s => s.items)) {
    const key = itemKey(item);
    const old = progress.items[key];
    const previousUnit = !old ? Object.entries(progress.items).find(([otherKey]) => {
      try { return JSON.parse(otherKey)[0] === JSON.parse(key)[0]; } catch { return false; }
    })?.[1] : undefined;
    const unitChanged = !!previousUnit?.checked;
    const quantity = item.quantity ?? null;
    const unit = item.unit ?? '';
    const increased = !!old && (old.unit !== unit ||
      (quantity !== null && old.quantity !== null ? quantity > old.quantity + 1e-8 : item.quantityText !== old.quantityText));
    if ((old?.checked && increased) || unitChanged) changed.push(item.name);
    items[key] = { checked: !!old?.checked && !increased, note: old?.note || previousUnit?.note || '', quantity, unit, quantityText: item.quantityText };
  }
  return { progress: { version: 1 as const, items, extras: progress.extras }, changed };
}

export function shoppingText(view: ShoppingListViewModel, progress: ShoppingProgress, all: boolean) {
  const lines = [all ? '🛒 購物清單（全部）' : '🛒 購物清單（尚欠）'];
  for (const section of view.sections) {
    const rows = section.items.filter(i => all || !progress.items[itemKey(i)]?.checked);
    if (!rows.length) continue;
    lines.push(`\n${section.categoryLabel}`);
    for (const item of rows) {
      const p = progress.items[itemKey(item)];
      lines.push(`${p?.checked ? '☑' : '☐'} ${item.name} ${item.quantityPending ? '（數量待補）' : item.quantityText}${p?.note ? ` — ${p.note}` : ''}`);
    }
  }
  const extras = progress.extras.filter(i => all || !i.checked);
  if (extras.length) lines.push('\n額外物品', ...extras.map(i => `${i.checked ? '☑' : '☐'} ${i.name} ${i.quantity} ${i.unit}${i.note ? ` — ${i.note}` : ''}`));
  if (lines.length === 1) lines.push('已買齊！');
  return lines.join('\n');
}
