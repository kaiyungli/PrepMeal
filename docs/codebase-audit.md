# Codebase Audit Inventory (Revised)

## What Changed from Previous Audit

1. **Added explicit "Duplicate Data Access Paths" section** - Found duplicate recipe fetching in `src/services/recipes.ts` (deprecated but still exists)
2. **Re-graded overly optimistic entries** with stricter labels:
   - `RecipeDetailContent.tsx` → "Healthy but monitor" (has both modal and page usage)
   - `ShoppingListSection.js` → "Needs extraction" (duplicates fetch logic)
   - `Header.tsx` → "Boundary violation" (has auth logic)
   - `useGeneratePreferences.js` → "Needs extraction" (growing, complex state)
   - `useWeeklyPlanActions.js` → "Duplicated responsibility" (overlaps with generate page)
   - `recipes.ts` → "High-risk" (duplicate data paths, unused but present)
3. **Replaced vague "Good" labels** with 6-tier system
4. **Added "Structural Smells" section** covering 6 categories of issues
5. **Updated Top 10** with stricter criteria

---

## Overview

| Category | Count | Notes |
|----------|-------|-------|
| Pages | 35 | API + UI pages |
| Components | 49 | UI components |
| Hooks | 8 | React hooks |
| Lib | 20 | Utilities + data access |
| Services | 4 | Business logic |

### Label System (6-tier)

| Label | Meaning |
|-------|---------|
| Healthy | Single responsibility, clean boundaries |
| Healthy but monitor | Generally fine, watch for growth |
| Needs extraction | Has multiple responsibilities, should split |
| Duplicated responsibility | Logic exists elsewhere, should reuse |
| Boundary violation | Layer leakage (e.g., fetch in UI component) |
| High-risk oversized file | Too large, too many responsibilities |

---

## Pages

### UI Pages (User-facing)

#### src/pages/index.js
- **Responsibility:** Homepage rendering, recipe list display, favorites state, weekly plan generation, shopping list preview
- **Data Fetching:** SSR recipes, client-side favorites, shopping list API
- **Data Transformation:** generateWeeklyPlan, buildShoppingListFromPlan
- **UI Rendering:** HomeHero, HomeFiltersBar, HomeRecipesSection, RecipeGrid
- **Label:** Boundary violation - mixes SSR + client state + data orchestration
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
- **Label:** High-risk oversized file
- **Problems:** 
  - ~800 lines of mixed logic
  - Handles all modal state internally
  - Direct API calls mixed with UI
- **Target:** Split into: page (composition), useGenerateFlow (hook), generateService (data)

#### src/pages/recipes.js
- **Responsibility:** Recipe list with filters
- **Label:** Healthy

#### src/pages/recipes/[id].js
- **Responsibility:** SSR recipe detail page
- **Label:** Healthy

#### src/pages/favorites.js
- **Responsibility:** User favorites list
- **Label:** Healthy

#### src/pages/my-plans.js
- **Responsibility:** Saved plans list
- **Label:** Healthy

#### src/pages/my-plans/[id].js
- **Responsibility:** Plan detail, shopping list section, modal state
- **Label:** Needs extraction - Modal state in page, shopping list fetch logic

#### src/pages/menu.js, profile.js, about.js, login.js
- **Label:** Healthy

---

### API Pages

#### src/pages/api/recipes/index.js
- **Label:** Boundary violation - Mixed select with view modes, filter logic in API

#### src/pages/api/shopping-list/index.js
- **Label:** Healthy - Good separation

#### src/pages/api/user/menus/index.js
- **Label:** Needs extraction - Upsert logic mixed in API

---

## Components

### Recipe Components

#### src/components/RecipeCard.tsx
- **Label:** Healthy

#### src/components/RecipeList.tsx
- **Label:** Healthy

#### src/components/RecipeDetailContent.tsx
- **Label:** Healthy but monitor - Shared between modal and page, needs watch for divergence

