/**
 * Shared selection reason configuration
 * 
 * Centralizes reason label mapping and display order for UI.
 */

// Label mapping: reason key -> display label
export const SELECTION_REASON_LABELS: Record<string, string> = {
  protein_main: "配合今餐主菜位置",
  "protein_main (dish_type)": "配合今餐主菜位置",
  veg_side: "適合作為配菜",
  diverse: "避免與前兩天重複",
};

// Display order (known keys first, unknown at end)
export const SELECTION_REASON_ORDER = [
  "protein_main",
  "protein_main (dish_type)",
  "veg_side",
  "diverse",
] as const;

/**
 * Get display label for a selection reason key
 */
export function getSelectionReasonLabel(key: string): string {
  return SELECTION_REASON_LABELS[key] || key;
}

/**
 * Sort reasons into stable display order
 */
export function sortSelectionReasons(reasons: string[]): string[] {
  return [...reasons].sort((a, b) => {
    const aIdx = SELECTION_REASON_ORDER.indexOf(a as any);
    const bIdx = SELECTION_REASON_ORDER.indexOf(b as any);
    if (aIdx === -1 && bIdx === -1) return 0;
    if (aIdx === -1) return 1;
    if (bIdx === -1) return -1;
    return aIdx - bIdx;
  });
}
