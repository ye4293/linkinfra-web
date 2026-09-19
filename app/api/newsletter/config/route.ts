import { ApiHandler } from '@/app/lib/api-handler';
const handler = new ApiHandler({ endpoint: '/api/newsletter/config' });
export const POST = handler.post;
