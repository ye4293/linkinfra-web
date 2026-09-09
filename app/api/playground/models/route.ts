import { ApiHandler } from '@/app/lib/api-handler';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

const handler = new ApiHandler({
  endpoint: '/api/user/models'
});

export const GET = handler.get;
