import { describe, expect, it } from 'vitest';
import { recipeProvenance } from '@/features/recipes/mappers/recipeProvenance';
import { normalizeRecipeDetail } from '@/features/recipes/mappers/normalizeRecipeDetail';
import type { RecipeDetailRow } from '@/features/recipes/services/getRecipeDetail';
import { formatQuantityForDisplay } from '@/lib/quantityFormatter';

describe('public recipe evidence', () => {
  it('preserves both generations of allergen metadata and source attribution', () => {
    const provenance = recipeProvenance({
      base_allergens: ['fish', 'soy'], allergens: ['soy', 'wheat'],
      allergen_notes: '全批產品備註：魚滑含花生油；魚片頭含雞味粉',
      source_attribution: { website: 'Just One Cookbook', original_recipe_url: 'https://www.justonecookbook.com/shrimp-yakisoba/', adaptation_note: '家常版改編' },
      nutrition: { status: 'REFERENCE_ESTIMATE_NOT_LAB_MEASURED', limitations: ['品牌有所不同'] },
      internal_ledger: 'must not be published',
    });
    expect(provenance).toMatchObject({
      allergens: ['fish', 'soy', 'wheat'], allergen_note: '材料及包裝可能有其他致敏原；請核對實購包裝，選配材料另計。',
      source_attribution: { website: 'Just One Cookbook', note: '家常版改編', url: 'https://www.justonecookbook.com/shrimp-yakisoba/' },
      nutrition_is_estimate: true, nutrition_notes: ['品牌有所不同'],
    });
    expect(JSON.stringify(provenance)).not.toContain('internal_ledger');
    expect(JSON.stringify(provenance)).not.toContain('魚滑');
    expect(JSON.stringify(provenance)).not.toContain('魚片頭');
  });
  it('rejects executable source URLs and handles missing or malformed metadata', () => {
    expect(recipeProvenance({ source_url: 'javascript:alert(1)' }).source_attribution).toBeNull();
    expect(recipeProvenance(null)).toMatchObject({ allergens: [], nutrition_is_estimate: false, source_attribution: null });
    expect(recipeProvenance({ allergens: 'fish', nutrition: [] }).allergens).toEqual([]);
  });
  it('keeps recipe total amounts distinct from per-serving nutrition', () => {
    const detail = normalizeRecipeDetail({ id: 'recipe', name: '炒麵', base_servings: 2,
      description: '家常版', source_data: { nutrition: { status: 'COMPLETE_REFERENCE_INPUT_ESTIMATE' } },
      ingredients: [{ id: 'i', name: '麵', slug: 'noodles', shopping_category: null, quantity: 360, unit: { code: 'g', name: '克' } }],
      steps: [], calories_per_serving: 578, image_url: null, cuisine: null, difficulty: null, method: null, total_time_minutes: null, cook_time_minutes: null, prep_time_minutes: null, protein_g: null, carbs_g: null, fat_g: null, primary_protein: null, dish_type: null, diet: null, is_complete_meal: false, created_at: '',
    } satisfies RecipeDetailRow);
    expect(detail).toMatchObject({ base_servings: 2, description: '家常版', calories_per_serving: 578, nutrition_is_estimate: true });
    expect(detail.ingredients[0].quantity).toBe(360);
    expect(detail).not.toHaveProperty('source_data');
  });
});

describe('measurement precision', () => {
  it.each(['g', '克', 'ml', '毫升', 'kg', 'l'])('retains small quantities for %s', unit => {
    expect(formatQuantityForDisplay(0.15, unit)).toBe('0.15');
    expect(formatQuantityForDisplay(0.3, unit)).toBe('0.3');
  });
  it('supports joined unit objects and retains count-unit shopping rounding', () => {
    expect(formatQuantityForDisplay(0.3, { code: 'g', name: '克' })).toBe('0.3');
    expect(formatQuantityForDisplay(1.5, 'pc')).toBe('2');
    expect(formatQuantityForDisplay(0, 'g')).toBe('0');
    expect(formatQuantityForDisplay(null, 'g')).toBe('');
  });
});
