// @ts-nocheck
import { PLANNER_CONFIG, SCORING_BONUS, SCORING_PENALTY } from './plannerConfig';

// ============================================
// MEAL PLANNER ENGINE
// Pure functions for meal plan generation
// ============================================

// Days of the week
export const DAYS = [
  { key: 'monday', label: '星期一', isWeekend: false },
  { key: 'tuesday', label: '星期二', isWeekend: false },
  { key: 'wednesday', label: '星期三', isWeekend: false },
  { key: 'thursday', label: '星期四', isWeekend: false },
  { key: 'friday', label: '星期五', isWeekend: false },
  { key: 'saturday', label: '星期六', isWeekend: true },
  { key: 'sunday', label: '星期日', isWeekend: true },
];

// Generate dates for current week
export function getWeekDates() {
  const today = new Date();
  const monday = new Date(today);
  monday.setDate(today.getDate() - (today.getDay() - 1));
  
  return DAYS.map((day, i) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    const month = date.getMonth() + 1;
    const dayNum = date.getDate();
    return { ...day, date: `${month}月${dayNum}日` };
  });
}

// Categorize recipe by meal role
export function categorizeRecipe(r: any) {
  const role = r.meal_role || r.dish_type;
  if (role === 'main' || role === 'complete_meal' || role === 'complete') return 'complete';
  if (role === 'side' || role === 'veg_side') return 'side';
  if (role === 'soup') return 'soup';
  if (role === 'staple') return 'staple';
  return 'other';
}

