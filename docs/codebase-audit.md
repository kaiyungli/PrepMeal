# Codebase Audit Inventory

## Overview

| Category | Count | Notes |
|----------|-------|-------|
| Pages | 35 | API + UI pages |
| Components | 49 | UI components |
| Hooks | 8 | React hooks |
| Lib | 20 | Utilities + data access |
| Services | 4 | Business logic |

---

## Pages

### UI Pages (User-facing)

#### src/pages/index.js
- **Responsibility:** Homepage rendering, recipe list display, favorites state, weekly plan generation, shopping list preview
- **Data Fetching:** SSR recipes, client-side favorites, shopping list API
- **Data Transformation:** generateWeeklyPlan, buildShoppingListFromPlan
- **UI Rendering:** HomeHero, HomeFiltersBar, HomeRecipesSection, RecipeGrid
- **Problems:** 
  - Mixes SSR + client state
  - Manages weekly plan state directly
  - Uses 3 different data sources for similar data
- **Target:** Keep only composition, move generation to useWeeklyPlanActions, move preview to hook

#### src/pages/generate.js
- **Responsibility:** Generate page rendering, preference state, recipe filtering, plan generation, shopping list preload, save flow, modal state
- **Data Fetching:** API recipe list, shopping list API
- **Data Transformation:** planWeekAdvanced, build shopping list
- **UI Rendering:** GenerateSettings, GenerateResults, WeeklyPlanGrid, ShoppingListModal
- **Problems:** 
  - TOO MANY RESPONSIBILITIES
  - ~800 lines of mixed logic
  - Handles all modal state internally
  - Direct API calls mixed with UI
- **Target:** Split into: page (composition), useGenerateFlow (hook), generateService (data)

#### src/pages/recipes.js
- **Responsibility:** Recipe list with filters
- **Data Fetching:** API recipes
- **Data Transformation:** Filter application (client-side)
- **UI Rendering:** RecipeFilters, RecipeList
- **Status:** OK - relatively thin

#### src/pages/recipes/[id].js
- **Responsibility:** SSR recipe detail page
- **Data Fetching:** fetchRecipeDetail (SSR)
- **Data Transformation:** safeRecipe normalization
- **UI Rendering:** RecipeDetailContent
- **Status:** OK - thin page

#### src/pages/favorites.js
- **Responsibility:** User favorites list
- **Data Fetching:** API favorites
- **UI Rendering:** RecipeList
- **Status:** OK

#### src/pages/my-plans.js
- **Responsibility:** Saved plans list
- **Data Fetching:** API user menus
- **UI Rendering:** PlanCard list
- **Status:** OK

#### src/pages/my-plans/[id].js
- **Responsibility:** Plan detail, shopping list section, modal state
- **Data Fetching:** API menu items, shopping list API
- **UI Rendering:** PlanDaySection, ShoppingListSection, RecipeDetailModal
- **Problems:** Modal state in page, shopping list fetch logic
- **Target:** Move modal orchestration to hook

#### src/pages/menu.js, profile.js, about.js, login.js
- **Status:** OK - thin pages

---

### API Pages

#### src/pages/api/recipes/index.js
- **Responsibility:** Recipe list endpoint
- **Problems:** Mixed select with view modes, filter logic in API
- **Target:** Keep simple, move filter logic to lib

#### src/pages/api/recipes/[id].js
- **Responsibility:** Single recipe detail
- **Status:** OK - thin wrapper

#### src/pages/api/shopping-list/index.js
- **Responsibility:** Shopping list aggregation
- **Data Fetching:** fetchRecipeIngredients (lib)
- **Transformation:** aggregateIngredients (service)
- **Status:** Good separation

#### src/pages/api/user/menus/index.js
- **Responsibility:** User plan CRUD
- **Problems:** Upsert logic mixed in API
- **Target:** Move to service

---

## Components

### Recipe Components

#### src/components/RecipeCard.tsx
- **Type:** TSX
- **Responsibility:** Single recipe card display
- **Status:** Good - thin, presentational

