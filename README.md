# PrepMeal

PrepMeal is a Next.js (Pages Router) meal planning app with Supabase-backed recipes, favorites, and admin import/export APIs.

## Tech stack

- Next.js 16 (Pages Router)
- React 19
- Supabase JS client
- Tailwind CSS 4

## Project structure

```text
src/
  components/        UI and feature components
  lib/               shared clients/auth helpers
  pages/             routes + API routes (Pages Router)
    api/             backend endpoints
  services/          fetch/data helper functions
  styles/            global styles
supabase/            SQL/bootstrap assets
scripts/             local tooling (smoke checks)
```

## Structure conventions

- Keep route handlers inside `src/pages/api/**` only.
  - Public APIs: `src/pages/api/recipes/**`, `src/pages/api/menus/**`
  - Admin APIs: `src/pages/api/admin/**`
- Keep Supabase/client/auth helpers inside `src/lib/**`.
  - `supabaseClient.ts` for public client usage
  - `supabaseServer.ts` for admin/service-role usage
  - `ensureSupabase.js` for shared config guard behavior
- Keep UI pages in `src/pages/**` and reusable fetch logic in `src/services/**`.
- Put one-off/dev checks in `scripts/**` (example: `scripts/smoke.mjs`).

## Environment setup

1. Copy the template:

```bash
cp .env.example .env.local
```

2. Fill required variables in `.env.local`:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- (optional) `ADMIN_USERNAME`, `ADMIN_PASSWORD`

## Install and run

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Scripts

- `npm run dev` - start local dev server
- `npm run build` - production build
- `npm run start` - run built app
- `npm run lint` - lint codebase
- `npm run smoke` - basic API smoke checks against a temporary local dev server

## Notes

- Supabase clients are guarded so missing env vars return graceful API errors instead of crashing at module import time.
- Admin routes depend on `SUPABASE_SERVICE_ROLE_KEY`.
