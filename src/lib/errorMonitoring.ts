// Browser error reporting to Sentry. Does nothing (and loads nothing) until
// NEXT_PUBLIC_SENTRY_DSN is set in the Vercel production environment.
let started = false;

export function shouldReportErrors(dsn: string | undefined, vercelEnv: string | undefined): dsn is string {
  return Boolean(dsn) && vercelEnv === 'production';
}

export async function startErrorMonitoring(): Promise<void> {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (started || typeof window === 'undefined' || !shouldReportErrors(dsn, process.env.NEXT_PUBLIC_VERCEL_ENV)) return;
  started = true;
  const Sentry = await import('@sentry/browser');
  Sentry.init({
    dsn,
    environment: 'production',
    tracesSampleRate: 0,
    // Ad and browser-extension scripts throw errors we cannot fix.
    denyUrls: [/googlesyndication\.com/, /googleads\./, /^chrome-extension:\/\//, /^moz-extension:\/\//],
  });
}