#### src/components/RecipeList.tsx
- **Type:** TSX
- **Responsibility:** Grid of recipe cards
- **Status:** Good

#### src/components/RecipeDetailContent.tsx
- **Type:** TSX
- **Responsibility:** Recipe detail UI (ingredients, steps, metadata)
- **Status:** Good - shared between modal and page

#### src/components/RecipeDetailModal.tsx
- **Type:** TSX
- **Responsibility:** Modal shell for recipe detail
- **Status:** Good

#### src/components/RecipeModalController.tsx
- **Type:** TSX
- **Responsibility:** Fetch + modal orchestration
- **Status:** OK - but duplicates HomeModalController logic

#### src/components/home/HomeModalController.tsx
- **Type:** TSX
- **Responsibility:** Fetch + modal for homepage
- **Problems:** Duplicates RecipeModalController logic
- **Target:** Extract shared hook

---

### Generate Components

#### src/components/generate/GenerateSettings.tsx
- **Responsibility:** User preferences UI
- **Status:** Good

#### src/components/generate/GenerateResults.tsx
- **Responsibility:** Recipe selection grid
- **Status:** Good

#### src/components/generate/WeeklyPlanGrid.tsx
- **Responsibility:** Weekly plan display
- **Status:** Good

#### src/components/generate/ShoppingListModal.tsx
- **Responsibility:** Shopping list preview modal
- **Status:** Good

---

### Home Components

#### src/components/home/HomeHero.tsx
- **Type:** TSX
- **Responsibility:** Homepage hero with weekly plan preview
- **Status:** Good - uses services

#### src/components/home/HomeRecipeGrid.tsx
- **Type:** TSX
- **Responsibility:** Recipe grid on homepage
- **Status:** Good

#### src/components/home/HomeRecipesSection.tsx
- **Type:** TSX
- **Responsibility:** Section wrapper
- **Status:** Good

---

### Admin Components

#### src/components/admin/RecipeForm.js
- **Type:** JS
- **Responsibility:** Admin recipe form (create/edit)
- **Problems:** ~300 lines, mixed form + validation + API
- **Target:** Split into useRecipeForm hook, form components

#### src/components/admin/RecipeIngredientsEditor.js
- **Type:** JS
- **Responsibility:** Ingredient list editor
- **Status:** OK

#### src/components/admin/RecipeStepsEditor.js
- **Type:** JS
- **Responsibility:** Steps list editor
- **Status:** OK

---

### Shopping Components

#### src/components/shopping/ShoppingListDrawer.js
- **Type:** JS
- **Responsibility:** Shopping list drawer UI
- **Status:** Good

#### src/components/myPlans/ShoppingListSection.js
- **Type:** JS
- **Responsibility:** Shopping list in plan detail
- **Status:** Good

---

### Layout Components

#### src/components/layout/Header.tsx
- **Type:** TSX
- **Responsibility:** Navigation header
- **Status:** Good

#### src/components/layout/Footer.tsx
- **Type:** TSX
- **Responsibility:** Footer
- **Status:** Good

#### src/components/layout/Layout.tsx
- **Type:** TSX
- **Responsibility:** Page wrapper
- **Status:** Good

---

## Hooks

#### src/hooks/useAuth.js
- **Responsibility:** Auth state + token management
- **Status:** Good

#### src/hooks/useFavorites.js
- **Responsibility:** Favorites state + toggle
- **Status:** Good

#### src/hooks/useUserState.js
- **Responsibility:** Combined auth + favorites
- **Status:** Good

#### src/hooks/useGeneratePreferences.js
- **Responsibility:** Generate page preferences state
- **Status:** Good

#### src/hooks/useRecipeFilters.js
- **Responsibility:** Filter state management
- **Status:** Good

#### src/hooks/useShoppingListPreview.ts
- **Responsibility:** Homepage shopping list preview fetch
- **Status:** Good

#### src/hooks/useWeeklyPlanActions.js
- **Responsibility:** Weekly plan generation actions
- **Status:** Good

---

## Lib (Data Access + Utilities)

### Data Access Layer

