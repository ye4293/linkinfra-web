import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

// 公开快照透传缓存校验头，不读取用户会话，也不代理任意查询参数。
export async function GET(request: NextRequest) {
  const base = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!base) {
    return Response.json(
      { success: false, status: 'unavailable' },
      { status: 503 }
    );
  }
  try {
    const headers = new Headers();
    const etag = request.headers.get('if-none-match');
    if (etag) headers.set('If-None-Match', etag);
    const response = await fetch(`${base.replace(/\/$/, '')}/api/rankings`, {
      headers,
      cache: 'no-store',
      signal: AbortSignal.timeout(10000)
    });
    const outgoing = new Headers({ 'Content-Type': 'application/json' });
    for (const name of ['cache-control', 'etag']) {
      const value = response.headers.get(name);
      if (value) outgoing.set(name, value);
    }
    return new Response(
      response.status === 304 ? null : await response.text(),
      {
        status: response.status,
        headers: outgoing
      }
    );
  } catch {
    return Response.json(
      { success: false, status: 'unavailable' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
