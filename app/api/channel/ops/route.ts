import { ApiHandler } from '@/app/lib/api-handler';

const handler = new ApiHandler({
  endpoint: '/api/channel/ops',
  requireAuth: true
});

export const GET = handler.get;
