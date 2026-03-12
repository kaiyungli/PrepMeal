# PrepMeal 🥘

Smart Weekly Meal Planner

PrepMeal is a smart meal planning tool that generates weekly meal plans based on user preferences and available ingredients.

**Live Demo:** https://prep-meal-tan.vercel.app

---

## Core Features

### Weekly Meal Planner

Automatically generates weekly meal plan using rule-based scoring.

**Considers:**
- protein rotation
- cooking method diversity
- pantry ingredients
- cooking speed (weekday preference)
- difficulty preference
- cuisine variety
- missing ingredient penalty
- repeat recipe penalty

**Example:**
```
Mon — 番茄炒蛋  
Tue — 蒸魚  
Wed — 牛肉炒青菜  
```

### Pantry-Based Recipe Matching

Users enter ingredients they have.

**Example input:** `egg tomato onion`

Recipes ranked by matching score.

**Example card:**
```
匹配度 75%  
匹配食材：蛋、番茄
```

### Pantry-Aware Shopping List

Separates ingredients into two sections.

**Example:**
```
已有食材
--------
雞蛋
番茄

需要購買
--------
牛肉 300g
青菜 1把
蒜頭
```

### Ingredient Normalization

Synonyms automatically normalized.

**Example:**
```
蛋 → egg
雞蛋 → egg  
egg → egg
```

---

## Smart Recipe Scoring Engine

```
finalScore =
  proteinScore +
  methodScore +
  pantryScore +
  speedScore +
  difficultyScore +
  cuisineBonus -
  missingPenalty -
  repeatPenalty
```

**Example breakdown for 番茄炒蛋:**
```
proteinScore +2  
methodScore +1  
pantryScore +2  
speedScore +1  
difficultyScore +1  
missingPenalty -0.2  

finalScore = 6.8
```

### Scoring Rules

| Rule | Score |
|------|-------|
| Same protein yesterday | -2 |
| Same protein within 2 days | -1 |
| New protein | +2 |
| Same method yesterday | -1 |
| New method | +1 |
| Weekday + quick | +1 |
| Weekday + normal | +0.5 |
| Weekday + slow | -1 |
| Difficulty easy | +1 |
| Difficulty medium | 0 |
| Difficulty hard | -0.5 |
| New cuisine this week | +0.5 |
| Pantry match | +1 per ingredient |
| Repeat recipe | -3 |

---

## Recipe Database

Structured metadata:
- name, slug, cuisine, dish_type, difficulty
- method, primary_protein, speed
- tags, ingredients, steps, nutrition

---

## Admin Recipe Editor

**URL:** /admin/recipes

**Features:**
- create/edit recipes
- ingredient editor
- step editor
- image upload
- tag selector
- duplicate slug protection
- bulk import
- clone recipe

---

## Tech Stack

- **Frontend:** Next.js, React, Tailwind CSS v4
- **Backend:** Supabase, PostgreSQL
- **Testing:** Vitest
- **Deployment:** Vercel

---

## Project Structure

```
src
 ├ components/generate/
 ├ lib/
 │   ├ mealPlanner.ts
 │   ├ shoppingList.ts
 │   ├ ingredientMatcher.ts
 │   ├ ingredientNormalizer.ts
 ├ pages/
 │   ├ generate.js
 │   ├ recipes.js
 │   └ admin/
tests/
 ├ mealPlanner.test.ts
 ├ shoppingList.test.ts
 ├ ingredientMatcher.test.ts
 ├ ingredientNormalizer.test.ts
 └ plannerSimulation.test.ts
```

---

## Local Development

```bash
npm install
npm run dev
# Open http://localhost:3000
```

---

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ADMIN_SECRET=
```

---

## Running Tests

```bash
npm run test
# Output: Test Files: 5 passed, Tests: 73 passed
```

---

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| GET /api/recipes | List all recipes |
| GET /api/recipes/[id] | Get single recipe |
| GET /api/recipes/recommend?ingredients=x,y | Recommend by ingredients |
| POST /api/admin/import | Bulk import recipes |
| POST /api/admin/upload | Upload image |

---

## License

MIT

---

## Future Roadmap

- [ ] Auto meal plan from pantry
- [ ] Pantry inventory tracking
- [ ] Nutrition balancing
- [ ] AI recipe suggestions
- [ ] User accounts
- [ ] Saved meal plans

---

## License

MIT
