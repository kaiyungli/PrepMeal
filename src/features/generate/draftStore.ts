import { validProgress, type ShoppingProgress } from '@/features/shopping-list/progress/model';
export const DRAFT_TTL = 7 * 24 * 60 * 60 * 1000;
export const TRANSFER_KEY = 'prepmeal:generate-draft-transfer:v1';
export const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
export type DraftPreferences = {
  daysPerWeek: number; dailyComposition: string; allowCompleteMeal: boolean;
  servings: number; budget: string; ingredientReuse: string; exclusions: string[];
  filters: Record<string, string[]>;
};
export type DraftSnapshot = {
  shoppingProgress?: ShoppingProgress;
  weeklyPlan: Record<string, (string | null)[]>;
  lockedSlots: Record<string, boolean>;
  preferences: DraftPreferences;
  notices: string[];
};
export type DraftEnvelope = { version: 1; owner: string; savedAt: number; snapshot: DraftSnapshot };
export const draftKey = (owner: string) => `prepmeal:generate-draft:v1:${owner}`;
export const draftOwner = (userId: string | null) => userId ? `user:${userId}` : 'guest';

export function parseDraft(raw: string | null, owner: string, now = Date.now()):
  { status: 'empty' | 'expired' | 'invalid'; draft?: never } | { status: 'ok'; draft: DraftEnvelope } {
  if (!raw) return { status: 'empty' };
  try {
    const value = JSON.parse(raw);
    if (value?.version !== 1 || value.owner !== owner || !Number.isFinite(value.savedAt) || value.savedAt > now || !value.snapshot) throw new Error();
    const { weeklyPlan, lockedSlots, preferences: p, notices, shoppingProgress } = value.snapshot;
    if (shoppingProgress !== undefined && !validProgress(shoppingProgress)) throw new Error();
    const strings = (items: unknown): items is string[] => Array.isArray(items) && items.length <= 40 && items.every(x => typeof x === 'string' && x.length <= 200);
    if (!weeklyPlan || typeof weeklyPlan !== 'object' || Array.isArray(weeklyPlan) ||
      Object.keys(weeklyPlan).some(key => !DAY_KEYS.includes(key as typeof DAY_KEYS[number])) ||
      Object.values(weeklyPlan).some(items => !Array.isArray(items) || items.length > 3 || items.some(id => id !== null && (typeof id !== 'string' || !id.length || id.length > 200))) ||
      !lockedSlots || typeof lockedSlots !== 'object' || Array.isArray(lockedSlots) ||
      Object.entries(lockedSlots).some(([key, flag]) => !/^(mon|tue|wed|thu|fri|sat|sun)-[0-2]$/.test(key) || typeof flag !== 'boolean') ||
      !p || ![3, 5, 7].includes(p.daysPerWeek) || !['complete_meal', 'meat_veg', 'two_meat_one_veg'].includes(p.dailyComposition) ||
      !Number.isInteger(p.servings) || p.servings < 1 || p.servings > 6 || typeof p.allowCompleteMeal !== 'boolean' ||
      !['budget', 'normal', 'premium'].includes(p.budget) || !['low', 'normal', 'high'].includes(p.ingredientReuse) ||
      !strings(p.exclusions) || !p.filters || typeof p.filters !== 'object' || Array.isArray(p.filters) ||
      ['cuisine', 'dish_type', 'protein', 'method', 'speed', 'difficulty', 'diet', 'flavor'].some(key => !Array.isArray(p.filters[key])) ||
      Object.keys(p.filters).some(key => !['cuisine', 'dish_type', 'protein', 'method', 'speed', 'difficulty', 'diet', 'flavor'].includes(key)) ||
      Object.values(p.filters).some(items => !strings(items)) || !strings(notices)) throw new Error();
    if (now - value.savedAt >= DRAFT_TTL) return { status: 'expired' };
    return { status: 'ok', draft: value };
  } catch { return { status: 'invalid' }; }
}

export function encodeDraft(owner: string, snapshot: DraftSnapshot, now = Date.now()): string {
  return JSON.stringify({ version: 1, owner, savedAt: now, snapshot });
}

export function hydrateDraft<T extends { id: string | number }>(snapshot: DraftSnapshot, recipes: T[]) {
  const byId = new Map(recipes.map(recipe => [String(recipe.id), recipe]));
  const missing: string[] = [];
  const weeklyPlan = Object.fromEntries(DAY_KEYS.map((day, index) => [day, (snapshot.weeklyPlan[day] || []).map((id, slot) => {
    if (!id) return null;
    const recipe = byId.get(id);
    if (!recipe) missing.push(`星期${['一', '二', '三', '四', '五', '六', '日'][index]}第${slot + 1}道食譜已下架，請重新選擇。`);
    return recipe || null;
  })]));
  const lockedSlots = Object.fromEntries(Object.entries(snapshot.lockedSlots).filter(([key, flag]) => {
    const [day, slot] = key.split('-');
    return flag && weeklyPlan[day]?.[Number(slot)];
  }));
  return { weeklyPlan, lockedSlots, notices: [...new Set([...snapshot.notices, ...missing])].slice(0, 40) };
}

// Object property order is not an edit. Stable comparison also prevents merely
// opening an older serialized draft from renewing its seven-day lifetime.
export function draftFingerprint(snapshot: DraftSnapshot): string {
  return JSON.stringify(snapshot, (_key, value) => value && typeof value === 'object' && !Array.isArray(value)
    ? Object.fromEntries(Object.keys(value).sort().map(key => [key, value[key]])) : value);
}
