// Shared URL parsing helpers for auth flow

interface RouterLike {
  query?: Record<string, string | string[]>;
}

interface RedirectOptions {
  queryParam?: string;
  defaultUrl?: string;
  windowOrRouter?: RouterLike;
}

export function safeInternalRedirect(value: unknown, fallback = '/my-plans') {
  if (typeof value !== 'string' || !value || /[\\\u0000-\u0020]/.test(value)) return fallback;
  const path = value.startsWith('/') ? value : '/' + value;
  try {
    const decoded = decodeURIComponent(path);
    if (decoded.startsWith('//') || /[\\\u0000-\u0020]/.test(decoded)) return fallback;
    const parsed = new URL(path, 'https://internal.invalid');
    return parsed.origin === 'https://internal.invalid' ? path : fallback;
  } catch { return fallback; }
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
      return safeInternalRedirect(redirect, defaultUrl);
    }
    return defaultUrl;
  }
  
  // Otherwise use window location (browser-side)
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    const redirect = params.get(queryParam);
    if (redirect) {
      return safeInternalRedirect(redirect, defaultUrl);
    }
  }
  
  return defaultUrl;
}

/**
 * Build OAuth redirect URL for Supabase OAuth flow
 * Returns the full callback URL with redirect param
 */
export function buildOAuthRedirectUrl(callbackPath = '/auth/callback') {
  if (typeof window === 'undefined') {
    return callbackPath;
  }
  
  const origin = window.location.origin;
  const searchParams = new URLSearchParams(window.location.search);
  const redirectParam = searchParams.get('redirect');
  
  const baseUrl = `${origin}${callbackPath}`;
  
  // If there's a redirect param, append it
  if (redirectParam) {
    return `${baseUrl}?redirect=${encodeURIComponent(redirectParam)}`;
  }
  
  return baseUrl;
}
