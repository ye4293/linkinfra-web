import { ApiHandler } from '@/app/lib/api-handler';
import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

const handler = new ApiHandler({
  endpoint: '/api/status',
  requireAuth: false
});

export async function GET(request: NextRequest) {
  const response = await handler.get(request);
  response.headers.set('Cache-Control', 'no-store');
  return response;
}
