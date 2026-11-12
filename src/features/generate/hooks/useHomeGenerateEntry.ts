/* eslint-disable react-hooks/set-state-in-effect -- Explicit navigation handoff waits for draft and catalogue hydration. */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { parseHomeGenerateEntry } from '../homeEntry';
import type { useGeneratePreferences } from '@/hooks/useGeneratePreferences';

type Request = NonNullable<ReturnType<typeof parseHomeGenerateEntry>>;
type Options = {
  ready: boolean; conflict: boolean; loading: boolean; error: string | null; hasRecipes: boolean;
  preferences: ReturnType<typeof useGeneratePreferences>;
  generate: () => void; clear: () => void;
};

/** Reuse the generator after settings commit, never during draft hydration. */
export function useHomeGenerateEntry(options: Options) {
  const router = useRouter();
  const handled = useRef(false);
  const [pending, setPending] = useState<Request | null>(null);
  const [preferencesOpenRequest, setPreferencesOpenRequest] = useState(0);
  const [applied, setApplied] = useState<Request | null>(null);
  const { ready, conflict, loading, error, hasRecipes, preferences, generate, clear } = options;
  const consumeUrl = useCallback(() => {
    const query = { ...router.query };
    delete query.source; delete query.days; delete query.servings; delete query.intent;
    void router.replace({ pathname: '/generate', query }, undefined, { shallow: true });
  }, [router]);
  const apply = useCallback((request: Request) => {
    if (request.intent === 'preferences') {
      // Settings-only navigation must not clear meals, filters or generate a plan.
      preferences.setDaysPerWeek(request.days);
      preferences.setServings(request.servings);
      setPreferencesOpenRequest(value => value + 1);
      setPending(null);
      consumeUrl();
      return;
    }
    clear();
    preferences.clearFilters();
    preferences.setExclusions([]);
    preferences.setBudget('normal');
    preferences.setDailyComposition('meat_veg');
    preferences.setAllowCompleteMeal(false);
    preferences.setDaysPerWeek(request.days);
    preferences.setServings(request.servings);
    setPending(null);
    setApplied(request);
    consumeUrl();
  }, [clear, preferences, consumeUrl]);

  useEffect(() => {
    if (handled.current || !router.isReady || !ready || conflict || loading || error) return;
    handled.current = true;
    const request = parseHomeGenerateEntry(router.query);
    if (!request) return;
    if (hasRecipes) setPending(request);
    else apply(request);
  }, [router.isReady, router.query, ready, conflict, loading, error, hasRecipes, apply]);

  useEffect(() => {
    if (!applied || !ready || conflict || loading || error) return;
    // Generation reads the same preferences as the settings UI and shopping list.
    if (preferences.daysPerWeek !== applied.days || preferences.servings !== applied.servings || preferences.dailyComposition !== 'meat_veg') return;
    setApplied(null);
    generate();
  }, [applied, ready, conflict, loading, error, preferences, generate]);

  return {
    pending, preferencesOpenRequest,
    accept: () => { if (pending && ready && !conflict && !loading && !error) apply(pending); },
    dismiss: () => { setPending(null); consumeUrl(); },
  };
}
