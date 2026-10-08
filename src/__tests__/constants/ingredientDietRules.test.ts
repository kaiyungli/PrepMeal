/**
 * Tests for ingredient-based diet rules
 */
import { describe, expect, it } from 'vitest';
import {
  isRecipeVegetarianByIngredients,
  isRecipeEggLactoByIngredients,
  containsForbiddenAnimalProtein,
  containsEgg,
  containsDairy,
  containsEggOrDairy,
  deriveIngredientDietTags,
  type IngredientInput,
} from '@/constants/ingredientDietRules';

describe('containsForbiddenAnimalProtein', () => {
  describe('valid cases (no forbidden)', () => {
    it('vegetables only -> false', () => {
      const input = { ingredients: [{ name: 'tomato' }, { name: 'onion' }] };
      expect(containsForbiddenAnimalProtein(input)).toBe(false);
    });

    it('egg only -> false', () => {
      const input = { ingredients: [{ name: 'egg' }] };
      expect(containsForbiddenAnimalProtein(input)).toBe(false);
    });

    it('milk + oats -> false', () => {
      const input = { ingredients: [{ name: 'milk' }, { name: 'oats' }] };
      expect(containsForbiddenAnimalProtein(input)).toBe(false);
    });
  });

  describe('invalid cases (has forbidden)', () => {
    it('shrimp + egg -> true', () => {
      const input = { ingredients: [{ name: 'shrimp' }, { name: 'egg' }] };
      expect(containsForbiddenAnimalProtein(input)).toBe(true);
    });

    it('fish + butter -> true', () => {
      const input = { ingredients: [{ name: 'fish' }, { name: 'butter' }] };
      expect(containsForbiddenAnimalProtein(input)).toBe(true);
    });

    it('chicken + milk -> true', () => {
      const input = { ingredients: [{ name: 'chicken' }, { name: 'milk' }] };
      expect(containsForbiddenAnimalProtein(input)).toBe(true);
    });

    it('beef + cheese -> true', () => {
      const input = { ingredients: [{ name: 'beef' }, { name: 'cheese' }] };
      expect(containsForbiddenAnimalProtein(input)).toBe(true);
    });

    it('pork + egg -> true', () => {
      const input = { ingredients: [{ name: 'pork' }, { name: 'egg' }] };
      expect(containsForbiddenAnimalProtein(input)).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('empty ingredient list -> false', () => {
      const input = { ingredients: [] };
      expect(containsForbiddenAnimalProtein(input)).toBe(false);
    });

    it('null ingredients -> false', () => {
      const input = { ingredients: null as unknown as IngredientInput[] };
      expect(containsForbiddenAnimalProtein(input)).toBe(false);
    });

    it('case insensitive', () => {
      const input = { ingredients: [{ name: 'CHICKEN' }, { name: 'BEEF' }] };
      expect(containsForbiddenAnimalProtein(input)).toBe(true);
    });

    it('slug matching works', () => {
      const input = { ingredients: [{ name: 'stir fry', slug: 'chicken-meat' }] };
      expect(containsForbiddenAnimalProtein(input)).toBe(true);
    });
  });
});

describe('containsEgg', () => {
  it('egg -> true', () => {
    expect(containsEgg({ ingredients: [{ name: 'egg' }] })).toBe(true);
  });

  it('鸡蛋 -> true (Chinese)', () => {
    expect(containsEgg({ ingredients: [{ name: '鸡蛋' }] })).toBe(true);
  });

  it('鸡蛋 derives the egg_lacto tag for a vegetarian recipe', () => {
    expect(deriveIngredientDietTags({ ingredients: [{ name: '鸡蛋' }, { name: '番茄' }] }))
      .toEqual(['vegetarian', 'egg_lacto']);
  });

  it('milk -> false', () => {
    expect(containsEgg({ ingredients: [{ name: 'milk' }] })).toBe(false);
  });

  it('vegetables only -> false', () => {
    expect(containsEgg({ ingredients: [{ name: 'tomato' }, { name: 'carrot' }] })).toBe(false);
  });
});

describe('containsDairy', () => {
  it('milk -> true', () => {
    expect(containsDairy({ ingredients: [{ name: 'milk' }] })).toBe(true);
  });

  it('cheese -> true', () => {
    expect(containsDairy({ ingredients: [{ name: 'cheese' }] })).toBe(true);
  });

  it('牛奶 -> true (Chinese)', () => {
    expect(containsDairy({ ingredients: [{ name: '牛奶' }] })).toBe(true);
  });

  it('egg -> false', () => {
    expect(containsDairy({ ingredients: [{ name: 'egg' }] })).toBe(false);
  });
});

describe('containsEggOrDairy', () => {
  it('egg only -> true', () => {
    expect(containsEggOrDairy({ ingredients: [{ name: 'egg' }] })).toBe(true);
  });

  it('milk only -> true', () => {
    expect(containsEggOrDairy({ ingredients: [{ name: 'milk' }] })).toBe(true);
  });

  it('both egg + dairy -> true', () => {
    expect(containsEggOrDairy({ ingredients: [{ name: 'egg' }, { name: 'milk' }] })).toBe(true);
  });

  it('vegetables only -> false', () => {
    expect(containsEggOrDairy({ ingredients: [{ name: 'tomato' }] })).toBe(false);
  });

  it('empty -> false', () => {
    expect(containsEggOrDairy({ ingredients: [] })).toBe(false);
  });
});

describe('isRecipeVegetarianByIngredients', () => {
  describe('valid (vegetarian)', () => {
    it('vegetables only -> true', () => {
      expect(isRecipeVegetarianByIngredients({
        ingredients: [{ name: 'tomato' }, { name: 'onion' }]
      })).toBe(true);
    });

    it('egg + tomato -> true', () => {
      expect(isRecipeVegetarianByIngredients({
        ingredients: [{ name: 'egg' }, { name: 'tomato' }]
      })).toBe(true);
    });

    it('milk + oats -> true', () => {
      expect(isRecipeVegetarianByIngredients({
        ingredients: [{ name: 'milk' }, { name: 'oats' }]
      })).toBe(true);
    });

    it('cheese + pasta -> true', () => {
      expect(isRecipeVegetarianByIngredients({
        ingredients: [{ name: 'cheese' }, { name: 'pasta' }]
      })).toBe(true);
    });
  });

  describe('invalid (not vegetarian)', () => {
    it('shrimp + egg -> false', () => {
      expect(isRecipeVegetarianByIngredients({
        ingredients: [{ name: 'shrimp' }, { name: 'egg' }]
      })).toBe(false);
    });

    it('fish + butter -> false', () => {
      expect(isRecipeVegetarianByIngredients({
        ingredients: [{ name: 'fish' }, { name: 'butter' }]
      })).toBe(false);
    });

    it('chicken + milk -> false', () => {
      expect(isRecipeVegetarianByIngredients({
        ingredients: [{ name: 'chicken' }, { name: 'milk' }]
      })).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('empty ingredient list -> false', () => {
      expect(isRecipeVegetarianByIngredients({ ingredients: [] })).toBe(false);
    });

    it('null ingredients -> false', () => {
      expect(isRecipeVegetarianByIngredients({ ingredients: null as unknown as IngredientInput[] })).toBe(false);
    });
  });
});

describe('isRecipeEggLactoByIngredients', () => {
  describe('valid (egg_lacto)', () => {
    it('egg only + vegetarian ingredients -> true', () => {
      expect(isRecipeEggLactoByIngredients({
        ingredients: [{ name: 'egg' }, { name: 'tomato' }]
      })).toBe(true);
    });

    it('milk only + vegetarian ingredients -> true', () => {
      expect(isRecipeEggLactoByIngredients({
        ingredients: [{ name: 'milk' }, { name: 'oats' }]
      })).toBe(true);
    });

    it('cheese only + vegetarian ingredients -> true', () => {
      expect(isRecipeEggLactoByIngredients({
        ingredients: [{ name: 'cheese' }, { name: 'pasta' }]
      })).toBe(true);
    });

    it('egg + dairy + vegetarian -> true', () => {
      expect(isRecipeEggLactoByIngredients({
        ingredients: [{ name: 'egg' }, { name: 'milk' }, { name: 'tomato' }]
      })).toBe(true);
    });
  });

  describe('invalid (not egg_lacto)', () => {
    it('vegan vegetarian recipe (no egg/dairy) -> false', () => {
      expect(isRecipeEggLactoByIngredients({
        ingredients: [{ name: 'tofu' }, { name: 'vegetables' }]
      })).toBe(false);
    });

    it('shrimp + egg -> false (not vegetarian)', () => {
      expect(isRecipeEggLactoByIngredients({
        ingredients: [{ name: 'shrimp' }, { name: 'egg' }]
      })).toBe(false);
    });

    it('fish + butter -> false (not vegetarian)', () => {
      expect(isRecipeEggLactoByIngredients({
        ingredients: [{ name: 'fish' }, { name: 'butter' }]
      })).toBe(false);
    });

    it('chicken + milk -> false (not vegetarian)', () => {
      expect(isRecipeEggLactoByIngredients({
        ingredients: [{ name: 'chicken' }, { name: 'milk' }]
      })).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('empty ingredient list -> false', () => {
      expect(isRecipeEggLactoByIngredients({ ingredients: [] })).toBe(false);
    });

    it('null ingredients -> false', () => {
      expect(isRecipeEggLactoByIngredients({ ingredients: null as unknown as IngredientInput[] })).toBe(false);
    });

    it('case insensitive ingredient names', () => {
      expect(isRecipeEggLactoByIngredients({
        ingredients: [{ name: 'EGG' }, { name: 'TOMATO' }]
      })).toBe(true);
    });

    it('slug matching works for egg_lacto', () => {
      expect(isRecipeEggLactoByIngredients({
        ingredients: [{ name: 'breakfast', slug: 'chicken-egg' }, { name: 'tofu' }]
      })).toBe(true); // chicken egg is an egg, not chicken meat
    });
  });
});

describe('deriveIngredientDietTags', () => {
  it('vegetables only -> [vegetarian]', () => {
    expect(deriveIngredientDietTags({
      ingredients: [{ name: 'tomato' }, { name: 'onion' }]
    })).toEqual(['vegetarian']);
  });

  it('egg + tomato -> [vegetarian, egg_lacto]', () => {
    expect(deriveIngredientDietTags({
      ingredients: [{ name: 'egg' }, { name: 'tomato' }]
    })).toEqual(['vegetarian', 'egg_lacto']);
  });

  it('milk + oats -> [vegetarian, egg_lacto]', () => {
    expect(deriveIngredientDietTags({
      ingredients: [{ name: 'milk' }, { name: 'oats' }]
    })).toEqual(['vegetarian', 'egg_lacto']);
  });

  it('tofu + vegetables -> [vegetarian] (no egg_lacto)', () => {
    expect(deriveIngredientDietTags({
      ingredients: [{ name: 'tofu' }, { name: 'vegetables' }]
    })).toEqual(['vegetarian']);
  });

  it('chicken + egg -> [] (not vegetarian)', () => {
    expect(deriveIngredientDietTags({
      ingredients: [{ name: 'chicken' }, { name: 'egg' }]
    })).toEqual([]);
  });

  it('empty -> []', () => {
    expect(deriveIngredientDietTags({ ingredients: [] })).toEqual([]);
  });
});

describe('Chinese ingredient edge cases', () => {
  describe('should be vegetarian (no forbidden)', () => {
    it('牛奶 (milk) -> true', () => {
      expect(isRecipeVegetarianByIngredients({
        ingredients: [{ name: '牛奶' }, { name: '燕麥' }]
      })).toBe(true);
    });

    it('牛油 (butter) -> true', () => {
      expect(isRecipeVegetarianByIngredients({
        ingredients: [{ name: '牛油' }, { name: '麵包' }]
      })).toBe(true);
    });

    it('肉桂 (cinnamon) -> true', () => {
      expect(isRecipeVegetarianByIngredients({
        ingredients: [{ name: '肉桂' }, { name: '糖' }]
      })).toBe(true);
    });
  });

  describe('should NOT be vegetarian (has forbidden)', () => {
    it('雞肉 (chicken) -> false', () => {
      expect(isRecipeVegetarianByIngredients({
        ingredients: [{ name: '雞肉' }, { name: '蔬菜' }]
      })).toBe(false);
    });

    it('牛肉 (beef) -> false', () => {
      expect(isRecipeVegetarianByIngredients({
        ingredients: [{ name: '牛肉' }, { name: '洋蔥' }]
      })).toBe(false);
    });

    it('豬肉 (pork) -> false', () => {
      expect(isRecipeVegetarianByIngredients({
        ingredients: [{ name: '豬肉' }, { name: '豆腐' }]
      })).toBe(false);
    });
  });

  describe('egg_lacto edge cases', () => {
    it('牛油 (butter) alone -> egg_lacto true', () => {
      expect(isRecipeEggLactoByIngredients({
        ingredients: [{ name: '牛油' }, { name: '麵包' }]
      })).toBe(true);
    });

    it('牛奶 alone -> egg_lacto true', () => {
      expect(isRecipeEggLactoByIngredients({
        ingredients: [{ name: '牛奶' }, { name: '燕麥' }]
      })).toBe(true);
    });

    it('肉桂 alone -> egg_lacto false (no egg/dairy)', () => {
      expect(isRecipeEggLactoByIngredients({
        ingredients: [{ name: '肉桂' }, { name: '糖' }]
      })).toBe(false);
    });
  });
});


describe('catalogue compound aliases', () => {
  it.each([
    { name: '杏鮑菇', slug: 'king-oyster-mushroom' },
    { name: '蠔菇', slug: 'oyster-mushroom' },
    { name: '雞蛋', slug: 'chicken-egg' },
  ])('recognizes vegetarian compound $slug', (ingredient) => {
    expect(isRecipeVegetarianByIngredients({ ingredients: [ingredient] })).toBe(true);
  });
  it.each([
    { name: '鯛魚', slug: 'sea-bream' },
    { name: '鯛魚柳', slug: 'sea-bream-fillet' },
    { name: '豆豉鯪魚', slug: 'dace-with-black-bean' },
    { name: '雞髀', slug: 'unknown' },
    { name: 'oyster sauce' },
    { name: 'chicken meat', slug: 'king-oyster-mushroom' },
    { name: 'oyster mushroom', slug: 'pork' },
  ])('rejects animal ingredient $name', (ingredient) => {
    expect(isRecipeVegetarianByIngredients({ ingredients: [ingredient] })).toBe(false);
  });
  it('a mushroom never exempts a separate animal ingredient', () => {
    expect(deriveIngredientDietTags({ ingredients: [{ slug: 'king-oyster-mushroom' }, { name: '蝦仁' }] })).toEqual([]);
  });
});
