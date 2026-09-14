import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  CUISINES,
  DISH_TYPES,
  DIFFICULTIES,
  METHODS,
  SPEEDS,
  MEAL_ROLES,
  PRIMARY_PROTEINS,
  BUDGET_LEVELS,
} from '@/constants/recipeContract';
import * as adminRecipeAtomicParams from '@/lib/adminRecipeAtomicParams';
import { CUISINE_MAP, DISH_TYPE_MAP, PROTEIN_MAP, CUISINE_OPTIONS, DISH_TYPE_OPTIONS, PROTEIN_OPTIONS } from '@/constants/taxonomy';

// Contract tests for src/constants/recipeContract.js -- the single canonical,
// dependency-free copy of the eight admin-recipe metadata enums (verbatim
// from the live production CHECK constraints; see
// src/lib/adminRecipeAtomicParams.js for full provenance), now shared by
// backend validation, the Admin UI, and display taxonomy so all three layers
// cannot drift out of sync with the production contract again.

const RECIPE_FORM_PATH = path.resolve(__dirname, '../src/components/admin/RecipeForm.js');
const ADMIN_LIST_PATH = path.resolve(__dirname, '../src/pages/admin/recipes/index.js');

const recipeFormSource = fs.readFileSync(RECIPE_FORM_PATH, 'utf8');
const adminListSource = fs.readFileSync(ADMIN_LIST_PATH, 'utf8');

const CANONICAL_CONTRACT = {
  CUISINES: ['chinese', 'western', 'japanese', 'korean', 'thai', 'fusion'],
  DISH_TYPES: ['main', 'side', 'soup', 'staple', 'snack'],
  DIFFICULTIES: ['easy', 'medium', 'hard'],
  METHODS: ['stir_fry', 'steamed', 'fried', 'braised', 'boiled', 'baked'],
  SPEEDS: ['quick', 'normal', 'slow'],
  MEAL_ROLES: ['complete_meal', 'protein_main', 'veg_side', 'protein_side', 'soup'],
  PRIMARY_PROTEINS: ['chicken', 'beef', 'pork', 'fish', 'seafood', 'shrimp', 'tofu', 'egg', 'vegetarian', 'mixed'],
  BUDGET_LEVELS: ['budget', 'normal', 'premium'],
};

describe('recipeContract: the eight canonical arrays exactly match the production contract', () => {
  it('CUISINES', () => expect(CUISINES).toEqual(CANONICAL_CONTRACT.CUISINES));
  it('DISH_TYPES', () => expect(DISH_TYPES).toEqual(CANONICAL_CONTRACT.DISH_TYPES));
  it('DIFFICULTIES', () => expect(DIFFICULTIES).toEqual(CANONICAL_CONTRACT.DIFFICULTIES));
  it('METHODS', () => expect(METHODS).toEqual(CANONICAL_CONTRACT.METHODS));
  it('SPEEDS', () => expect(SPEEDS).toEqual(CANONICAL_CONTRACT.SPEEDS));
  it('MEAL_ROLES', () => expect(MEAL_ROLES).toEqual(CANONICAL_CONTRACT.MEAL_ROLES));
  it('PRIMARY_PROTEINS', () => expect(PRIMARY_PROTEINS).toEqual(CANONICAL_CONTRACT.PRIMARY_PROTEINS));
  it('BUDGET_LEVELS', () => expect(BUDGET_LEVELS).toEqual(CANONICAL_CONTRACT.BUDGET_LEVELS));

  it('every array is frozen (immutable)', () => {
    for (const arr of [CUISINES, DISH_TYPES, DIFFICULTIES, METHODS, SPEEDS, MEAL_ROLES, PRIMARY_PROTEINS, BUDGET_LEVELS]) {
      expect(Object.isFrozen(arr)).toBe(true);
    }
  });
});

describe('adminRecipeAtomicParams.js re-exports the same canonical values', () => {
  it('re-exports the identical array references for all eight enums', () => {
    expect(adminRecipeAtomicParams.CUISINES).toBe(CUISINES);
    expect(adminRecipeAtomicParams.DISH_TYPES).toBe(DISH_TYPES);
    expect(adminRecipeAtomicParams.DIFFICULTIES).toBe(DIFFICULTIES);
    expect(adminRecipeAtomicParams.METHODS).toBe(METHODS);
    expect(adminRecipeAtomicParams.SPEEDS).toBe(SPEEDS);
    expect(adminRecipeAtomicParams.MEAL_ROLES).toBe(MEAL_ROLES);
    expect(adminRecipeAtomicParams.PRIMARY_PROTEINS).toBe(PRIMARY_PROTEINS);
    expect(adminRecipeAtomicParams.BUDGET_LEVELS).toBe(BUDGET_LEVELS);
  });

  it('still exports buildRecipeAtomicParams (validation behaviour untouched)', () => {
    expect(typeof adminRecipeAtomicParams.buildRecipeAtomicParams).toBe('function');
  });
});

