// Shared URL parsing helpers for auth flow

interface RouterLike {
  query?: Record<string, string | string[]>;
}

interface RedirectOptions {
  queryParam?: string;
  defaultUrl?: string;
  windowOrRouter?: RouterLike;
}

/**
 * Get redirect URL from current location or router query
 * Used by both login page and auth callback
 */
export function getRedirectUrl(options: RedirectOptions = {}) {
  const { queryParam = 'redirect', defaultUrl = '/my-plans', windowOrRouter } = options;
  
  // If passed a router object, use its query
  const query = windowOrRouter?.query;
  if (query) {
    const redirect = query[queryParam];
    if (redirect && typeof redirect === 'string') {
      return redirect.startsWith('/') ? redirect : '/' + redirect;
    }
    return defaultUrl;
  }
  
  // Otherwise use window location (browser-side)
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    const redirect = params.get(queryParam);
    if (redirect) {
      return redirect.startsWith('/') ? redirect : '/' + redirect;
    }
  }
  
  return defaultUrl;
}

/**
 * Build redirect URL for OAuth (used in useAuth hook)
 */
export function buildOAuthRedirectUrl(redirectPath = '/my-plans') {
  if (typeof window === 'undefined') {
    return redirectPath;
  }
  
  const searchParams = new URLSearchParams(window.location.search);
  const fromParam = searchParams.get('redirect');
  
  // If there's a redirect param, use that
  if (fromParam) {
    return fromParam.startsWith('/') ? fromParam : '/' + fromParam;
  }
  
  // Otherwise use the provided path
  return redirectPath;
}
