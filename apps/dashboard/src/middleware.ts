import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Next.js Edge Middleware — server-side route protection.
 *
 * Protected dashboard routes require a `satelink_token` cookie or
 * `Authorization: Bearer` header. If neither is present, the user
 * is redirected to /login.
 *
 * This is a first-pass guard. The client-side AuthProvider performs
 * the definitive /auth/me check; this middleware prevents flicker by
 * redirecting unauthenticated users before the page even loads.
 */

const PROTECTED_PREFIXES = [
    '/admin',
    '/node',
    '/builder',
    '/distributor',
    '/enterprise/dashboard',
    '/account',
];

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    const isProtected = PROTECTED_PREFIXES.some(p => pathname.startsWith(p));
    if (!isProtected) return NextResponse.next();

    // Check for auth token in cookie or header
    const cookieToken = request.cookies.get('satelink_session')?.value;
    const localToken = request.cookies.get('satelink_token')?.value;
    const authHeader = request.headers.get('authorization');
    const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

    const hasToken = !!(cookieToken || localToken || bearerToken);

    if (!hasToken) {
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('redirect', pathname);
        return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        '/admin/:path*',
        '/node/:path*',
        '/builder/:path*',
        '/distributor/:path*',
        '/enterprise/dashboard/:path*',
        '/account/:path*',
    ],
};
