import { ApiHandler } from '@/app/lib/api-handler';
const handler = new ApiHandler({ endpoint: '/api/newsletter/sync' });
export const POST = handler.post;
