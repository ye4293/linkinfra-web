import { ApiHandler } from '@/app/lib/api-handler';

const handler = new ApiHandler({
  endpoint: '/api/dashboard/usage-metrics/self'
});

export const GET = handler.get;
