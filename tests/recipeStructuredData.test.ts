import { describe, expect, it } from 'vitest';
import { getRecipeStructuredData } from '@/lib/recipeStructuredData';

describe('recipe JSON-LD matches normalized and legacy detail shapes', () => {
  it('publishes actual steps, unit labels and the recipe base yield', () => {
    const schema = getRecipeStructuredData({ id: 'r', name: '炒麵', base_servings: 2,
      calories_per_serving: 578,
      ingredients: [{ name: '麵', quantity: 360, unit: { code: 'g', name: '克' } }],
      steps: ['煮麵。', '炒勻。'] });
    expect(schema).toMatchObject({ recipeYield: '2', recipeIngredient: ['360 克 麵'],
      recipeInstructions: [{ '@type': 'HowToStep', text: '煮麵。', position: 1 },
        { '@type': 'HowToStep', text: '炒勻。', position: 2 }],
      nutrition: { calories: '578 calories' } });
    expect(JSON.stringify(schema)).not.toContain('[object Object]');
  });
  it('keeps legacy steps, skips blank instructions and retains a zero quantity', () => {
    expect(getRecipeStructuredData({ id: 'r', name: '沙律', servings: 1,
      ingredients: [{ name: '鹽', quantity: 0, unit: 'g' }],
      steps: [{ step_no: 3, text: '拌勻。' }, ''] })).toMatchObject({
      recipeYield: '1', recipeIngredient: ['0 g 鹽'],
      recipeInstructions: [{ '@type': 'HowToStep', text: '拌勻。', position: 3 }],
    });
  });
});
