// tests/mealPlanner.advanced.test.ts
// Deterministic tests for planWeekAdvanced slotRoles behavior

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { planWeekAdvanced } from '../src/lib/mealPlanner';
import { Recipe } from '../src/lib/types';

// Minimal mock recipes for testing
const createMockRecipe = (overrides: Partial<Recipe> = {}): Recipe => ({
  id: '',
  name: '',
  slug: '',
  cuisine: '',
  dish_type: 'main',
  method: 'stir_fry',
  primary_protein: '',
  meal_role: '',
  prep_time_minutes: 10,
  cook_time_minutes: 20,
  base_servings: 2,
  is_complete_meal: false,
  ingredients: [],
  steps: [],
  ...overrides,
});

// Test fixtures - explicit role-tagged recipes
const fixtures = {
  // Protein main dishes
  proteinMainExplicit: createMockRecipe({
    id: 'r1',
    name: '蒸石斑',
    meal_role: 'protein_main',
    dish_type: 'main',
    primary_protein: 'fish',
  }),
  proteinMainByDishType: createMockRecipe({
    id: 'r2',
    name: '牛排',
    dish_type: 'main',
    primary_protein: 'beef',
  }),
  proteinMainByProtein: createMockRecipe({
    id: 'r3',
    name: '雞肉卷',
    dish_type: 'side',
    primary_protein: 'chicken', // Has protein but is side type
  }),
  
  // Veg side dishes (no protein)
  vegSideExplicit: createMockRecipe({
    id: 'r4',
    name: '炒菜心',
    meal_role: 'veg_side',
    dish_type: 'side',
    primary_protein: '',
  }),
  vegSideNoProtein: createMockRecipe({
    id: 'r5',
    name: '涼拌黃瓜',
    dish_type: 'side',
    primary_protein: '',
  }),
  
  // Protein-heavy side (should NOT be picked for veg_side)
  sideWithProtein: createMockRecipe({
    id: 'r6',
    name: '牛肉炒蛋',
    dish_type: 'side',
    primary_protein: 'beef',
  }),
  
  // Soup
  soupExplicit: createMockRecipe({
    id: 'r7',
    name: '雞湯',
    meal_role: 'soup',
    dish_type: 'soup',
  }),
  
  // Complete meal
  completeMeal: createMockRecipe({
    id: 'r8',
    name: '叉燒飯',
    meal_role: 'complete_meal',
    dish_type: 'main',
    is_complete_meal: true,
  }),
  
  // Generic
  genericMain: createMockRecipe({
    id: 'r9',
    name: '炒飯',
    dish_type: 'main',
  }),
};

// Mock Math.random to ensure deterministic results
const mockRandom = (fixedValue = 0.5) => {
  vi.spyOn(Math, 'random').mockReturnValue(fixedValue);
};

