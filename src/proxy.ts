import { NextResponse, type NextRequest } from 'next/server';

// The admin tools (recipe editor, import/export, uploads, data audit) are
// switched off. Every admin page and API answers 404 unless ADMIN_ENABLED is
// set to "true" in the deployment's environment variables.
export function proxy(request?: NextRequest) {
  if (request?.nextUrl.pathname === '/') {
    // One shared ISR document contains all precomputed sample candidates.
    // Selection happens before paint, independently of the server date.
    return NextResponse.next();
  }
  // Internal ISR variants have a single public canonical URL. Framework data
  // requests may read them; direct visits return to the homepage.
  if (request?.nextUrl.pathname.startsWith('/home-rotation/')) {
    return request.headers.get('x-nextjs-data') === '1' ? NextResponse.next()
      : NextResponse.redirect(new URL('/', request.url));
  }
  if (process.env.ADMIN_ENABLED === 'true') return NextResponse.next();
  return NextResponse.json({ error: 'Not found' }, { status: 404, headers: { 'X-Robots-Tag': 'noindex' } });
}

export const config = {
  matcher: ['/', '/home-rotation/:path*', '/admin', '/admin/:path*', '/api/admin/:path*', '/api/audit', '/api/audit/:path*'],
};
