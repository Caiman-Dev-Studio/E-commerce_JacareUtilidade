import { NextResponse } from 'next/server';
import crypto from 'crypto';

const COOKIE_NAME = 'jacare_admin_session';

function getExpectedSession() {
  const secret = process.env.ADMIN_SESSION_SECRET;
  const password = process.env.STORE_PANEL_PASSWORD;

  if (!secret || !password) {
    return null;
  }

  return crypto
    .createHmac('sha256', secret)
    .update(password)
    .digest('hex');
}

export function middleware(request) {
  const expected = getExpectedSession();
  const cookie = request.cookies.get(COOKIE_NAME)?.value;

  if (!expected || cookie !== expected) {
    const loginUrl = new URL('/funcionarios.html', request.url);
    loginUrl.searchParams.set('redirect', request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin.html',
    '/api/confirmar',
    '/api/remover',
    '/api/limpar_finalizados',
    '/api/relatorio'
  ]
};
