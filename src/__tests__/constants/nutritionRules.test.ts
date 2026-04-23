/**
 * Tests for nutrition tagging rules
 */
import { isRecipeHighProtein, isRecipeLowFat, isRecipeLowCalorie, HIGH_PROTEIN_RULE, LOW_FAT_RULE, LOW_CALORIE_RULE } from '@/constants/nutritionRules';

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

    // Edge case: dish_type = null, is_complete_meal = true
    it('null dish_type, is_complete_meal=true, 30g protein, 400 kcal -> true', () => {
      expect(isRecipeHighProtein({
        protein_g: 30,
        calories_per_serving: 400,
        dish_type: null,
        is_complete_meal: true,
      })).toBe(true);
    });

    // Edge case: dish_type with whitespace
    it('dish_type = " main " (with spaces), 30g protein, 400 kcal -> true', () => {
      expect(isRecipeHighProtein({
        protein_g: 30,
        calories_per_serving: 400,
        dish_type: ' main ',
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

    // Edge case: null dish_type, is_complete_meal = false
    it('null dish_type, is_complete_meal=false -> false', () => {
      expect(isRecipeHighProtein({
        protein_g: 30,
        calories_per_serving: 400,
        dish_type: null,
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

    it('undefined values -> false', () => {
      expect(isRecipeHighProtein({
        protein_g: undefined,
        calories_per_serving: 400,
        dish_type: 'main',
        is_complete_meal: false,
      })).toBe(false);
    });
  });
});

describe('isRecipeLowFat', () => {
  // Valid cases
  describe('valid cases', () => {
    it('main, 9g fat, 450 kcal -> true', () => {
      expect(isRecipeLowFat({
        fat_g: 9,
        calories_per_serving: 450,
        dish_type: 'main',
        is_complete_meal: false,
      })).toBe(true);
    });

    it('main, 6g fat, 180 kcal -> true', () => {
      expect(isRecipeLowFat({
        fat_g: 6,
        calories_per_serving: 180,
        dish_type: 'main',
        is_complete_meal: false,
      })).toBe(true);
    });

    it('staple + is_complete_meal=true, 10g fat, 370 kcal -> true', () => {
      expect(isRecipeLowFat({
        fat_g: 10,
        calories_per_serving: 370,
        dish_type: 'staple',
        is_complete_meal: true,
      })).toBe(true);
    });

    it('main, 10g fat, 600 kcal -> true (low ratio)', () => {
      expect(isRecipeLowFat({
        fat_g: 10,
        calories_per_serving: 600,
        dish_type: 'main',
        is_complete_meal: false,
      })).toBe(true);
    });

    // Edge case: dish_type = null, is_complete_meal = true
    it('null dish_type, is_complete_meal=true, 8g fat, 300 kcal -> true', () => {
      expect(isRecipeLowFat({
        fat_g: 8,
        calories_per_serving: 300,
        dish_type: null,
        is_complete_meal: true,
      })).toBe(true);
    });
  });

  // Invalid cases
  describe('invalid cases', () => {
    it('main, 10g fat, 220 kcal -> false (ratio too high)', () => {
      expect(isRecipeLowFat({
        fat_g: 10,
        calories_per_serving: 220,
        dish_type: 'main',
        is_complete_meal: false,
      })).toBe(false);
    });

    it('soup, 6g fat, 180 kcal -> false', () => {
      expect(isRecipeLowFat({
        fat_g: 6,
        calories_per_serving: 180,
        dish_type: 'soup',
        is_complete_meal: false,
      })).toBe(false);
    });

    it('side, 5g fat, 95 kcal -> false', () => {
      expect(isRecipeLowFat({
        fat_g: 5,
        calories_per_serving: 95,
        dish_type: 'side',
        is_complete_meal: false,
      })).toBe(false);
    });

    it('main, 12g fat, 450 kcal -> false (fat > 10)', () => {
      expect(isRecipeLowFat({
        fat_g: 12,
        calories_per_serving: 450,
        dish_type: 'main',
        is_complete_meal: false,
      })).toBe(false);
    });

    it('null fat -> false', () => {
      expect(isRecipeLowFat({
        fat_g: null,
        calories_per_serving: 400,
        dish_type: 'main',
        is_complete_meal: false,
      })).toBe(false);
    });

    it('null calories -> false', () => {
      expect(isRecipeLowFat({
        fat_g: 8,
        calories_per_serving: null,
        dish_type: 'main',
        is_complete_meal: false,
      })).toBe(false);
    });

    it('zero calories -> false', () => {
      expect(isRecipeLowFat({
        fat_g: 8,
        calories_per_serving: 0,
        dish_type: 'main',
        is_complete_meal: false,
      })).toBe(false);
    });

    // Edge case: null dish_type, is_complete_meal = false
    it('null dish_type, is_complete_meal=false -> false', () => {
      expect(isRecipeLowFat({
        fat_g: 8,
        calories_per_serving: 300,
        dish_type: null,
        is_complete_meal: false,
      })).toBe(false);
    });
  });

  // Edge cases
  describe('edge cases', () => {
    it('string numbers work', () => {
      expect(isRecipeLowFat({
        fat_g: '9',
        calories_per_serving: '450',
        dish_type: 'main',
        is_complete_meal: false,
      })).toBe(true);
    });

    it('case insensitive dish_type', () => {
      expect(isRecipeLowFat({
        fat_g: 9,
        calories_per_serving: 450,
        dish_type: 'MAIN',
        is_complete_meal: false,
      })).toBe(true);
    });

    it('undefined values -> false', () => {
      expect(isRecipeLowFat({
        fat_g: undefined,
        calories_per_serving: 400,
        dish_type: 'main',
        is_complete_meal: false,
      })).toBe(false);
    });
  });
});
describe('isRecipeLowCalorie', () => {
  // Valid cases
  describe('valid cases', () => {
    it('main, 360 kcal -> true', () => {
      expect(isRecipeLowCalorie({
        calories_per_serving: 360,
        dish_type: 'main',
        is_complete_meal: false,
      })).toBe(true);
    });

    it('staple + is_complete_meal=true, 400 kcal -> true', () => {
      expect(isRecipeLowCalorie({
        calories_per_serving: 400,
        dish_type: 'staple',
        is_complete_meal: true,
      })).toBe(true);
    });

    it('soup, 260 kcal -> true', () => {
      expect(isRecipeLowCalorie({
        calories_per_serving: 260,
        dish_type: 'soup',
        is_complete_meal: false,
      })).toBe(true);
    });

    it('side, 300 kcal -> true', () => {
      expect(isRecipeLowCalorie({
        calories_per_serving: 300,
        dish_type: 'side',
        is_complete_meal: false,
      })).toBe(true);
    });

    // Edge case: null dish_type with is_complete_meal=true
    it('null dish_type, is_complete_meal=true, 380 kcal -> true', () => {
      expect(isRecipeLowCalorie({
        calories_per_serving: 380,
        dish_type: null,
        is_complete_meal: true,
      })).toBe(true);
    });
  });

  // Invalid cases
  describe('invalid cases', () => {
    it('main, 450 kcal -> false', () => {
      expect(isRecipeLowCalorie({
        calories_per_serving: 450,
        dish_type: 'main',
        is_complete_meal: false,
      })).toBe(false);
    });

    it('staple, 420 kcal -> false', () => {
      expect(isRecipeLowCalorie({
        calories_per_serving: 420,
        dish_type: 'staple',
        is_complete_meal: false,
      })).toBe(false);
    });

    it('soup, 320 kcal -> false', () => {
      expect(isRecipeLowCalorie({
        calories_per_serving: 320,
        dish_type: 'soup',
        is_complete_meal: false,
      })).toBe(false);
    });

    it('side, 350 kcal -> false', () => {
      expect(isRecipeLowCalorie({
        calories_per_serving: 350,
        dish_type: 'side',
        is_complete_meal: false,
      })).toBe(false);
    });

    it('null calories -> false', () => {
      expect(isRecipeLowCalorie({
        calories_per_serving: null,
        dish_type: 'main',
        is_complete_meal: false,
      })).toBe(false);
    });

    it('zero calories -> false', () => {
      expect(isRecipeLowCalorie({
        calories_per_serving: 0,
        dish_type: 'main',
        is_complete_meal: false,
      })).toBe(false);
    });

    // Edge case: unknown dish type without is_complete_meal
    it('unknown dish type, 200 kcal -> false', () => {
      expect(isRecipeLowCalorie({
        calories_per_serving: 200,
        dish_type: 'appetizer',
        is_complete_meal: false,
      })).toBe(false);
    });
  });

  // Edge cases
  describe('edge cases', () => {
    it('string calories work', () => {
      expect(isRecipeLowCalorie({
        calories_per_serving: '360',
        dish_type: 'main',
        is_complete_meal: false,
      })).toBe(true);
    });

    it('case insensitive dish_type', () => {
      expect(isRecipeLowCalorie({
        calories_per_serving: 360,
        dish_type: 'MAIN',
        is_complete_meal: false,
      })).toBe(true);
    });

    it('undefined calories -> false', () => {
      expect(isRecipeLowCalorie({
        calories_per_serving: undefined,
        dish_type: 'main',
        is_complete_meal: false,
      })).toBe(false);
    });
  });
});
