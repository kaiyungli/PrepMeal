# Generate Page Refactor Plan

## Overview
- **Current file:** `src/pages/generate.js` (549 lines)
- **Problems:** 
  - Single file with 10+ responsibilities
  - Mixed UI + state + fetch + business logic
  - Difficult to test
  - Hard to maintain

---

## Boundary Rules for Implementation

| Layer | Responsibility | Examples |
|-------|---------------|----------|
| **page** | Composition only | Render UI, pass props |
| **controller hook** | Orchestration + UI state | Modal state, loading, user feedback |
| **services** | API / IO | Fetch recipes, save plan, shopping list |
| **engine** | Pure planning logic | mealPlanner, recipe selection |
| **mappers** | Payload transformation | Plan → API body |

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
| State | Purpose | Owner |
|-------|---------|-------|
| `daysPerWeek` | Days to generate | useGeneratePreferences |
| `dishesPerDay` | Dishes per day (legacy) | useGeneratePreferences |
| `dailyComposition` | Meat/veg mode | useGeneratePreferences |
| `allowCompleteMeal` | Complete meal checkbox | useGeneratePreferences |
| `servings` | Servings per meal | useGeneratePreferences |
| `dietMode` | Diet filter | useGeneratePreferences |
| `budget` | Budget constraint | useGeneratePreferences |
| `ingredientReuse` | Reuse constraint | useGeneratePreferences |
| `exclusions` | Excluded proteins | useGeneratePreferences |
| `cuisines` | Cuisine filters | useGeneratePreferences |
| `cookingConstraints` | Method/time filters | useGeneratePreferences |
| `filters` | Unified filter object | useGeneratePreferences |
| `allRecipes` | Raw recipe list from API | controller |
| `selectedRecipe` | Recipe for detail modal | controller |
| `modalLoading` | Modal fetch loading | controller |
| `pantryIngredients` | From URL query | controller |
| `hasGenerated` | Plan generated flag | controller |
| `weeklyPlan` | Current plan {day: [recipes]} | controller |
| `lockedSlots` | Locked slot tracking | controller |
| `shoppingList` | Aggregated list | controller |
| `showShoppingList` | Modal visibility | controller |
| `shoppingListLoaded` | List loaded flag | controller |
| `saveNotice` | Save feedback | controller |
| `isSaving` | Save in progress | controller |
| `recipeCache` | Detail cache | controller |

### C. Data Fetching (Services - IO Boundaries)
| Fetch | Purpose | Lines | Target |
|-------|---------|-------|--------|
| `/api/recipes?limit=200&view=generate` | Load base recipes | ~105-115 | `services/fetchAvailableRecipes.ts` |
| `/api/shopping-list` | Shopping list aggregation | ~185-255 | `services/fetchGeneratedPlanShoppingList.ts` |
| `/api/user/menus` | Save plan | ~445-475 | `services/saveGeneratedPlan.ts` |
| `/api/recipes/{id}` | Recipe detail | ~515-520 | Use existing hook |

### D. Business Logic (Engine - Pure Planning)
| Function | Purpose | Lines | Target |
|----------|---------|-------|--------|
| `planWeekAdvanced()` | Core meal planner | ~265-275 | `engine/mealPlanner.ts` |
| Scoring logic | Diversity in replaceRecipe | ~295-320 | `engine/recipeScorer.ts` |
| `replaceRecipe()` | Replace single recipe | ~282-340 | `engine/recipeReplacer.ts` |
| `recipeMatchesFilters()` | Filter matching | ~130-145 | Keep in useGeneratePageController |

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
GeneratePage (Composition)
└── useGeneratePageController (Orchestration)
    ├── Settings State (useGeneratePreferences)
    ├── Auth State (useAuth)
    ├── Recipe State
    │   ├── allRecipes (raw)
    │   └── filteredRecipes (derived)
    ├── Plan State
    │   ├── weeklyPlan
    │   ├── lockedSlots
    │   └── hasGenerated
    ├── Modal State
    │   ├── selectedRecipe
    │   ├── modalLoading
    │   ├── showShoppingList
    │   └── shoppingList + shoppingListLoaded
    └── UI State
        ├── saveNotice
        └── isSaving
