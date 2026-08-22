import { NextResponse } from 'next/server';
import { auth } from '@/auth';

export async function GET() {
  const session = await auth();
  if (!session?.user || Number(session.user.role) < 10) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const baseUrl = (process.env.NEXTAUTH_URL || process.env.AUTH_URL || '')
    .trim()
    .replace(/\/$/, '');

  return NextResponse.json({
    baseUrl,
    githubConfigured: Boolean(
      process.env.GITHUB_ID && process.env.GITHUB_SECRET
    ),
    googleConfigured: Boolean(
      process.env.GOOGLE_ID && process.env.GOOGLE_SECRET
    ),
    githubCallbackUrl: baseUrl
      ? `${baseUrl}/api/auth/callback/github`
      : '/api/auth/callback/github',
    googleCallbackUrl: baseUrl
      ? `${baseUrl}/api/auth/callback/google`
      : '/api/auth/callback/google'
  });
}
