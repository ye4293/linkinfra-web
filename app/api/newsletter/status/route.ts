import { ApiHandler } from '@/app/lib/api-handler';
const handler = new ApiHandler({ endpoint: '/api/newsletter/status' });
export const dynamic = 'force-dynamic';
export const GET = handler.get;
