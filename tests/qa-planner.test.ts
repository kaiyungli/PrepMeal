import { describe, it, expect } from 'vitest';
import { planWeekAdvanced } from '@/lib/mealPlanner';

const mockRecipes = [
  // Complete meals
  { id: '1', name: '海南雞飯', primary_protein: '雞', protein: ['雞'], dish_type: 'main', meal_role: 'complete_meal', is_complete_meal: true, method: '蒸', cuisine: '中式' },
  { id: '2', name: '叉燒飯', primary_protein: '豬', protein: ['豬'], dish_type: 'main', meal_role: 'complete_meal', is_complete_meal: true, method: '燒', cuisine: '中式' },
  { id: '3', name: '咖喱牛腩飯', primary_protein: '牛', protein: ['牛'], dish_type: 'main', meal_role: 'complete_meal', is_complete_meal: true, method: '燉', cuisine: '中式' },
  
  // Protein main (non-complete)
  { id: '4', name: '煎雞扒', primary_protein: '雞', protein: ['雞'], dish_type: 'main', meal_role: 'protein_main', is_complete_meal: false, method: '煎', cuisine: '中式' },
  { id: '5', name: '糖醋排骨', primary_protein: '豬', protein: ['豬'], dish_type: 'main', meal_role: 'protein_main', is_complete_meal: false, method: '炒', cuisine: '中式' },
  { id: '6', name: '牛排', primary_protein: '牛', protein: ['牛'], dish_type: 'main', meal_role: 'protein_main', is_complete_meal: false, method: '煎', cuisine: '西式' },
  { id: '7', name: '魚香肉絲', primary_protein: '豬', protein: ['豬'], dish_type: 'main', meal_role: 'protein_main', is_complete_meal: false, method: '炒', cuisine: '中式' },
  { id: '8', name: '清蒸魚', primary_protein: '魚', protein: ['魚'], dish_type: 'main', meal_role: 'protein_main', is_complete_meal: false, method: '蒸', cuisine: '中式' },
  { id: '9', name: '番茄煮魚', primary_protein: '魚', protein: ['魚'], dish_type: 'main', meal_role: 'protein_main', is_complete_meal: false, method: '煮', cuisine: '中式' },
  
  // Veg sides
  { id: '10', name: '炒青菜', primary_protein: null, protein: [], dish_type: 'side', meal_role: 'veg_side', is_complete_meal: false, method: '炒', cuisine: '中式' },
  { id: '11', name: '涼拌黃瓜', primary_protein: null, protein: [], dish_type: 'side', meal_role: 'veg_side', is_complete_meal: false, method: '拌', cuisine: '中式' },
  { id: '12', name: '番茄炒蛋', primary_protein: null, protein: [], dish_type: 'side', meal_role: 'veg_side', is_complete_meal: false, method: '炒', cuisine: '中式' },
  
  // More proteins
  { id: '13', name: '蝦仁炒飯', primary_protein: '蝦', protein: ['蝦'], dish_type: 'main', meal_role: 'protein_main', is_complete_meal: false, method: '炒', cuisine: '中式' },
  { id: '14', name: '東坡肉', primary_protein: '豬', protein: ['豬'], dish_type: 'main', meal_role: 'protein_main', is_complete_meal: false, method: '燉', cuisine: '中式' },
];

const config = { isWeekend: () => false, lockedSlots: {}, lockedRecipes: {} };

