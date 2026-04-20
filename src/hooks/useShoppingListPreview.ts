/**
 * Homepage Shopping List Preview Hook
 * 
 * Reuses /api/shopping-list flow - NO duplicate aggregation logic
 * 
 * Architecture:
 *   weeklyPlan recipe IDs → /api/shopping-list → byCategory.toBuy → flat preview
 */

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';

/**
 * Transform API response to flat preview list (first 5 items)
 * This is PRESENTATION ONLY - no aggregation logic
 */
function transformToPreview(apiResponse: any): Array<{name: string, qty: string, unit: string}> {
  if (!apiResponse) return [];
  
  const { byCategory } = apiResponse;
  if (!byCategory?.toBuy) return [];
  
  // Flatten byCategory.toBuy into simple list
  const flatList = [];
  const categories = Object.keys(byCategory.toBuy);
  
  for (const category of categories) {
    const items = byCategory.toBuy[category] || [];
    for (const item of items) {
      flatList.push({
        name: item.name,
        qty: item.quantity != null ? String(item.quantity) : '',
        unit: item.unit || ''
      });
    }
  }
  
  // Return only first 5 items for preview
  return flatList.slice(0, 5);
}

/**
 * Hook to fetch shopping list preview for homepage
 * 
 * @param {Array} weeklyPlan - Array of { items: [{ recipeId }] }
 * @returns {Object} - { previewList, isLoading, error }
 */
export function useShoppingListPreview(weeklyPlan: any[] = []) {
  // @ts-ignore - useAuth hook
    const [previewList, setPreviewList] = useState<Array<{name: string, qty: string, unit: string}>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Request safety: track current request ID
  const requestIdRef = useRef(0);
  
  useEffect(() => {
    // Debounce: cancel previous timeout on rapid changes
    const timeoutId = setTimeout(() => {
      // Extract recipe IDs from weeklyPlan
      const recipeIds: string[] = [];
      for (const day of weeklyPlan) {
        if (day.items) {
          for (const item of day.items) {
            if (item.recipeId) {
              recipeIds.push(String(item.recipeId));
            }
          }
        }
      }
      
      // No recipes = no preview
      if (recipeIds.length === 0) {
        setPreviewList([]);
        setError(null);
        return;
      }
    
    async function fetchPreview() {
      // Increment request ID - this request is now "current"
      const currentRequestId = ++requestIdRef.current;
      
      setIsLoading(true);
      setError(null);
      
      try {
        const response = await fetch('/api/shopping-list', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            userId: null,
            recipeIds,
            pantryIngredients: [],
            servings: 1
          })
        });
        
        // Check if this is still the current request (not stale)
        if (currentRequestId !== requestIdRef.current) {
          return;
        }
        
        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Double-check after await
        if (currentRequestId !== requestIdRef.current) {
          return;
        }
        
        const preview = transformToPreview(data);
        setPreviewList(preview);
      } catch (err) {
        if (currentRequestId !== requestIdRef.current) {
          return;
        }
        
        console.error('[shopping-list-preview] fetch error:', err);
        setError(String(err));
        setPreviewList([]);
      } finally {
        if (currentRequestId === requestIdRef.current) {
          setIsLoading(false);
        }
      }
    }
    
    fetchPreview();
    }, 400);
    
    return () => clearTimeout(timeoutId);
  }, [weeklyPlan, null]);
  
  return { previewList, isLoading, error };
}