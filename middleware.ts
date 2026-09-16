// Protecting routes with next-auth
// https://next-auth.js.org/configuration/nextjs#middleware
// https://nextjs.org/docs/app/building-your-application/routing/middleware

import NextAuth from 'next-auth';
import authConfig from './auth.config';

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  if (!req.auth) {
    const url = new URL('/sign-in', req.url);
    url.searchParams.set(
      'callbackUrl',
      req.nextUrl.pathname + req.nextUrl.search
    );
    const lang = req.nextUrl.searchParams.get('lang');
    if (lang === 'zh' || lang === 'en') url.searchParams.set('lang', lang);
    return Response.redirect(url);
  }
});

export const config = { matcher: ['/dashboard/:path*'] };
