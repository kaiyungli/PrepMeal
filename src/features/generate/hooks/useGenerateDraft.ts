/* eslint-disable react-hooks/set-state-in-effect -- Hydration and write-result notices synchronize browser storage. Initialization and fingerprint guards prevent update loops. */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { useGeneratePreferences } from '@/hooks/useGeneratePreferences';
import { DAY_KEYS, TRANSFER_KEY, draftKey, draftOwner, draftFingerprint, encodeDraft, hydrateDraft, parseDraft, type DraftSnapshot } from '../draftStore';

import { emptyProgress, type ShoppingProgress } from '@/features/shopping-list/progress/model';

type Recipe = { id: string | number; [key: string]: unknown };
type Options = {
  userId: string | null; allRecipes: Recipe[]; loadingRecipes: boolean; recipesError: string | null;
  preferences: ReturnType<typeof useGeneratePreferences>;
  weeklyPlan: Record<string, (Recipe | null)[]>; lockedSlots: Record<string, boolean>;
  setWeeklyPlan: (plan: Record<string, (Recipe | null)[]>) => void;
  setLockedSlots: (locks: Record<string, boolean>) => void;
};

// Mounted under an account-keyed workspace. Never hydrate recipe objects from
// storage: only IDs are trusted enough to look up in the current public catalogue.
export function useGenerateDraft(options: Options) {
  const { userId, allRecipes, loadingRecipes, recipesError, preferences: prefs, weeklyPlan, lockedSlots, setWeeklyPlan, setLockedSlots } = options;
  const router = useRouter();
  const owner = draftOwner(userId);
  const key = draftKey(owner);
  const [shoppingProgress, setShoppingProgress] = useState<ShoppingProgress>(emptyProgress);
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState('');
  const [notices, setNotices] = useState<string[]>([]);
  const [conflict, setConflict] = useState(false);
  const initialized = useRef(false);
  const lastSnapshot = useRef('');
  const lastStored = useRef<string | null>(null);
  const snapshot: DraftSnapshot = useMemo(() => ({
    shoppingProgress,
    weeklyPlan: Object.fromEntries(DAY_KEYS.map(day => [day, (weeklyPlan[day] || []).map(recipe => recipe?.id != null ? String(recipe.id) : null)])),
    lockedSlots,
    preferences: { daysPerWeek: prefs.daysPerWeek, dailyComposition: prefs.dailyComposition,
      allowCompleteMeal: prefs.allowCompleteMeal, servings: prefs.servings, budget: prefs.budget,
      ingredientReuse: prefs.ingredientReuse, exclusions: prefs.exclusions, filters: prefs.filters },
    notices,
  }), [weeklyPlan, lockedSlots, prefs.daysPerWeek, prefs.dailyComposition, prefs.allowCompleteMeal, prefs.servings,
    prefs.budget, prefs.ingredientReuse, prefs.exclusions, prefs.filters, notices, shoppingProgress]);
  const fingerprint = draftFingerprint(snapshot);

  const apply = useCallback((saved: DraftSnapshot) => {
    const restored = hydrateDraft(saved, allRecipes);
    setShoppingProgress(saved.shoppingProgress || emptyProgress());
    setWeeklyPlan(restored.weeklyPlan);
    setLockedSlots(restored.lockedSlots);
    setNotices(restored.notices);
    const p = saved.preferences;
    prefs.setDaysPerWeek(p.daysPerWeek); prefs.setDailyComposition(p.dailyComposition);
    prefs.setAllowCompleteMeal(p.allowCompleteMeal); prefs.setServings(p.servings);
    prefs.setBudget(p.budget); prefs.setIngredientReuse(p.ingredientReuse);
    prefs.setExclusions(p.exclusions); prefs.setFilters(p.filters);
    // Baseline uses hydrated identities and only locks that still refer to meals.
    lastSnapshot.current = draftFingerprint({ ...saved, shoppingProgress: saved.shoppingProgress || emptyProgress(),
      weeklyPlan: Object.fromEntries(DAY_KEYS.map(day => [day, restored.weeklyPlan[day].map(recipe => recipe ? String(recipe.id) : null)])),
      lockedSlots: restored.lockedSlots, notices: restored.notices });
  }, [allRecipes, setWeeklyPlan, setLockedSlots, prefs]);

  useEffect(() => {
    if (initialized.current || loadingRecipes || recipesError || !router.isReady) return;
    initialized.current = true;
    let saved: ReturnType<typeof parseDraft> = { status: 'empty' };
    let restored = false;
    try {
      // Only an explicit login redirect carrying this tab's nonce may transfer
      // a guest draft. Ordinary sign-in/account changes never inherit it.
      const resume = router.query.resumeDraft;
      if (userId && typeof resume === 'string') {
        const raw = sessionStorage.getItem(TRANSFER_KEY);
        const transfer = raw ? JSON.parse(raw) : null;
        if (transfer?.nonce === resume && Date.now() - transfer.createdAt >= 0 && Date.now() - transfer.createdAt < 30 * 60 * 1000) {
          const guest = parseDraft(transfer.draft, 'guest');
          if (guest.status === 'ok') {
            saved = guest;
            // Persist under the authenticated owner before consuming handoff.
            localStorage.setItem(key, encodeDraft(owner, guest.draft.snapshot));
            sessionStorage.removeItem(TRANSFER_KEY);
            localStorage.removeItem(draftKey('guest'));
            setMessage('已接續登入前的草稿；草稿已自動保存於此瀏覽器，保留7日。');
          }
        }
      }
      if (saved.status !== 'ok') saved = parseDraft(localStorage.getItem(key), owner);
      if (saved.status === 'ok') { apply(saved.draft.snapshot); restored = true;
        setMessage(previous => previous || '已還原草稿；草稿保留7日，尚未保存到「我的餐單」。'); }
      else if (saved.status === 'expired') setMessage('之前的草稿已超過7日，請重新安排餐單。');
      else if (saved.status === 'invalid') setMessage('草稿資料無法讀取，請重新安排餐單。');

      // Explicit homepage import wins over an ordinary existing draft.
      if (router.query.source === 'home-plan') {
        const raw = sessionStorage.getItem('prepmeal:generateSeedPlan');
        if (raw) {
          const seed = JSON.parse(raw);
          if (Array.isArray(seed?.weeklyPlan)) {
            const imported: DraftSnapshot = { ...snapshot, shoppingProgress: emptyProgress(), lockedSlots: {}, notices: [],
              weeklyPlan: Object.fromEntries(DAY_KEYS.map((day, index) => [day,
                (seed.weeklyPlan[index]?.items || []).slice(0, 3).map((item: { recipeId?: string | number }) => item.recipeId != null ? String(item.recipeId) : null)])) };
            apply(imported); restored = true;
            localStorage.setItem(key, encodeDraft(owner, imported));
            setMessage('已載入首頁餐單並保存草稿；尚未保存到「我的餐單」。');
          }
          sessionStorage.removeItem('prepmeal:generateSeedPlan');
        }
      }
    } catch {
      // A valid handoff can still be restored in memory if persistent storage is
      // blocked. Leave its marker intact so the user can retry after login.
      if (saved.status === 'ok' && !restored) { apply(saved.draft.snapshot); restored = true; }
      setMessage('此瀏覽器未能保存草稿，請勿重新載入；登入後可保存到「我的餐單」。');
    }
    try { lastStored.current = localStorage.getItem(key); } catch { /* The visible storage warning already explains this. */ }
    if (!restored) lastSnapshot.current = fingerprint;
    setReady(true);
  }, [loadingRecipes, recipesError, router.isReady, router.query, userId, key, owner, apply, snapshot, fingerprint]);

  useEffect(() => {
    if (!ready || conflict || fingerprint === lastSnapshot.current) return;
    try {
      if (localStorage.getItem(key) !== lastStored.current) {
        setConflict(true);
        setMessage('另一分頁已更改草稿，已暫停自動保存。請選擇載入或保留此頁。');
        return;
      }
      const raw = encodeDraft(owner, snapshot);
      localStorage.setItem(key, raw);
      lastStored.current = raw;
      lastSnapshot.current = fingerprint;
      setMessage('草稿已自動保存於此瀏覽器，保留7日；尚未保存到「我的餐單」。');
    } catch { setMessage('草稿保存失敗，請勿重新載入；登入後可保存到「我的餐單」。'); }
  }, [ready, conflict, fingerprint, snapshot, key, owner]);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.storageArea === localStorage && (event.key === key || event.key === null)) {
        setConflict(true);
        setMessage('另一分頁已更改草稿，已暫停自動保存。請選擇載入或保留此頁。');
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [key]);

  const resolveConflict = (keepMine: boolean) => {
    try {
      if (keepMine) {
        const raw = encodeDraft(owner, snapshot);
        localStorage.setItem(key, raw);
        lastStored.current = raw;
        lastSnapshot.current = fingerprint;
        setMessage('已保留此頁草稿並自動保存，保留7日。');
      } else {
        const raw = localStorage.getItem(key);
        const other = parseDraft(raw, owner);
        if (other.status !== 'ok') { setMessage('另一分頁的草稿已移除、過期或無法讀取；可選擇保留此頁。'); return; }
        lastStored.current = raw;
        apply(other.draft.snapshot);
        setMessage('已載入另一分頁的草稿。');
      }
      setConflict(false);
    } catch { setMessage('未能保存或讀取草稿，請保留此頁並稍後再試。'); }
  };

  const prepareLogin = () => {
    const nonce = crypto.randomUUID();
    sessionStorage.setItem(TRANSFER_KEY, JSON.stringify({ nonce, createdAt: Date.now(), draft: encodeDraft('guest', snapshot) }));
    return `/generate?resumeDraft=${encodeURIComponent(nonce)}`;
  };
  return { shoppingProgress, setShoppingProgress, resetShoppingProgress: () => setShoppingProgress(emptyProgress()), ready, message, notices, conflict, resolveConflict, prepareLogin, clearNotices: () => setNotices([]) };
}