describe('display taxonomy: canonical order + non-empty labels', () => {
  it('CUISINE_OPTIONS follows CUISINES canonical order exactly', () => {
    expect(CUISINE_OPTIONS.map((o) => o.value)).toEqual(CUISINES);
  });

  it('DISH_TYPE_OPTIONS follows DISH_TYPES canonical order exactly', () => {
    expect(DISH_TYPE_OPTIONS.map((o) => o.value)).toEqual(DISH_TYPES);
  });

  it('PROTEIN_OPTIONS follows PRIMARY_PROTEINS canonical order exactly', () => {
    expect(PROTEIN_OPTIONS.map((o) => o.value)).toEqual(PRIMARY_PROTEINS);
  });

  it('every canonical cuisine value has a non-empty label', () => {
    for (const value of CUISINES) {
      expect(typeof CUISINE_MAP[value]).toBe('string');
      expect(CUISINE_MAP[value].trim()).not.toBe('');
    }
  });

  it('every canonical dish-type value has a non-empty label (including snack)', () => {
    for (const value of DISH_TYPES) {
      expect(typeof DISH_TYPE_MAP[value]).toBe('string');
      expect(DISH_TYPE_MAP[value].trim()).not.toBe('');
    }
    expect(DISH_TYPE_MAP.snack).toBe('小食');
  });

  it('every canonical primary-protein value has a non-empty label (including vegetarian)', () => {
    for (const value of PRIMARY_PROTEINS) {
      expect(typeof PROTEIN_MAP[value]).toBe('string');
      expect(PROTEIN_MAP[value].trim()).not.toBe('');
    }
    expect(PROTEIN_MAP.vegetarian).toBe('素食');
  });

  it('no CUISINE_OPTIONS/DISH_TYPE_OPTIONS/PROTEIN_OPTIONS entry has an empty label', () => {
    for (const opt of [...CUISINE_OPTIONS, ...DISH_TYPE_OPTIONS, ...PROTEIN_OPTIONS]) {
      expect(typeof opt.label).toBe('string');
      expect(opt.label.trim()).not.toBe('');
    }
  });
});

describe('RecipeForm.js consumes the shared contract module', () => {
  it('imports the canonical arrays from @/constants/recipeContract', () => {
    expect(recipeFormSource).toMatch(/from ['"]@\/constants\/recipeContract['"]/);
  });

  it('imports CUISINES, DISH_TYPES, and PRIMARY_PROTEINS (seafood coverage) by name', () => {
    expect(recipeFormSource).toMatch(/\bCUISINES\b/);
    expect(recipeFormSource).toMatch(/\bDISH_TYPES\b/);
    expect(recipeFormSource).toMatch(/\bPRIMARY_PROTEINS\b/);
  });

  it('no longer declares stale locally duplicated option arrays', () => {
    expect(recipeFormSource).not.toMatch(/const\s+cuisineOptions\s*=/);
    expect(recipeFormSource).not.toMatch(/const\s+dishTypeOptions\s*=/);
    expect(recipeFormSource).not.toMatch(/const\s+difficultyOptions\s*=/);
    expect(recipeFormSource).not.toMatch(/const\s+methodOptions\s*=/);
    expect(recipeFormSource).not.toMatch(/const\s+speedOptions\s*=/);
    expect(recipeFormSource).not.toMatch(/const\s+mealRoleOptions\s*=/);
    expect(recipeFormSource).not.toMatch(/const\s+primaryProteinOptions\s*=/);
    expect(recipeFormSource).not.toMatch(/const\s+budgetLevelOptions\s*=/);
  });

  it('makes seafood selectable (present in the consumed canonical array, and rendered from it)', () => {
    expect(PRIMARY_PROTEINS).toContain('seafood');
    expect(recipeFormSource).toMatch(/PRIMARY_PROTEINS\.map/);
  });
});

describe('Admin recipes list page consumes the shared contract module', () => {
  it('imports CUISINES and DISH_TYPES from @/constants/recipeContract', () => {
    expect(adminListSource).toMatch(/from ['"]@\/constants\/recipeContract['"]/);
    expect(adminListSource).toMatch(/\bCUISINES\b/);
    expect(adminListSource).toMatch(/\bDISH_TYPES\b/);
  });

  it('no longer declares stale local cuisine/dish-type option arrays', () => {
    expect(adminListSource).not.toMatch(/const\s+cuisineOptions\s*=/);
    expect(adminListSource).not.toMatch(/const\s+dishTypeOptions\s*=/);
  });

  it('invalid Admin filter options do not reappear', () => {
    expect(adminListSource).not.toMatch(/taiwanese/);
    expect(adminListSource).not.toMatch(/indian/);
    expect(adminListSource).not.toMatch(/italian/);
    expect(adminListSource).not.toMatch(/dessert/);
  });
});

describe('canonical contract has no invalid drift values anywhere it is defined', () => {
  it('CUISINES excludes taiwanese/indian/italian', () => {
    expect(CUISINES).not.toContain('taiwanese');
    expect(CUISINES).not.toContain('indian');
    expect(CUISINES).not.toContain('italian');
  });

  it('DISH_TYPES excludes dessert', () => {
    expect(DISH_TYPES).not.toContain('dessert');
  });
});
