import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

/**
 * Multi-Tenant Middleware
 *
 * Handles authentication and tenant routing for the application.
 *
 * Route Structure:
 * - Marketing site: /
 * - Legacy app routes: /dashboard, /sales-prep, etc. (still supported)
 * - Tenant-aware routes: /app/[dealerSlug]/dashboard, etc. (new)
 *
 * The middleware:
 * 1. Requires auth for /app/* and legacy tenant routes
 * 2. Extracts dealerSlug from /app/[dealerSlug]/* and passes via header
 * 3. Redirects unauthenticated users to sign in
 */

// Routes that require authentication and tenant context
const TENANT_ROUTES = [
  '/dashboard',
  '/sales-prep',
  '/warranty',
  '/appraisals',
  '/forms',
  '/reviews',
  '/calendar',
  '/settings',
  '/vehicles',
  '/onboarding',
  '/contacts',
  '/sales',
];

// Routes that are public (no auth required)
const PUBLIC_ROUTES = [
  '/public',
  '/appraisal',
  '/auth',
  '/api/auth',
  '/api/public',
  '/',
  '/tos',
  '/privacy-policy',
  '/invite',
  '/px',
];

// API routes that should receive x-dealer-slug header when in /app context
const TENANT_AWARE_API_ROUTES = [
  '/api/vehicles',
  '/api/dealer',
  '/api/forms',
  '/api/aftercare',
  '/api/appraisals',
  '/api/calendar',
  '/api/contacts',
  '/api/labels',
  '/api/locations',
  '/api/tasks',
  '/api/team',
  '/api/dashboard',
  '/api/dvla',
  '/api/sales',
  '/api/prep-tasks',
  '/api/reviews',
];

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  // Skip middleware for static files
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Check if this is a public route
  const isPublicRoute = PUBLIC_ROUTES.some(route =>
    pathname === route || pathname.startsWith(route + '/')
  );

  if (isPublicRoute) {
    return NextResponse.next();
  }

  // Check if this is a legacy tenant route
  const isLegacyTenantRoute = TENANT_ROUTES.some(route =>
    pathname === route || pathname.startsWith(route + '/')
  );

  if (isLegacyTenantRoute) {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

    if (!token) {
      const signInUrl = new URL('/auth/signin', request.url);
      signInUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(signInUrl);
    }

    // Redirect legacy routes to canonical tenant routes if user has a default dealer
    // The token includes dealerId from the JWT callback in authOptions
    if (token.dealerId) {
      // We need to look up the dealer slug - this requires an API call or header
      // For now, set a header to tell the page to check for redirect client-side
      const response = NextResponse.next();
      response.headers.set('x-should-redirect-to-tenant', 'true');
      return response;
    }

    // No dealer ID - let the page handle it (redirect to create-dealer)
    return NextResponse.next();
  }

  // Handle /app routes - tenant-aware routing
  if (pathname.startsWith('/app')) {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

    if (!token) {
      const signInUrl = new URL('/auth/signin', request.url);
      signInUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(signInUrl);
    }

    // Extract dealer slug from path: /app/[dealerSlug]/...
    const pathParts = pathname.split('/');
    const dealerSlug = pathParts[2];

    if (!dealerSlug || dealerSlug === '') {
      // No dealer slug - redirect to dealer picker or legacy dashboard
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    // Valid dealer slug - pass it along in a header
    const response = NextResponse.next();
    response.headers.set('x-dealer-slug', dealerSlug);
    return response;
  }

  // Handle API routes - check if request comes from /app context
  // The x-dealer-slug header is set by the client when making API calls from /app pages
  if (pathname.startsWith('/api/')) {
    const dealerSlug = request.headers.get('x-dealer-slug');
    const isTenantAwareApi = TENANT_AWARE_API_ROUTES.some(route =>
      pathname.startsWith(route)
    );

    if (dealerSlug && isTenantAwareApi) {
      // Pass the dealer slug to the API route
      const response = NextResponse.next();
      response.headers.set('x-dealer-slug', dealerSlug);
      return response;
    }

    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
