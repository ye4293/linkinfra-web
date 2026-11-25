import { ApiHandler } from '@/app/lib/api-handler';

// Providers the signed-in account can route an API key to.
const handler = new ApiHandler({
  endpoint: '/api/token/sources'
});

export const GET = handler.get;
