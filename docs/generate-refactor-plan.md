# Generate Page Refactor Plan

## Overview
- **Current file:** `src/pages/generate.js` (549 lines)
- **Problems:** 
  - Single file with 10+ responsibilities
  - Mixed UI + state + fetch + business logic
  - Difficult to test
  - Hard to maintain

---

## Current Responsibilities

### A. UI Rendering (Lines ~380-549)
| Responsibility | Description |
|----------------|-------------|
| Page layout | Full page with Header, Hero, Footer |
| Settings Panel | `<GenerateSettings />` |
| Action Bar | `<GenerateActions />` with buttons |
| Weekly Plan Grid | `<GenerateResults />` |
| Shopping List Modal | `<ShoppingListModal />` |
| Recipe Detail Modal | `<RecipeDetailModal />` |
| Save notice toast | Inline notification |

### B. State Management (useState)
| State | Purpose | Lines |
|-------|---------|-------|
| `daysPerWeek` | Days to generate | ~43 |
| `dishesPerDay` | Dishes per day (legacy) | ~44 |
| `dailyComposition` | Meat/veg mode | ~45 |
| `allowCompleteMeal` | Complete meal checkbox | ~45 |
| `servings` | Servings per meal | ~46 |
| `dietMode` | Diet filter | ~47 |
| `budget` | Budget constraint | ~48 |
| `ingredientReuse` | Reuse constraint | ~49 |
| `exclusions` | Excluded proteins | ~50 |
| `cuisines` | Cuisine filters | ~51 |
| `cookingConstraints` | Method/time filters | ~52 |
| `filters` | Unified filter object | ~57 |
| `allRecipes` | Raw recipe list from API | ~75 |
| `selectedRecipe` | Recipe for detail modal | ~77 |
| `modalLoading` | Modal fetch loading | ~78 |
| `pantryIngredients` | From URL query | ~80 |
| `hasGenerated` | Plan generated flag | ~81 |
| `weeklyPlan` | Current plan {day: [recipes]} | ~85 |
| `lockedSlots` | Locked slot tracking | ~86 |
| `shoppingList` | Aggregated list | ~89 |
| `showShoppingList` | Modal visibility | ~90 |
| `shoppingListLoaded` | List loaded flag | ~91 |
| `saveNotice` | Save feedback | ~41 |
| `isSaving` | Save in progress | ~40 |

### C. Data Fetching
| Fetch | Purpose | Lines |
|-------|---------|-------|
| `/api/recipes?limit=200&view=generate` | Load base recipes | ~105-115 |
| `/api/shopping-list` (preloadShoppingList) | Shopping list aggregation | ~185-255 |
| `/api/user/menus` (save) | Save plan to user account | ~445-475 |
| `/api/recipes/{id}` (detail) | Recipe detail for modal | ~515-520 |

### D. Business Logic
| Function | Purpose | Lines |
|----------|---------|-------|
| `planWeekAdvanced()` | Core meal planner algorithm | ~265-275 |
| `preloadShoppingList()` | Aggregate shopping list | ~185-255 |
| `handleGenerate()` | Trigger plan generation | ~257-280 |
| `replaceRecipe()` | Replace single recipe with scoring | ~282-340 |
| `recipeMatchesFilters()` | Filter matching | ~130-145 |
| Scoring logic | Diversity penalties in replaceRecipe | ~295-320 |

### E. User Actions
| Action | Handler | Lines |
|--------|---------|-------|
| Generate new plan | `handleGenerate()` | ~257 |
| Replace recipe | `replaceRecipe()` | ~282 |
| Save plan | inline in GenerateActions | ~433 |
| Clear all | `clearAll()` | ~344-360 |
| Lock/Unlock slot | `lockSlot/unlockSlot` (from hook) | N/A |
| Remove recipe | `removeRecipe` (from hook) | N/A |
| Open shopping list | `generateShoppingList()` | ~342 |
| View recipe detail | inline in GenerateResults | ~513 |

### F. Side Effects (useEffect)
| Effect | Trigger | Lines |
|--------|---------|-------|
| Fetch base recipes | Mount (empty deps) | ~105-115 |
| Filter recipes | [allRecipes, filters, exclusions] | ~120-145 |
| Read URL pantry | router.query.ingredients | ~150-155 |
| Load hero plan from session | Mount | ~160-185 |
| Preload shopping list | showShoppingList change | ~100-105 |
| Lazy load detail cache | Recipe click | ~513 |

---

## State Map

```
GeneratePage
├── Settings State (useGeneratePreferences hook)
│   ├── daysPerWeek, dishesPerDay, dailyComposition
│   ├── allowCompleteMeal, servings
│   ├── dietMode, budget
│   ├── exclusions, cuisines, cookingConstraints
│   └── filters (unified filter object)
├── Auth State (useAuth hook)
│   ├── isAuthenticated
│   └── getAccessToken
├── Recipe State
│   ├── allRecipes (raw API data)
│   └── filteredRecipes (useMemo derived)
├── Plan State
│   ├── weeklyPlan (current generated plan)
│   ├── lockedSlots (user locks)
│   └── hasGenerated (flag)
├── Modal State
│   ├── selectedRecipe (detail modal)
│   ├── modalLoading
│   ├── showShoppingList
│   └── shoppingList + shoppingListLoaded
├── UI State
│   ├── saveNotice
│   └── isSaving
└── Refs
    └── recipeCache (Map for detail caching)
```

