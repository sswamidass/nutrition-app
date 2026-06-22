import { NextRequest, NextResponse } from 'next/server';

// Lightweight personal-use gate. If APP_PASSWORD is unset (e.g. local dev),
// the gate is disabled and everything is open. When set (production), every
// page and API route requires a matching `auth` cookie.
export function middleware(req: NextRequest) {
  const password = process.env.APP_PASSWORD;
  if (!password) return NextResponse.next();

  const { pathname } = req.nextUrl;

  // Always allow the login page and its API so the user can authenticate.
  if (pathname === '/login' || pathname === '/api/login') {
    return NextResponse.next();
  }

  const auth = req.cookies.get('auth')?.value;
  if (auth === password) return NextResponse.next();

  // Unauthenticated API calls get a 401; page requests get redirected to login.
  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const url = req.nextUrl.clone();
  url.pathname = '/login';
  return NextResponse.redirect(url);
}

export const config = {
  // Run on everything except Next internals and static files.
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
