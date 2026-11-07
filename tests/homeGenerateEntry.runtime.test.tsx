import { act, cleanup, renderHook } from '@testing-library/react';
import { StrictMode, type ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useGeneratePreferences } from '@/hooks/useGeneratePreferences';
import { useHomeGenerateEntry } from '@/features/generate/hooks/useHomeGenerateEntry';
import { parseHomeGenerateEntry } from '@/features/generate/homeEntry';

const router = vi.hoisted(() => ({ isReady: true, query: {} as Record<string, unknown>, replace: vi.fn().mockResolvedValue(true) }));
vi.mock('next/router', () => ({ useRouter: () => router }));
afterEach(cleanup);
beforeEach(() => { vi.clearAllMocks(); router.isReady = true; router.query = { source: 'home', days: '5', servings: '4' }; });

function useHarness({ ready = true, loading = false, error = null as string | null, conflict = false, hasRecipes = false } = {}) {
  const preferences = useGeneratePreferences();
  const generate = vi.fn();
  const clear = vi.fn();
  const entry = useHomeGenerateEntry({ ready, loading, error, conflict, hasRecipes, preferences, generate, clear });
  return { ...entry, preferences, generate, clear };
}

describe('homepage generator handoff', () => {
  it('rejects malformed, duplicate and unsupported settings', () => {
    for (const query of [{}, { source: 'home', days: '4', servings: '2' }, { source: 'home', days: ['7'], servings: '2' }, { source: 'home', days: '7', servings: '0' }, { source: 'home', days: '7', servings: '2.0' }]) expect(parseHomeGenerateEntry(query)).toBeNull();
    expect(parseHomeGenerateEntry({ source: 'home', days: '7', servings: '6' })).toEqual({ days: 7, servings: 6 });
  });

  it('waits for draft, router and recipes, then generates with committed settings once', () => {
    const generate = vi.fn();
    const clear = vi.fn();
    const result = renderHook(({ ready, loading, error }) => {
      const preferences = useGeneratePreferences();
      const entry = useHomeGenerateEntry({ ready, loading, error, conflict: false, hasRecipes: false, preferences, clear,
        generate: () => generate({ days: preferences.daysPerWeek, servings: preferences.servings, composition: preferences.dailyComposition }) });
      return { entry, preferences };
    }, { initialProps: { ready: false, loading: true, error: null as string | null }, wrapper: ({ children }: { children: ReactNode }) => <StrictMode>{children}</StrictMode> });
    expect(generate).not.toHaveBeenCalled();
    result.rerender({ ready: true, loading: false, error: 'offline' });
    expect(generate).not.toHaveBeenCalled();
    result.rerender({ ready: true, loading: false, error: null });
    expect(generate).toHaveBeenCalledExactlyOnceWith({ days: 5, servings: 4, composition: 'meat_veg' });
    expect(clear).toHaveBeenCalledTimes(1);
    expect(result.result.current.preferences.allowCompleteMeal).toBe(false);
    result.rerender({ ready: true, loading: false, error: null });
    expect(generate).toHaveBeenCalledTimes(1);
    expect(router.replace).toHaveBeenCalledWith({ pathname: '/generate', query: {} }, undefined, { shallow: true });
  });

  it('keeps existing meals and settings until the visitor accepts', () => {
    const generate = vi.fn(); const clear = vi.fn();
    const { result } = renderHook(() => {
      const preferences = useGeneratePreferences();
      const entry = useHomeGenerateEntry({ ready: true, loading: false, error: null, conflict: false, hasRecipes: true, preferences, generate, clear });
      return { ...entry, preferences };
    });
    expect(result.current.pending).toEqual({ days: 5, servings: 4 });
    expect(result.current.preferences.servings).toBe(2);
    expect(clear).not.toHaveBeenCalled();
    expect(generate).not.toHaveBeenCalled();
    act(() => result.current.accept());
    expect(result.current.pending).toBeNull();
    expect(result.current.preferences.servings).toBe(4);
    expect(generate).toHaveBeenCalledTimes(1);
    expect(clear).toHaveBeenCalledTimes(1);
  });

  it('dismisses without touching an existing draft; conflicts block initiation', () => {
    const { result, rerender } = renderHook(({ conflict }) => useHarness({ conflict, hasRecipes: true }), { initialProps: { conflict: true } });
    expect(result.current.pending).toBeNull();
    rerender({ conflict: false });
    expect(result.current.pending).not.toBeNull();
    act(() => result.current.dismiss());
    expect(result.current.pending).toBeNull();
    expect(result.current.preferences.servings).toBe(2);
    expect(router.replace).toHaveBeenCalledTimes(1);
  });
});