---

## Data Flow

```
User Action: "Generate"
    ↓
handleGenerate()
    ↓
planWeekAdvanced(filteredRecipes, config)
    ↓
setWeeklyPlan(newPlan)
    ↓
User clicks Shopping List
    ↓
showShoppingList changes → useEffect
    ↓
preloadShoppingList(weeklyPlan)
    ↓
fetch('/api/shopping-list')
    ↓
setShoppingList()
    ↓
User clicks Save
    ↓
getAccessToken() → POST /api/user/menus
```

---

## Extraction Plan

### Table: Current → Target Mapping

| Responsibility | Current Location | Target Location | Priority |
|----------------|-----------------|-----------------|----------|
| Recipe fetch | generate.js (line 105) | `generate/services/fetchAvailableRecipes.ts` | HIGH |
| Filter recipes | generate.js (line 120) | `generate/hooks/useFilteredRecipes.ts` | HIGH |
| Plan generation | generate.js (line 265) | `generate/services/mealPlanGenerator.ts` | HIGH |
| Replace recipe | generate.js (line 282) | `generate/services/recipeReplacer.ts` | MEDIUM |
| Shopping list preload | generate.js (line 185) | `generate/services/shoppingListLoader.ts` | MEDIUM |
| Save plan | generate.js (line 433) | `generate/services/savePlan.ts` | MEDIUM |
| Settings state | useGeneratePreferences (existing) | Keep | KEEP |
| Auth state | useAuth (existing) | Keep | KEEP |
| Weekly plan state | generate.js (line 85) | `generate/hooks/useWeeklyPlanState.ts` | HIGH |
| Modal state | generate.js (line 77) | Keep in page (orchestration) | LOW |
| Recipe cache | generate.js (line 94) | Keep in page | LOW |
| UI Rendering | generate.js (line 380) | Keep - page composition | KEEP |

---

## Proposed File Structure

```
src/features/generate/
  index.ts                    # Public exports
  
  services/
    fetchAvailableRecipes.ts # /api/recipes call
    mealPlanGenerator.ts      # planWeekAdvanced wrapper
    recipeReplacer.ts         # Replace single recipe logic
    shoppingListLoader.ts      # /api/shopping-list call
    savePlan.ts               # Save to user account
    
  hooks/
    useFilteredRecipes.ts     # Recipes + filters → filtered
    useWeeklyPlanState.ts     # Weekly plan state management
    useGeneratePageController.ts # Main orchestrator (optional)
    
  mappers/
    normalizePlanForSave.ts   # Transform plan → API payload
    
components/
  generate/
    (existing components - keep)
```

---

## Proposed Usage After Refactor

```typescript
// src/pages/generate.js
import { useGeneratePageController } from '@/features/generate';

export default function GeneratePage() {
  const {
    // State
    weeklyPlan,
    allRecipes,
    filteredRecipes,
    loading,
    
    // Actions
    handleGenerate,
    handleSave,
    handleReplace,
    
    // Modals
    selectedRecipe,
    showShoppingList,
  } = useGeneratePageController();
  
  return (
    // UI only - composition
  );
}
```

---

## Risk Notes

### HIGH RISK - Do Carefully
1. **planWeekAdvanced** - Complex algorithm, any change breaks generation
2. **Save flow** - Requires auth token handling, affects user data
3. **Filter logic** - recipeMatchesFilters is critical for correct filtering

### MEDIUM RISK - Test Well
4. **Replace recipe scoring** - Diversity logic is subtle
5. **Shopping list aggregation** - Complex response transformation
6. **Session storage hero plan** - Edge case handling

### LOW RISK - Safe to Extract
7. Recipe fetch (just moves API call)
8. Modal state (simple state)

---

## Priority Order for Extraction

1. **Phase 1:** Recipe fetch + filtered recipes (HIGH)
   - Extract `fetchAvailableRecipes.ts`
   - Extract `useFilteredRecipes.ts`
   
2. **Phase 2:** Weekly plan state (HIGH)
   - Extract `useWeeklyPlanState.ts`
   
3. **Phase 3:** Plan generation (HIGH)
   - Extract `mealPlanGenerator.ts`
   
4. **Phase 4:** Save flow (MEDIUM)
   - Extract `savePlan.ts`
   
5. **Phase 5:** Shopping list (MEDIUM)
   - Extract `shoppingListLoader.ts`
   
6. **Phase 6:** Replace logic (MEDIUM)
   - Extract `recipeReplacer.ts`

---

## Success Criteria

- [ ] generate.js reduced to < 150 lines
- [ ] Each service/hook has single responsibility
- [ ] No duplicate fetch logic
- [ ] Business logic testable in isolation
- [ ] UI only in page composition layer
- [ ] All existing behavior preserved
