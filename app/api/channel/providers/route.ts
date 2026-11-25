import { ApiHandler } from '@/app/lib/api-handler';

// Provider names configured on channels, with channel counts (admin only).
const handler = new ApiHandler({
  endpoint: '/api/channel/providers'
});

export const GET = handler.get;