describe('planWeekAdvanced slotRoles', () => {
  beforeEach(() => {
    mockRandom(0.5);
  });
  
  afterEach(() => {
    vi.restoreAllMocks();
  });

  // Test A: 2-slot composition
  it('should fill protein_main and veg_side slots correctly', () => {
    const recipes = [
      fixtures.proteinMainExplicit,
      fixtures.vegSideExplicit,
      fixtures.genericMain,
    ];
    
    const config = {
      daysPerWeek: 1,
      dishesPerDay: 2,
      slotRoles: ['protein_main', 'veg_side'],
      isWeekend: () => false,
      lockedSlots: {},
      lockedRecipes: {},
    };
    
    const plan = planWeekAdvanced(recipes, config);
    const dayRecipes = plan['mon'];
    
    expect(dayRecipes).toHaveLength(2);
    
    // Slot 0 should be protein_main-like
    const slot0 = dayRecipes[0];
    const isProteinMain0 = 
      slot0.meal_role === 'protein_main' ||
      slot0.dish_type === 'main' ||
      !!slot0.primary_protein;
    expect(isProteinMain0).toBe(true);
    
    // Slot 1 should be veg_side-like (no protein)
    const slot1 = dayRecipes[1];
    const isVegSide1 = 
      slot1.meal_role === 'veg_side' ||
      (slot1.dish_type === 'side' && !slot1.primary_protein);
    expect(isVegSide1).toBe(true);
  });

  // Test B: veg_side should avoid protein-heavy side
  it('should prefer non-protein side for veg_side slot', () => {
    const recipes = [
      fixtures.proteinMainExplicit,
      fixtures.vegSideNoProtein, // r5 - no protein
      fixtures.sideWithProtein, // r6 - has protein
    ];
    
    const config = {
      daysPerWeek: 1,
      dishesPerDay: 2,
      slotRoles: ['protein_main', 'veg_side'],
      isWeekend: () => false,
      lockedSlots: {},
      lockedRecipes: {},
    };
    
    const plan = planWeekAdvanced(recipes, config);
    const dayRecipes = plan['mon'];
    
    // veg_side slot (slot 1) should NOT have protein
    const vegSideSlot = dayRecipes[1];
    expect(vegSideSlot.primary_protein || '').toBe('');
  });

  // Test C: 3-slot composition
  it('should fill all three roles when available', () => {
    const recipes = [
      fixtures.proteinMainExplicit,
      fixtures.vegSideExplicit,
      fixtures.soupExplicit,
      fixtures.completeMeal,
    ];
    
    const config = {
      daysPerWeek: 1,
      dishesPerDay: 3,
      slotRoles: ['protein_main', 'veg_side', 'soup'],
      isWeekend: () => false,
      lockedSlots: {},
      lockedRecipes: {},
    };
    
    const plan = planWeekAdvanced(recipes, config);
    const dayRecipes = plan['mon'];
    
    expect(dayRecipes).toHaveLength(3);
    
    // Check soup exists in slot 2
    const soupSlot = dayRecipes[2];
    const isSoup = 
      soupSlot.meal_role === 'soup' ||
      soupSlot.dish_type === 'soup';
    expect(isSoup).toBe(true);
  });

  // Test D: fallback when explicit veg_side missing
  it('should fallback to plain side when explicit veg_side missing', () => {
    // Create recipes without explicit veg_side meal_role
    const recipes = [
      fixtures.proteinMainExplicit,
      createMockRecipe({
        id: 'side1',
        name: '普通蔬菜',
        dish_type: 'side',
        primary_protein: '',
        meal_role: '',
      }),
    ];
    
    const config = {
      daysPerWeek: 1,
      dishesPerDay: 2,
      slotRoles: ['protein_main', 'veg_side'],
      isWeekend: () => false,
      lockedSlots: {},
      lockedRecipes: {},
    };
    
    const plan = planWeekAdvanced(recipes, config);
    const dayRecipes = plan['mon'];
    
    expect(dayRecipes).toHaveLength(2);
    
    // Second slot should still be a side dish
    const sideSlot = dayRecipes[1];
    expect(sideSlot.dish_type).toBe('side');
  });

  // Test E: no duplicate recipes in same plan
  it('should not use duplicate recipes when alternatives exist', () => {
    const recipes = [
      fixtures.proteinMainExplicit,
      fixtures.proteinMainByDishType, // Another protein main
      fixtures.vegSideExplicit,
      fixtures.vegSideNoProtein, // Another veg side
    ];
    
    const config = {
      daysPerWeek: 1,
      dishesPerDay: 2,
      slotRoles: ['protein_main', 'veg_side'],
      isWeekend: () => false,
      lockedSlots: {},
      lockedRecipes: {},
    };
    
    const plan = planWeekAdvanced(recipes, config);
    const dayRecipes = plan['mon'];
    
    const ids = dayRecipes.map(r => r.id);
    const uniqueIds = new Set(ids);
    
    expect(uniqueIds.size).toBe(ids.length);
  });

  // Test F: 1-dish complete meal
  it('should handle single dish complete meal mode', () => {
    const recipes = [
      fixtures.completeMeal,
      fixtures.proteinMainExplicit,
    ];
    
    const config = {
      daysPerWeek: 1,
      dishesPerDay: 1,
      slotRoles: ['complete_meal'],
      isWeekend: () => false,
      lockedSlots: {},
      lockedRecipes: {},
    };
    
    const plan = planWeekAdvanced(recipes, config);
    const dayRecipes = plan['mon'];
    
    expect(dayRecipes).toHaveLength(1);
    // Should prefer complete_meal for complete_meal slot
    expect(dayRecipes[0].meal_role).toBe('complete_meal');
  });
});