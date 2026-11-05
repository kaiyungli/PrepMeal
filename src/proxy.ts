import { NextResponse } from 'next/server';

// The admin tools (recipe editor, import/export, uploads, data audit) are
// switched off. Every admin page and API answers 404 unless ADMIN_ENABLED is
// set to "true" in the deployment's environment variables.
export function proxy() {
  if (process.env.ADMIN_ENABLED === 'true') return NextResponse.next();
  return NextResponse.json({ error: 'Not found' }, { status: 404, headers: { 'X-Robots-Tag': 'noindex' } });
}

export const config = {
  matcher: ['/admin', '/admin/:path*', '/api/admin/:path*', '/api/audit', '/api/audit/:path*'],
};
