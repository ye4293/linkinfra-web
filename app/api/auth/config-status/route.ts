import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import {
  clearOAuthProviderConfigCache,
  getOAuthProviderConfig
} from '@/lib/oauth-provider-config';

export async function GET() {
  const session = await auth();
  if (!session?.user || Number(session.user.role) < 10) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const baseUrl = (process.env.NEXTAUTH_URL || process.env.AUTH_URL || '')
    .trim()
    .replace(/\/$/, '');

  const oauth = await getOAuthProviderConfig();
  return NextResponse.json({
    baseUrl,
    githubConfigured: Boolean(oauth.githubId && oauth.githubSecret),
    googleConfigured: Boolean(oauth.googleId && oauth.googleSecret),
    githubCallbackUrl: baseUrl
      ? `${baseUrl}/api/auth/callback/github`
      : '/api/auth/callback/github',
    googleCallbackUrl: baseUrl
      ? `${baseUrl}/api/auth/callback/google`
      : '/api/auth/callback/google'
  });
}

export async function POST() {
  const session = await auth();
  if (!session?.user || Number(session.user.role) < 10) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  clearOAuthProviderConfigCache();
  return NextResponse.json({ success: true });
}