describe('Planner QA - Real Output Testing', () => {
  it('meat_veg mode - check composition', () => {
    console.log('\n=== MEAT_VEG MODE ===\n');
    for (let p = 0; p < 3; p++) {
      const plan = planWeekAdvanced(mockRecipes, { 
        ...config, 
        daysPerWeek: 7, dishesPerDay: 2, 
        slotRoles: ['protein_main', 'veg_side'], 
        dailyComposition: 'meat_veg' 
      });
      console.log(`--- Plan ${p+1} ---`);
      Object.entries(plan).slice(0,5).forEach(([day, dishes]) => {
        const proteins = dishes.map(d => d.primary_protein || 'veg');
        const isComplete = dishes.some(d => d.is_complete_meal);
        console.log(`${day}: ${dishes.map(d => d.name).join(' + ')} [${proteins.join(',')}] ${isComplete ? '(complete)' : ''}`);
      });
    }
  });

  it('two_meat_one_veg mode - check composition', () => {
    console.log('\n=== TWO_MEAT_ONE_VEG MODE ===\n');
    for (let p = 0; p < 3; p++) {
      const plan = planWeekAdvanced(mockRecipes, { 
        ...config, 
        daysPerWeek: 7, dishesPerDay: 3, 
        slotRoles: ['protein_main', 'protein_main', 'veg_side'], 
        dailyComposition: 'two_meat_one_veg' 
      });
      console.log(`--- Plan ${p+1} ---`);
      Object.entries(plan).slice(0,5).forEach(([day, dishes]) => {
        const proteins = dishes.map(d => d.primary_protein || 'veg');
        const isComplete = dishes.some(d => d.is_complete_meal);
        console.log(`${day}: ${dishes.map(d => d.name).join(' + ')} [${proteins.join(',')}] ${isComplete ? '(complete)' : ''}`);
      });
    }
  });

  it('complete_meal mode - check composition', () => {
    console.log('\n=== COMPLETE_MEAL MODE ===\n');
    for (let p = 0; p < 3; p++) {
      const plan = planWeekAdvanced(mockRecipes, { 
        ...config, 
        daysPerWeek: 7, dishesPerDay: 1, 
        slotRoles: ['complete_meal'], 
        dailyComposition: 'complete_meal' 
      });
      console.log(`--- Plan ${p+1} ---`);
      Object.entries(plan).slice(0,5).forEach(([day, dishes]) => {
        const proteins = dishes.map(d => d.primary_protein || 'none');
        console.log(`${day}: ${dishes.map(d => d.name).join(' + ')} [${proteins.join(',')}]`);
      });
    }
  });
});

describe('allowCompleteMeal checkbox behavior', () => {
  const testConfig = { isWeekend: () => false, lockedSlots: {}, lockedRecipes: {} };
  
  it('meat_veg + allowCompleteMeal=true allows complete_meal occasionally', () => {
    // Run multiple times and check that complete_meal can appear
    let hasCompleteMeal = false;
    for (let i = 0; i < 10; i++) {
      const plan = planWeekAdvanced(mockRecipes, {
        ...testConfig,
        daysPerWeek: 7,
        dishesPerDay: 2,
        slotRoles: ['protein_main', 'veg_side'],
        dailyComposition: 'meat_veg',
        allowCompleteMeal: true
      });
      Object.values(plan).forEach(dishes => {
        if (dishes.some(d => d.is_complete_meal || d.meal_role === 'complete_meal')) {
          hasCompleteMeal = true;
        }
      });
    }
    // With allowCompleteMeal=true, complete_meal should be allowed (may or may not appear due to randomness)
    expect(hasCompleteMeal).toBe(true);
  });

  it('meat_veg + allowCompleteMeal=false excludes complete_meal', () => {
    for (let i = 0; i < 10; i++) {
      const plan = planWeekAdvanced(mockRecipes, {
        ...testConfig,
        daysPerWeek: 7,
        dishesPerDay: 2,
        slotRoles: ['protein_main', 'veg_side'],
        dailyComposition: 'meat_veg',
        allowCompleteMeal: false
      });
      Object.values(plan).forEach(dishes => {
        dishes.forEach(d => {
          expect(d.is_complete_meal || d.meal_role === 'complete_meal').toBe(false);
        });
      });
    }
  });

  it('two_meat_one_veg + allowCompleteMeal=false excludes complete_meal', () => {
    for (let i = 0; i < 10; i++) {
      const plan = planWeekAdvanced(mockRecipes, {
        ...testConfig,
        daysPerWeek: 7,
        dishesPerDay: 3,
        slotRoles: ['protein_main', 'protein_main', 'veg_side'],
        dailyComposition: 'two_meat_one_veg',
        allowCompleteMeal: false
      });
      Object.values(plan).forEach(dishes => {
        dishes.forEach(d => {
          expect(d.is_complete_meal || d.meal_role === 'complete_meal').toBe(false);
        });
      });
    }
  });

  it('complete_meal mode works with allowCompleteMeal setting', () => {
    // In complete_meal mode, should still generate plans (allowCompleteMeal doesn't crash)
    const plan = planWeekAdvanced(mockRecipes, {
      ...testConfig,
      daysPerWeek: 7,
      dishesPerDay: 1,
      slotRoles: ['complete_meal'],
      dailyComposition: 'complete_meal',
      allowCompleteMeal: false
    });
    // Should have 7 days of plans
    expect(Object.keys(plan).length).toBe(7);
  });
});