#### src/components/RecipeDetailModal.tsx
- **Label:** Healthy

#### src/components/RecipeModalController.tsx
- **Label:** Duplicated responsibility - Duplicates HomeModalController logic exactly

#### src/components/home/HomeModalController.tsx
- **Label:** Duplicated responsibility - Duplicates RecipeModalController logic exactly

---

### Generate Components

#### src/components/generate/GenerateSettings.tsx
- **Label:** Healthy

#### src/components/generate/GenerateResults.tsx
- **Label:** Healthy

#### src/components/generate/WeeklyPlanGrid.tsx
- **Label:** Healthy

#### src/components/generate/ShoppingListModal.tsx
- **Label:** Healthy

---

### Home Components

#### src/components/home/HomeHero.tsx
- **Label:** Healthy

#### src/components/home/HomeRecipeGrid.tsx
- **Label:** Healthy

#### src/components/home/HomeRecipesSection.tsx
- **Label:** Healthy

---

### Admin Components

#### src/components/admin/RecipeForm.js
- **Label:** High-risk oversized file - ~300 lines, mixed form + validation + API
- **Target:** Split into useRecipeForm hook, form components

---

### Shopping Components

#### src/components/shopping/ShoppingListDrawer.js
- **Label:** Healthy

#### src/components/myPlans/ShoppingListSection.js
- **Label:** Needs extraction - Duplicates fetch logic (same as HomeModalController pattern)

---

### Layout Components

#### src/components/layout/Header.tsx
- **Label:** Boundary violation - Contains auth state logic in layout component

#### src/components/layout/Footer.tsx
- **Label:** Healthy

#### src/components/layout/Layout.tsx
- **Label:** Healthy

---

## Hooks

#### src/hooks/useAuth.js
- **Label:** Healthy

#### src/hooks/useFavorites.js
- **Label:** Healthy

#### src/hooks/useUserState.js
- **Label:** Healthy

#### src/hooks/useGeneratePreferences.js
- **Label:** Needs extraction - Growing complexity, many state pieces

#### src/hooks/useRecipeFilters.js
- **Label:** Healthy

#### src/hooks/useShoppingListPreview.ts
- **Label:** Healthy

#### src/hooks/useWeeklyPlanActions.js
- **Label:** Duplicated responsibility - Overlaps with generate page logic

---

## Lib (Data Access + Utilities)

### Data Access Layer

#### src/lib/fetchRecipeDetail.js
- **Label:** Healthy but monitor - Claims "single source" but duplicate exists in recipes.ts
- **Status:** Should be single source but verify no other paths

#### src/lib/recipesServer.ts
- **Label:** Healthy

#### src/lib/shoppingListData.js
- **Label:** Healthy

#### src/lib/supabase.js, supabaseClient.ts, supabaseServer.ts
- **Label:** Healthy

---

### Transformation Layer

#### src/lib/normalizeRecipeDetail.js
- **Label:** Healthy

#### src/lib/mealPlanner.ts
- **Label:** Healthy

#### src/lib/plannerConfig.ts
- **Label:** Healthy

---

### Utilities

#### src/lib/utils.ts
- **Label:** Healthy

#### src/lib/formatters.ts
- **Label:** Healthy

---

## Services (Business Logic)

#### src/services/recipes.ts
- **Label:** High-risk - DUPLICATE DATA PATH (contains getRecipeDetail, fetchRecipes, etc.)
- **Problems:** 
  - Contains exact duplicate of fetchRecipeDetail logic
  - Uses raw REST API instead of Supabase client
  - Marked deprecated but still present in codebase
  - Creates confusion about which to use

#### src/services/shoppingList.js
- **Label:** Healthy - no DB access, pure logic

#### src/services/weeklyPlan.ts
- **Label:** Healthy

#### src/services/menuPlans.ts
- **Label:** Healthy

---

## Structural Smells