```

---

## Data Flow

```
User Action: "Generate"
    ↓
handleGenerate()
    ↓
planWeekAdvanced(filteredRecipes, config)  [ENGINE]
    ↓
setWeeklyPlan(newPlan)
    ↓
User clicks Shopping List
    ↓
showShoppingList changes → useEffect
    ↓
fetchGeneratedPlanShoppingList(weeklyPlan)  [SERVICE]
    ↓
setShoppingList()
    ↓
User clicks Save
    ↓
getAccessToken() → saveGeneratedPlan(data)  [SERVICE]
```

---

## Extraction Plan

### Table: Current → Target Mapping

| Responsibility | Current Location | Target Location | Layer |
|----------------|-----------------|------------------|-------|
| Recipe fetch | generate.js (line 105) | `generate/services/fetchAvailableRecipes.ts` | SERVICE |
| Save plan | generate.js (line 433) | `generate/services/saveGeneratedPlan.ts` | SERVICE |
| Shopping list preload | generate.js (line 185) | `generate/services/fetchGeneratedPlanShoppingList.ts` | SERVICE |
| Plan generation | generate.js (line 265) | `generate/engine/mealPlanner.ts` | ENGINE |
| Replace recipe scoring | generate.js (line 282) | `generate/engine/recipeReplacer.ts` | ENGINE |
| Recipe cache | generate.js (line 94) | useGeneratePageController | CONTROLLER |
| Settings state | useGeneratePreferences | Keep | HOOK |
| Weekly plan state | generate.js (line 85) | useGeneratePageController | CONTROLLER |
| Modal state | generate.js (line 77) | useGeneratePageController | CONTROLLER |
| UI Rendering | generate.js (line 380) | Keep - page composition | PAGE |

---

## Proposed File Structure

```
src/features/generate/
  index.ts                 # Public exports
  
  # API / IO Boundary
  services/
    fetchAvailableRecipes.ts         # GET /api/recipes
    saveGeneratedPlan.ts             # POST /api/user/menus
    fetchGeneratedPlanShoppingList.ts # POST /api/shopping-list
    
  # Pure Planning Logic
  engine/
    mealPlanner.ts         # planWeekAdvanced wrapper
    recipeScorer.ts        # Diversity scoring
    recipeReplacer.ts      # Replace single recipe
    
  # Orchestration
  hooks/
    useGeneratePageController.ts  # Main orchestrator hook
    useFilteredRecipes.ts           # Only if reusable
    
  mappers/
    normalizePlanForSave.ts         # Transform plan → API payload
    
components/
  generate/
    (existing components - keep)
```

---

## Proposed Usage After Refactor

```typescript
// src/pages/generate.js
import { useGeneratePageController } from '@/features/generate';
import { useGeneratePreferences } from '@/hooks/useGeneratePreferences';

export default function GeneratePage() {
  // Settings from existing hook (unchanged)
  const preferences = useGeneratePreferences();
  
  // Orchestration from new controller
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
    
    // Modals (controller-owned)
    selectedRecipe,
    showShoppingList,
  } = useGeneratePageController(preferences);
  
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

## Extraction Priority

### Phase 1: IO Boundaries (Services)
1. `services/fetchAvailableRecipes.ts` - Recipe fetch
2. `services/saveGeneratedPlan.ts` - Save plan
3. `services/fetchGeneratedPlanShoppingList.ts` - Shopping list

### Phase 2: Engine Extraction
4. `engine/mealPlanner.ts` - Plan generation
5. `engine/recipeReplacer.ts` - Replace logic

### Phase 3: Controller Hook
6. `useGeneratePageController.ts` - Orchestration

### Phase 4: Optional Finer Hooks
7. `useFilteredRecipes.ts` - Only if truly reusable independently

---

## Success Criteria

- [ ] generate.js reduced to < 150 lines (composition only)
- [ ] Each service has single API responsibility
- [ ] Engine functions are pure (no side effects)
- [ ] Controller handles all UI state
- [ ] Business logic testable in isolation
- [ ] No duplicate fetch logic
- [ ] All existing behavior preserved
