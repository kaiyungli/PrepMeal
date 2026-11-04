// Pages that only make sense for a signed-in user, an admin, or the team's own
// measurements. They stay reachable, but search engines are asked not to index
// them. Uses Next's route-file pathname (e.g. '/my-plans/[id]'), never a URL.
const NOINDEX_ROUTES = new Set([
  '/login',
  '/profile',
  '/favorites',
  '/my-plans',
  '/my-plans/[id]',
  '/auth/callback',
  '/favorites-performance',
]);

export function isNoIndexRoute(pathname: string | undefined | null): boolean {
  if (!pathname) return false;
  return NOINDEX_ROUTES.has(pathname) || pathname === '/admin' || pathname.startsWith('/admin/');
}

// The favorites measurement page is a team diagnostic tool: available on
// preview and local builds, a 404 on the production deployment.
export function isDiagnosticsPageEnabled(vercelEnv: string | undefined = process.env.VERCEL_ENV): boolean {
  return vercelEnv !== 'production';
}
