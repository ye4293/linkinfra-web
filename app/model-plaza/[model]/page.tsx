import ModelDetailView from '@/sections/model-plaza/model-detail-view';

export const metadata = {
  title: 'Model details',
  description: 'View model performance metrics'
};

export default function ModelDetailPage({
  searchParams
}: {
  searchParams: { channel_id?: string };
}) {
  return <ModelDetailView channelId={searchParams.channel_id} />;
}
