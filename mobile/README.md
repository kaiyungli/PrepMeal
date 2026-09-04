# PrepMeal Mobile

Expo + React Native + TypeScript app for PrepMeal / 「今晚食乜」.

This is the **foundation slice** only — an app shell, navigation skeleton, and
Supabase/session groundwork. No product features are implemented yet.

The existing Next.js web app at the repository root is untouched; it remains the
SEO / discovery surface. This mobile app is a separate tooling boundary under
`mobile/` (its own `package.json`, `node_modules`, `tsconfig.json`).

## Requirements

- Node.js 20+ (repo is developed on Node 22)
- An iOS Simulator / Android Emulator, or the Expo Go app on a physical device

## Install

```bash
cd mobile
npm install
```

## Environment variables

The app reads **public** Supabase config from Expo env vars. Expo only exposes
variables prefixed with `EXPO_PUBLIC_` to the client bundle.

| Variable                        | Description                                  |
| ------------------------------- | -------------------------------------------- |
| `EXPO_PUBLIC_SUPABASE_URL`      | Supabase project URL                         |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key (NOT service role)  |

Setup:

```bash
cp .env.example .env
# then edit .env with values from Supabase → Project Settings → API
```

`.env` (and any `.env.*` except `.env.example`) is git-ignored. Never put the
service-role key or any server secret here — these values ship inside the client
bundle.

If a required variable is missing, `getMobileEnv()` throws a `MissingEnvError`
that names exactly which variable is absent. `hasMobileEnv()` is a non-throwing
check for rendering a friendly "not configured" state.

## Run Expo

```bash
npm start          # Expo dev server + QR code
npm run android    # open on Android emulator/device
npm run ios        # open on iOS simulator
npm run web        # run in a browser
```

## Folder structure

```
mobile/
├── app/                     # Expo Router routes (file-based)
│   ├── _layout.tsx          # root providers + headerless stack
│   ├── index.tsx            # redirects "/" → "/today"
│   └── (tabs)/              # future top-level navigation (URL-transparent group)
│       ├── _layout.tsx      # 4-tab bar: 今日 / 食譜 / 餐單 / 我的
│       ├── today.tsx        # 今日   (placeholder)
│       ├── recipes.tsx      # 食譜   (placeholder)
│       ├── plans.tsx        # 餐單   (placeholder)
│       └── profile.tsx      # 我的   (placeholder)
├── src/
│   ├── components/          # reusable UI primitives
│   │   ├── ScreenContainer.tsx   # safe-area aware screen shell
│   │   ├── PlaceholderScreen.tsx # temporary tab body
│   │   ├── LoadingState.tsx
│   │   └── ErrorState.tsx
│   ├── constants/
│   │   └── theme.ts         # minimal neutral tokens (NOT a design system)
│   ├── features/            # feature components/hooks (empty for now)
│   ├── hooks/
│   │   └── useSession.ts    # read-only Supabase auth session (no auth UI)
│   ├── lib/
│   │   ├── env.ts           # validated access to EXPO_PUBLIC_* vars
│   │   └── supabase.ts      # lazy singleton Supabase client (AsyncStorage)
│   └── types/
│       ├── recipe.ts        # RecipeSummary
│       ├── mealPlan.ts      # MealPlanSummary
│       └── index.ts         # barrel
├── assets/
├── .env.example
├── app.json
└── tsconfig.json
```

### Architecture

Keep route/screen components thin:

```
route/screen  →  feature component/hook  →  service/client
```

Presentation components must **not** call Supabase directly — go through a
feature hook or service that uses `getSupabaseClient()` from `src/lib/supabase.ts`.

## Current scope (this slice)

- Expo Router configured with a root stack and a 4-tab group
- Four placeholder tab screens: 今日 / 食譜 / 餐單 / 我的
- `ScreenContainer` safe-area screen shell + `LoadingState` / `ErrorState`
- Minimal neutral theme tokens
- `EXPO_PUBLIC_*` env plumbing with explicit missing-var errors
- Lazy singleton Supabase client with React Native session persistence
- `useSession()` — reads the current auth session, stays in sync via
  `onAuthStateChange` (no sign-in/out methods, no UI)
- Small types layer: `RecipeSummary`, `MealPlanSummary`

## Intentionally deferred

Not in this slice (future work): recipe API integration, recipe detail /
filters / favorites, meal generation, planner port + scoring, recipe
replacement, lock/unlock, saved plans, shopping list, authentication UI,
onboarding, notifications, analytics, ads, subscriptions, any Supabase schema
changes or migrations, and any web UI changes.

Shared business logic between web and mobile (e.g. recipe fetching, plan
summarising) is **not** extracted yet — noted for a later slice.

## Validation

```bash
cd mobile
npm install            # 1. deps install
npm run typecheck      # 2. tsc --noEmit
npx expo config --type public   # 3. Expo config resolves
```
