import { ApiHandler } from '@/app/lib/api-handler';

const handler = new ApiHandler({ endpoint: '/api/dashboard/stats/self' });

export const GET = handler.get;