#### src/lib/fetchRecipeDetail.js
- **Responsibility:** Single recipe fetch (API wrapper)
- **Status:** Good - single source

#### src/lib/recipesServer.ts
- **Responsibility:** SSR recipe fetching
- **Status:** Good

#### src/lib/shoppingListData.js
- **Responsibility:** Shopping list ingredient fetching from DB
- **Status:** Good - only place with DB access for shopping

#### src/lib/supabase.js, supabaseClient.ts, supabaseServer.ts
- **Responsibility:** Supabase client initialization
- **Status:** Good

---

### Transformation Layer

#### src/lib/normalizeRecipeDetail.js
- **Responsibility:** Recipe detail normalization
- **Status:** Good

#### src/lib/mealPlanner.ts
- **Responsibility:** Meal planning algorithm
- **Status:** Good - pure business logic

#### src/lib/plannerConfig.ts
- **Responsibility:** Planner configuration constants
- **Status:** Good

---

### Utilities

#### src/lib/utils.ts
- **Responsibility:** General utilities
- **Status:** Good

#### src/lib/formatters.ts
- **Responsibility:** Date/number formatters
- **Status:** Good

---

## Services (Business Logic)

#### src/services/recipes.ts
- **Responsibility:** Recipe list service
- **Status:** Underutilized - page directly calls API

#### src/services/shoppingList.js
- **Responsibility:** Shopping list aggregation (pure)
- **Status:** Good - no DB access

#### src/services/weeklyPlan.ts
- **Responsibility:** Weekly plan transformation
- **Status:** Good

#### src/services/menuPlans.ts
- **Responsibility:** Menu plan transformation
- **Status:** Good

---

## Top 10 Highest-Risk Files

| Rank | File | Risk | Reason |
|------|------|------|--------|
| 1 | `src/pages/generate.js` | 🔴 Critical | ~800 lines, 10+ responsibilities, full-stack in one file |
| 2 | `src/pages/index.js` | 🔴 High | Mixed SSR + client, too many data sources |
| 3 | `src/components/admin/RecipeForm.js` | 🔴 High | ~300 lines, form + validation + API in one |
| 4 | `src/pages/my-plans/[id].js` | 🟠 Medium | Modal state in page, mixed data fetching |
| 5 | `src/components/RecipeModalController.tsx` | 🟠 Medium | Duplicates HomeModalController |
| 6 | `src/components/home/HomeModalController.tsx` | 🟠 Medium | Duplicates RecipeModalController |
| 7 | `src/lib/shoppingList.ts` | 🟡 Low | Multiple similar transformation functions |
| 8 | `src/pages/api/user/menus/index.js` | 🟡 Low | Upsert logic in API |
| 9 | `src/pages/api/recipes/index.js` | 🟡 Low | Mixed filter logic |
| 10 | `src/hooks/useGeneratePreferences.js` | 🟢 Low | Growing, needs monitoring |

---

## Suggested Refactoring Priority

### Phase 1: Generate Page (Critical)
1. Extract `useGenerateFlow` hook for orchestration
2. Move API calls to service layer
3. Keep page as composition only
4. Result: generate.js from 800 → ~150 lines

### Phase 2: Remove Duplication
1. Extract `useRecipeDetailModal` from controllers
2. Share fetch + modal logic between Home and Recipe
3. Result: 2 files → 1 hook + 2 thin wrappers

### Phase 3: Homepage Cleanup
1. Move data source selection to hook
2. Unify weekly plan + shopping list data flow
3. Result: index.js cleaner

### Phase 4: Admin Form
1. Split RecipeForm into smaller components
2. Extract useRecipeForm hook
3. Result: Better testability

---

## Summary

| Category | Healthy | Needs Work | Critical |
|----------|---------|------------|----------|
| Pages (35) | 25 | 8 | 2 |
| Components (49) | 45 | 4 | 0 |
| Hooks (8) | 8 | 0 | 0 |
| Lib (20) | 18 | 2 | 0 |
| Services (4) | 4 | 0 | 0 |

**Overall:** 2 critical files need immediate attention (generate.js, index.js), 4 medium-risk files for next phase.
