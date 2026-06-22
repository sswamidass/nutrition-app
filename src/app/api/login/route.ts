import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const password = process.env.APP_PASSWORD;
  // If no password is configured, the gate is disabled — nothing to log into.
  if (!password) return NextResponse.json({ ok: true });

  const { password: submitted } = await req.json().catch(() => ({ password: '' }));
  if (submitted !== password) {
    return NextResponse.json({ error: 'Incorrect password' }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set('auth', password, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 90, // 90 days
  });
  return res;
}
