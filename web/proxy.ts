import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

// Note: this file was called middleware.ts before Next.js 16.
// The default export here satisfies Next's "proxy" file convention directly.
export default createMiddleware(routing);

export const config = {
  // Skip API routes, static files, etc.
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)']
};
