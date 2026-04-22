/**
 * Tests for nutrition tagging rules
 */
import { isRecipeHighProtein, HIGH_PROTEIN } from '@/constants/nutritionRules';

describe('isRecipeHighProtein', () => {
  // Valid cases
  describe('valid cases', () => {
    it('main dish, 30g protein, 400 kcal -> true', () => {
      expect(isRecipeHighProtein({
        protein_g: 30,
        calories_per_serving: 400,
        dish_type: 'main',
        is_complete_meal: false,
      })).toBe(true);
    });

    it('staple, is_complete_meal=true, 37g protein, 630 kcal -> true', () => {
      expect(isRecipeHighProtein({
        protein_g: 37,
        calories_per_serving: 630,
        dish_type: 'staple',
        is_complete_meal: true,
      })).toBe(true);
    });

    it('main dish, 25g protein, 420 kcal -> true', () => {
      expect(isRecipeHighProtein({
        protein_g: 25,
        calories_per_serving: 420,
        dish_type: 'main',
        is_complete_meal: false,
      })).toBe(true);
    });

    it('main dish, 26g protein, 100 kcal -> true (high ratio)', () => {
      expect(isRecipeHighProtein({
        protein_g: 26,
        calories_per_serving: 100,
        dish_type: 'main',
        is_complete_meal: false,
      })).toBe(true);
    });
  });

  // Invalid cases
  describe('invalid cases', () => {
    it('main dish, 24g protein, 180 kcal -> false (protein < 25)', () => {
      expect(isRecipeHighProtein({
        protein_g: 24,
        calories_per_serving: 180,
        dish_type: 'main',
        is_complete_meal: false,
      })).toBe(false);
    });

    it('soup, 26g protein, 220 kcal -> false (not main, not complete)', () => {
      expect(isRecipeHighProtein({
        protein_g: 26,
        calories_per_serving: 220,
        dish_type: 'soup',
        is_complete_meal: false,
      })).toBe(false);
    });

    it('side, 30g protein, 300 kcal -> false (not main, not complete)', () => {
      expect(isRecipeHighProtein({
        protein_g: 30,
        calories_per_serving: 300,
        dish_type: 'side',
        is_complete_meal: false,
      })).toBe(false);
    });

    it('main dish, 32g protein, 650 kcal -> false (ratio < 0.20)', () => {
      expect(isRecipeHighProtein({
        protein_g: 32,
        calories_per_serving: 650,
        dish_type: 'main',
        is_complete_meal: false,
      })).toBe(false);
    });

    it('null protein -> false', () => {
      expect(isRecipeHighProtein({
        protein_g: null,
        calories_per_serving: 400,
        dish_type: 'main',
        is_complete_meal: false,
      })).toBe(false);
    });

    it('null calories -> false', () => {
      expect(isRecipeHighProtein({
        protein_g: 30,
        calories_per_serving: null,
        dish_type: 'main',
        is_complete_meal: false,
      })).toBe(false);
    });

    it('zero calories -> false', () => {
      expect(isRecipeHighProtein({
        protein_g: 30,
        calories_per_serving: 0,
        dish_type: 'main',
        is_complete_meal: false,
      })).toBe(false);
    });
  });

  // Edge cases
  describe('edge cases', () => {
    it('string numbers work', () => {
      expect(isRecipeHighProtein({
        protein_g: '30',
        calories_per_serving: '400',
        dish_type: 'main',
        is_complete_meal: false,
      })).toBe(true);
    });

    it('case insensitive dish_type', () => {
      expect(isRecipeHighProtein({
        protein_g: 30,
        calories_per_serving: 400,
        dish_type: 'MAIN',
        is_complete_meal: false,
      })).toBe(true);
    });
  });
});