### 1. Duplicate Data Access Paths
- `src/lib/fetchRecipeDetail.js` vs `src/services/recipes.ts` both fetch recipe detail
- `src/services/recipes.ts` is deprecated but not deleted
- Creates confusion about canonical data source

### 2. Mixed UI + Fetch Components
- `src/components/myPlans/ShoppingListSection.js` - Contains fetch logic inline
- Should use hook, not inline fetch

### 3. Page-Level Orchestration Overload
- `src/pages/generate.js` - 800+ lines handling everything
- `src/pages/index.js` - Mixed SSR + client orchestration

### 4. Shared vs Feature Boundary Confusion
- Modal controllers in both `home/` and root `components/`
- Should be single shared implementation or feature-specific

### 5. JS/TS Mixed Boundaries
- Admin components still in JS (`RecipeForm.js`, `RecipeStepsEditor.js`)
- Creates type inconsistency

### 6. Duplicated Modal Controller Patterns
- `RecipeModalController.tsx` and `HomeModalController.tsx` are nearly identical
- Should extract to single shared hook

---

## Top 10 Highest-Risk Files

| Rank | File | Risk | Reason |
|------|------|------|--------|
| 1 | `src/pages/generate.js` | 🔴 Critical | ~800 lines, 10+ responsibilities |
| 2 | `src/services/recipes.ts` | 🔴 Critical | Duplicate data path, deprecated but present |
| 3 | `src/pages/index.js` | 🔴 High | Mixed SSR + client, boundary violation |
| 4 | `src/components/admin/RecipeForm.js` | 🔴 High | ~300 lines, mixed concerns |
| 5 | `src/components/RecipeModalController.tsx` | 🟠 High | Duplicated responsibility |
| 6 | `src/components/home/HomeModalController.tsx` | 🟠 High | Duplicated responsibility |
| 7 | `src/pages/my-plans/[id].js` | 🟠 High | Modal + fetch in page |
| 8 | `src/components/myPlans/ShoppingListSection.js` | 🟡 Medium | Inline fetch, needs extraction |
| 9 | `src/hooks/useWeeklyPlanActions.js` | 🟡 Medium | Overlaps with generate page |
| 10 | `src/hooks/useGeneratePreferences.js` | 🟡 Medium | Growing complexity |

---

## Suggested Refactoring Priority

### Phase 1: Remove Duplicate Data Paths
1. Delete `src/services/recipes.ts` (deprecated duplicate)
2. Ensure all code uses `fetchRecipeDetail.js`

### Phase 2: Generate Page (Critical)
1. Extract `useGenerateFlow` hook for orchestration
2. Move API calls to service layer
3. Keep page as composition only

### Phase 3: Remove Modal Duplication
1. Extract `useRecipeDetailModal` from both controllers
2. Share fetch + modal logic

### Phase 4: Homepage Cleanup
1. Move data source selection to hook
2. Unify weekly plan + shopping list data flow

### Phase 5: Admin Form Split
1. Split RecipeForm into smaller components
2. Extract useRecipeForm hook

---

## Summary

| Category | Healthy | Healthy but monitor | Needs extraction | Duplicated responsibility | Boundary violation | High-risk oversized |
|----------|---------|----------------------|------------------|---------------------------|---------------------|---------------------|
| Pages (35) | 22 | 0 | 1 | 0 | 2 | 2 |
| Components (49) | 40 | 1 | 1 | 2 | 1 | 1 |
| Hooks (8) | 5 | 0 | 2 | 1 | 0 | 0 |
| Lib (20) | 17 | 1 | 0 | 0 | 0 | 0 |
| Services (4) | 3 | 0 | 0 | 0 | 0 | 1 |

**Overall Health:** 2 critical files (generate.js, recipes.ts), 4 high-risk, 6 medium-risk need attention.

**Immediate Action:** Delete `src/services/recipes.ts` to remove duplicate data path.
