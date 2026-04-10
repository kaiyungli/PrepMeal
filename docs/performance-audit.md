# Performance Audit

## Top 10 Performance Risks

| # | Issue | Severity | Files |
|---|-------|----------|-------|
| 1 | useRecipeFilters hook runs on every render without memoization | HIGH | src/hooks/useRecipeFilters.js |
| 2 | useUserState creates token via useEffect + Promise chain - causes double-fetch | HIGH | src/hooks/useUserState.js |
| 3 | generatePageController has heavy 353-line hook with many useEffect dependencies | HIGH | src/features/generate/hooks/useGeneratePageController.ts |
| 4 | HomeHero renders inline JSX for each weekly plan slot (no virtualization) | MEDIUM | src/components/home/HomeHero.tsx |
| 5 | RecipeDetailModal fetches recipe on every open (no cache) | MEDIUM | src/components/RecipeDetailModal.tsx |
| 6 | No React.memo on recipe card components | MEDIUM | src/components/home/HomeRecipesSection.tsx |
| 7 | Filters kept in index.js page instead of controller | LOW | src/pages/index.js |
| 8 | ShoppingListPreview makes API call on every weeklyPlan change | MEDIUM | src/hooks/useShoppingListPreview.ts |
| 9 | useAuth + useFavorites both exist as separate hooks (duplication) | LOW | src/hooks/useAuth.js, src/hooks/useFavorites.js |
| 10 | No image lazy loading or optimization | LOW | Multiple components |

---

## Detailed Analysis

### 1. useRecipeFilters runs on every render without memoization

**Severity:** HIGH  
**Files:** `src/hooks/useRecipeFilters.js`

**Why expensive:**
- The hook computes filter logic on every parent render
- `filterRecipes()` is called in useMemo but the filter state changes constantly
- Each keystroke in search triggers full filter recalculation

**Recommended fix:**
```javascript
// Add debounce to search input in the hook itself
// Cache filtered results with shallow equality check
```

---

### 2. useUserState creates token via useEffect + Promise chain

**Severity:** HIGH  
**Files:** `src/hooks/useUserState.js`

**Why expensive:**
- Auth token is fetched via `auth.getAccessToken().then(t => setToken(t))` inside useEffect
- This causes useFavorites to initialize with null token, then re-fetch after token resolves
- Results in 2 API calls instead of 1

**Recommended fix:**
```javascript
// Either: Move token resolution to useAuth itself
// Or: Pass token synchronously via auth.getAccessToken() without Promise
```

---

### 3. generatePageController 353-line hook with many useEffect

**Severity:** HIGH  
**Files:** `src/features/generate/hooks/useGeneratePageController.ts`

**Why expensive:**
- Multiple useEffect for: recipes fetch, pantry from URL, session storage restore, shopping list preload
- Complex filtering logic in useMemo with try/catch (filterRecipes)
- Each dependency change triggers cascade of re-renders
- No code splitting between different concern areas

**Recommended fix:**
- Split into smaller hooks: `useRecipesFetcher`, `usePlanState`, `useShoppingList`
- Add `shouldRefetch` flags to prevent unnecessary refetches
- Memoize filtered recipes with proper equality check

---

### 4. HomeHero renders inline JSX for each weekly plan slot

**Severity:** MEDIUM  
**Files:** `src/components/home/HomeHero.tsx`

**Why expensive:**
- No virtualization for 7-day plan display
- Each slot rendered individually with inline handlers

**Recommended fix:**
- Memoize slot components
- Consider lazy loading future weeks

---

### 5. RecipeDetailModal fetches on every open (no cache)

**Severity:** MEDIUM  
**Files:** `src/components/RecipeDetailModal.tsx`

**Why expensive:**
- Controller has recipeCache ref but API still called for each modal open
- No persistent cache across session

**Recommended fix:**
```javascript
// Use SWR for recipe detail with global cache
// Or persist recipeCache to sessionStorage
```

---

### 6. No React.memo on recipe card components

**Severity:** MEDIUM  
**Files:** `src/components/home/HomeRecipesSection.tsx`

**Why expensive:**
- RecipeGridItem re-renders on every parent state change
- Favorite toggle triggers full list re-render

**Recommended fix:**
```javascript
const RecipeCard = React.memo(function RecipeCard({ recipe, isFavorite, onClick }) {
  // ...
}, (prev, next) => prev.recipe.id === next.recipe.id && prev.isFavorite === next.isFavorite);
```

---

### 7. Filters kept in index.js page

**Severity:** LOW  
**Files:** `src/pages/index.js`

**Why expensive:**
- Not a runtime issue, but violates thin-page principle
- Controller extraction incomplete

**Recommended fix:**
- Move filter state + logic to useHomePageController
- Page only passes callback references

---

### 8. ShoppingListPreview API call on every weeklyPlan change

**Severity:** MEDIUM  
**Files:** `src/hooks/useShoppingListPreview.ts`

**Why expensive:**
- useEffect depends on weeklyPlan array
- Each refresh triggers new API call immediately

**Recommended fix:**
```javascript
// Add debounce/throttle to fetch
// Add loading state to prevent rapid successive calls
```

---

### 9. useAuth + useFavorites both exist (duplication)

**Severity:** LOW  
**Files:** `src/hooks/useAuth.js`, `src/hooks/useFavorites.js`

**Why expensive:**
- Architectural smell, not runtime issue
- useUserState wraps both but adds token-fetch overhead

**Recommended fix:**
- Merge into single hook with proper separation of concerns

---

### 10. No image lazy loading or optimization

**Severity:** LOW  
**Files:** Multiple components

**Why expensive:**
- Recipe images load immediately even when off-screen
- No Next.js Image optimization

**Recommended fix:**
```javascript
import Image from 'next/image';
<Image src={recipe.image} loading="lazy" />
```

---

## Top 3 Highest-ROI Fixes

### 1. Memoize RecipeGridItem (Quick Win)

**Impact:** High - affects every recipe list render  
**Effort:** Low - add React.memo with proper comparison  
**Files:** RecipeGridItem, HomeRecipesSection

### 2. Fix token-fetch in useUserState

**Impact:** High - eliminates duplicate API calls on auth  
**Effort:** Medium - refactor auth token handling  
**Files:** src/hooks/useUserState.js

### 3. Debounce shopping list fetch + cache recipe details

**Impact:** Medium - reduces API spam  
**Effort:** Medium - add caching layer  
**Files:** useShoppingListPreview, RecipeDetailModal

---

## Summary

- **HIGH priority (fix first):** useRecipeFilters memo, useUserState token fetch, generatePageController complexity
- **MEDIUM priority:** HomeHero memo, RecipeDetailModal cache, shopping list debounce
- **LOW priority:** Image optimization, filter extraction, hook consolidation