// Main planner function
export function generateMealPlan({
  recipes,
  daysPerWeek,
  dishesPerDay,
  cuisines = [],
  budget = 'any',
  exclusions = [],
  dietMode = 'general',
  cookingConstraints = [],
  lockedSlots = {},
  previousPlan = {},
}: {
  recipes: any[];
  daysPerWeek: number;
  dishesPerDay: number;
  cuisines?: string[];
  budget?: string;
  exclusions?: string[];
  dietMode?: string;
  cookingConstraints?: string[];
  lockedSlots?: Record<string, boolean>;
  previousPlan?: Record<string, any[]>;
}) {
  const newPlan = {};
  const daysToGenerate = DAYS.slice(0, daysPerWeek);
  const usedRecipeIds = new Set<string>();
  const recentProteins: string[] = [];
  const recentMethods: string[] = [];
  
  // Build categorized recipe pool
  const categorized = {
    complete: recipes.filter(r => categorizeRecipe(r) === 'complete'),
    side: recipes.filter(r => categorizeRecipe(r) === 'side'),
    soup: recipes.filter(r => categorizeRecipe(r) === 'soup'),
    staple: recipes.filter(r => categorizeRecipe(r) === 'staple'),
    other: recipes.filter(r => categorizeRecipe(r) === 'other'),
  };
  
  // Filter by cuisine
  const filterByCuisine = (list: any[]) => {
    if (!cuisines || cuisines.length === 0) return list;
    return list.filter(r => cuisines.includes(r.cuisine));
  };
  
  // Check budget match
  const matchesBudget = (recipe: any) => {
    if (!budget || budget === 'any') return true;
    const recipeBudget = recipe.budget_level || 'medium';
    if (budget === 'low') return recipeBudget === 'low';
    if (budget === 'medium') return recipeBudget === 'low' || recipeBudget === 'medium';
    return true;
  };
  
  // Check excluded proteins
  const hasExcludedProtein = (recipe: any) => {
    const protein = recipe.primary_protein || recipe.protein || [];
    return exclusions.some(ex => protein.includes(ex));
  };
  
  // Check dietary match
  const matchesDiet = (recipe: any) => {
    if (dietMode === 'general') return true;
    const diet = recipe.diet || [];
    if (dietMode === 'vegetarian') return diet.includes('vegetarian') || diet.includes('tofu');
    if (dietMode === 'egg_lacto') return diet.includes('vegetarian') || diet.includes('egg') || diet.includes('dairy');
    if (dietMode === 'high_protein') return diet.includes('high_protein') || diet.includes('protein');
    if (dietMode === 'low_fat') return diet.includes('low_fat') || diet.includes('light');
    return true;
  };
  
  // Check cooking constraints
  const matchesConstraint = (recipe: any) => {
    if (cookingConstraints.includes('Under 15 min') && recipe.cook_time > 15) return false;
    if (cookingConstraints.includes('Under 30 min') && recipe.cook_time > 30) return false;
    if (cookingConstraints.includes('Under 45 min') && recipe.cook_time > 45) return false;
    if (cookingConstraints.includes('Easy') && recipe.difficulty !== 'easy') return false;
    if (cookingConstraints.includes('Medium') && recipe.difficulty === 'hard') return false;
    if (cookingConstraints.includes('One-pot') && recipe.method !== 'one_pot') return false;
    if (cookingConstraints.includes('Air fryer') && recipe.method !== 'air_fryer') return false;
    return true;
  };
  
  // Check speed/difficulty for weekday
  const matchesSpeedDifficulty = (recipe: any, isWeekend: boolean) => {
    const speed = recipe.speed || 'normal';
    const difficulty = recipe.difficulty || 'medium';
    if (!isWeekend) {
      // Penalize slow/hard on weekdays
    }
    return true;
  };
  
  // Filter candidates
  const filterCandidates = (candidates: any[], isWeekend = false) => {
    return filterByCuisine(candidates).filter(r => {
      // Repetition check
      if (!PLANNER_CONFIG.RECIPE_REPEAT_ALLOWED && usedRecipeIds.has(r.id)) {
        const totalAvailable = recipes.length;
        const canAvoidRepetition = totalAvailable >= PLANNER_CONFIG.MIN_RECIPES_FOR_NO_REPEAT;
        
        if (canAvoidRepetition) return false;
        
        const assignedCount = Object.values(previousPlan).flat().length;
        if (assignedCount < PLANNER_CONFIG.DAYS_BEFORE_REPETITION) return false;
      }
      
      return !hasExcludedProtein(r) &&
        matchesDiet(r) &&
        matchesConstraint(r) &&
        matchesBudget(r) &&
        matchesSpeedDifficulty(r, isWeekend);
    });
  };
  
  // Score candidates
  const scoreCandidates = (candidates: any[], isWeekend = false) => {
    if (candidates.length === 0) return candidates;
    
    const scored = candidates.map((r: any) => {
      let score = 0;
      const breakdown: Record<string, string> = {};
      
      const protein = r.primary_protein || r.protein?.[0];
      if (protein && recentProteins.length > 0) {
        if (!recentProteins.slice(-PLANNER_CONFIG.PROTEIN_LOOKBACK_DAYS).includes(protein)) {
          score += SCORING_BONUS.PROTEIN_DIVERSITY;
          breakdown.protein_diversity = `+${SCORING_BONUS.PROTEIN_DIVERSITY}`;
        } else {
          score += SCORING_PENALTY.PROTEIN_SAME;
          breakdown.protein_same = `${SCORING_PENALTY.PROTEIN_SAME}`;
        }
      }
      
      const method = r.method;
      if (method && recentMethods.length > 0) {
        if (!recentMethods.slice(-PLANNER_CONFIG.METHOD_LOOKBACK_DAYS).includes(method)) {
          score += SCORING_BONUS.METHOD_VARIETY;
          breakdown.method_variety = `+${SCORING_BONUS.METHOD_VARIETY}`;
        } else {
          score += SCORING_PENALTY.METHOD_SAME;
          breakdown.method_same = `${SCORING_PENALTY.METHOD_SAME}`;
        }
      }
      
      const speed = r.speed || 'normal';
      if (!isWeekend) {
        if (speed === 'quick') {
          score += SCORING_BONUS.SPEED_QUICK;
          breakdown.speed_quick = `+${SCORING_BONUS.SPEED_QUICK}`;
        } else if (speed === 'normal') {
          score += SCORING_BONUS.SPEED_NORMAL;
          breakdown.speed_normal = `+${SCORING_BONUS.SPEED_NORMAL}`;
        } else if (speed === 'slow') {
          score += SCORING_PENALTY.SPEED_SLOW;
          breakdown.speed_slow = `${SCORING_PENALTY.SPEED_SLOW}`;
        }
      }
      
      const difficulty = r.difficulty || 'medium';
      if (!isWeekend) {
        if (difficulty === 'easy') {
          score += SCORING_BONUS.DIFFICULTY_EASY;
          breakdown.difficulty_easy = `+${SCORING_BONUS.DIFFICULTY_EASY}`;
        } else if (difficulty === 'hard') {
          score += SCORING_PENALTY.DIFFICULTY_HARD;
          breakdown.difficulty_hard = `${SCORING_PENALTY.DIFFICULTY_HARD}`;
        }
      }
      
      if (budget && budget !== 'any') {
        const recipeBudget = r.budget_level || 'medium';
        if (budget === 'low' && recipeBudget === 'low') {
          score += SCORING_BONUS.BUDGET_LOW_MATCH;
          breakdown.budget_match = `+${SCORING_BONUS.BUDGET_LOW_MATCH}`;
        }
        if (budget === 'medium' && (recipeBudget === 'low' || recipeBudget === 'medium')) {
          score += SCORING_BONUS.BUDGET_MEDIUM_MATCH;
          breakdown.budget_ok = `+${SCORING_BONUS.BUDGET_MEDIUM_MATCH}`;
        }
        if (budget === 'low' && recipeBudget !== 'low') {
          score += SCORING_PENALTY.BUDGET_EXPENSIVE;
          breakdown.budget_expensive = `${SCORING_PENALTY.BUDGET_EXPENSIVE}`;
        }
      }
      
      if (PLANNER_CONFIG.DEBUG_MODE) {
        console.log(`[SCORING] ${r.name}: score=${score}`, breakdown);
      }
      
      return { recipe: r, score, breakdown };
    });
    
    scored.sort((a, b) => b.score - a.score);
    
    // Shuffle top candidates
    const topScore = scored[0]?.score || 0;
    const topCandidates = scored.filter(s => s.score === topScore);
    for (let i = topCandidates.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [topCandidates[i], topCandidates[j]] = [topCandidates[j], topCandidates[i]];
    }
    
    const rest = scored.filter(s => s.score < topScore);
    return [...topCandidates, ...rest].map(s => s.recipe);
  };
  
  // Get candidates with fallbacks
  const getCandidatesWithFallback = (primary: any[], fallbacks: any[], isWeekend = false) => {
    let candidates = filterCandidates(primary, isWeekend);
    
    for (const fallback of fallbacks) {
      if (candidates.length >= 2) break;
      candidates = [...candidates, ...filterCandidates(fallback, isWeekend)];
    }
    
    if (candidates.length < 2) {
      candidates = [...candidates, ...filterCandidates(recipes, isWeekend)];
    }
    
    return candidates;
  };
  
  // Generate plan
  daysToGenerate.forEach(day => {
    const dayRecipes = [];
    const isWeekend = day.isWeekend || false;
    
    for (let dish = 0; dish < dishesPerDay; dish++) {
      const slotKey = `${day.key}-${dish}`;
      if (lockedSlots[slotKey]) continue;
      
      let candidates = [];
      
      // Role-based selection
      if (dishesPerDay === 1) {
        candidates = getCandidatesWithFallback(categorized.complete, [categorized.other], isWeekend);
      } else if (dishesPerDay === 2) {
        if (dish === 0) {
          candidates = getCandidatesWithFallback(categorized.complete, [categorized.other], isWeekend);
        } else {
          candidates = getCandidatesWithFallback(
            [...categorized.side],
            [...categorized.soup, ...categorized.staple, ...categorized.other],
            isWeekend
          );
        }
      } else {
        if (dish === 0) {
          candidates = getCandidatesWithFallback(categorized.complete, [categorized.other], isWeekend);
        } else if (dish === 1) {
          candidates = getCandidatesWithFallback(
            [...categorized.side, ...categorized.soup],
            [...categorized.staple, ...categorized.other],
            isWeekend
          );
        } else {
          candidates = getCandidatesWithFallback(recipes, [], isWeekend);
        }
      }
      
      candidates = scoreCandidates(candidates, isWeekend);
      
      if (candidates.length > 0) {
        const recipe = candidates[0];
        dayRecipes.push(recipe);
        usedRecipeIds.add(recipe.id);
        
        const protein = recipe.primary_protein || recipe.protein?.[0];
        if (protein) recentProteins.push(protein);
        
        const method = recipe.method;
        if (method) recentMethods.push(method);
      }
    }
    
    newPlan[day.key] = dayRecipes;
  });
  
  return newPlan;
}
