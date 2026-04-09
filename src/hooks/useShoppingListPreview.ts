/**
 * Homepage Shopping List Preview Hook
 * 
 * Reuses /api/shopping-list flow - NO duplicate aggregation logic
 * 
 * Architecture:
 *   weeklyPlan recipe IDs → /api/shopping-list → byCategory.toBuy → flat preview
 */

import { useState, useEffect } from 'react';

/**
 * Transform API response to flat preview list (first 5 items)
 * This is PRESENTATION ONLY - no aggregation logic
 */
function transformToPreview(apiResponse: any) {
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
  const [previewList, setPreviewList] = useState<Array<{name: string, qty: string, unit: string}>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
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
      return;
    }
    
    async function fetchPreview() {
      setIsLoading(true);
      setError(null);
      
      try {
        const response = await fetch('/api/shopping-list', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            recipeIds,
            pantryIngredients: [],
            servings: 1
          })
        });
        
        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }
        
        const data = await response.json();
        const preview = transformToPreview(data);
        setPreviewList(preview);
      } catch (err) {
        console.error('[shopping-list-preview] fetch error:', err);
        setError(String(err));
        setPreviewList([]);
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchPreview();
  }, [weeklyPlan]); // Re-fetch when weeklyPlan changes
  
  return { previewList, isLoading, error };
}
