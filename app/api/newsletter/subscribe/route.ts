import { ApiHandler } from '@/app/lib/api-handler';

const handler = new ApiHandler({
  endpoint: '/api/newsletter/subscribe',
  requireAuth: false
});

export const POST = handler.post;
