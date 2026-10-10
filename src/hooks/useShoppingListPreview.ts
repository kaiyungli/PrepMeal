/**
 * Homepage Shopping List Preview Hook
 * 
 * Reuses /api/shopping-list flow - NO duplicate aggregation logic
 * 
 * Architecture:
 *   weeklyPlan recipe IDs → /api/shopping-list → byCategory.toBuy → flat preview
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';

interface PreviewPlanDay {
  items?: Array<{ recipeId?: string | number | null }>;
}
interface ShoppingPreviewResponse {
  toBuy?: Array<{ items?: Array<{ name: string; quantity?: string | number | null; unit?: string | null }> }>;
}
const EMPTY_PLAN: PreviewPlanDay[] = [];

/**
 * Transform API response to flat preview list (first 5 items)
 * This is PRESENTATION ONLY - no aggregation logic
 */
function transformToPreview(apiResponse: ShoppingPreviewResponse | null): Array<{name: string, qty: string, unit: string}> {
  if (!apiResponse) return [];
  
  // Handle new API format: { toBuy: [{ category, items }] }
  const sections = Array.isArray(apiResponse?.toBuy) ? apiResponse.toBuy : [];
  const flatList = sections.flatMap(section => section.items || []);
  
  // Return only first 5 items for preview
  return flatList.slice(0, 5).map(item => ({
    name: item.name,
    qty: item.quantity != null ? String(item.quantity) : '',
    unit: item.unit || ''
  }));
}

/**
 * Hook to fetch shopping list preview
 * 
 * @param {any[]} weeklyPlan - Array of { items: [{ recipeId }] }
 * @param {Object} options - { enabled?: boolean }
 *   - enabled: if false, only stores plan but does NOT auto-fetch (lazy mode)
 * @returns {Object} - { previewList, isLoading, error, isAuthRequired, isInitialized, refresh }
 */
export function useShoppingListPreview(weeklyPlan: PreviewPlanDay[] = EMPTY_PLAN, options: { enabled?: boolean } = {}) {
  const { user, getAccessToken } = useAuth();
  const { enabled = true } = options;
  const [previewList, setPreviewList] = useState<Array<{name: string, qty: string, unit: string}>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAuthRequired, setIsAuthRequired] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Store latest weeklyPlan for manual refresh
  const weeklyPlanRef = useRef(weeklyPlan);
  weeklyPlanRef.current = weeklyPlan;
  
  // Request safety: track current request ID
  const requestIdRef = useRef(0);
  const inFlightRef = useRef(false);

  // A preview belongs to one plan and account, including in lazy mode.
  useEffect(() => {
    requestIdRef.current += 1;
    inFlightRef.current = false;
    setPreviewList([]);
    setIsInitialized(false);
    setIsLoading(false);
    setError(null);
    setIsAuthRequired(false);
    return () => {
      requestIdRef.current += 1;
      inFlightRef.current = false;
    };
  }, [weeklyPlan, user?.id]);
  
  // DoFetch - shared between auto-trigger and manual refresh
  const doFetch = useCallback(async () => {
    if (inFlightRef.current) return;
    const currentRequestId = ++requestIdRef.current;
    const plan = weeklyPlanRef.current;
    const recipeIds: string[] = [];
    for (const day of plan) {
      if (day.items) {
        for (const item of day.items) {
          if (item.recipeId) {
            recipeIds.push(String(item.recipeId));
          }
        }
      }
    }
    
    if (recipeIds.length === 0) {
      setPreviewList([]);
      setError(null);
      setIsLoading(false);
      setIsInitialized(true);
      setIsAuthRequired(false);
      return;
    }
    
    if (!user?.id) {
      setPreviewList([]);
      setError(null);
      setIsLoading(false);
      setIsInitialized(false);
      setIsAuthRequired(true);
      return;
    }
    
    inFlightRef.current = true;
    setIsInitialized(false);
    setIsLoading(true);
    setError(null);
    setIsAuthRequired(false);
    
    try {
      const token = await getAccessToken();
      if (currentRequestId !== requestIdRef.current) return;
      if (!token) {
        setIsAuthRequired(true);
        throw new Error('Authentication required');
      }
      const response = await fetch('/api/shopping-list', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          recipeIds,
          pantryIngredients: [],
          servings: 1
        })
      });
      
      if (currentRequestId !== requestIdRef.current) return;
      if (!response.ok) throw new Error(`API error: ${response.status}`);
      
      const data = await response.json();
      if (currentRequestId !== requestIdRef.current) return;
      
      const preview = transformToPreview(data);
      setPreviewList(preview);
      setIsInitialized(true);
    } catch (err) {
      if (currentRequestId !== requestIdRef.current) return;
      console.error('[shopping-list-preview] fetch error:', err);
      setError(String(err));
      setPreviewList([]);
    } finally {
      if (currentRequestId === requestIdRef.current) {
        inFlightRef.current = false;
        setIsLoading(false);
      }
    }
  }, [user, getAccessToken]);
  
  // Manual refresh function (call when user opens shopping list)
  const refresh = useCallback(() => {
    if (enabled) return; // Auto mode handles itself
    return doFetch();
  }, [enabled, doFetch]);
  
  // Auto-fetch when enabled and weeklyPlan changes
  useEffect(() => {
    if (!enabled) return;
    
    const timeoutId = setTimeout(() => {
      doFetch();
    }, 400);
    
    return () => clearTimeout(timeoutId);
  }, [enabled, weeklyPlan, doFetch]);
  
  return { previewList, isLoading, error, isAuthRequired, isInitialized, refresh };
}
