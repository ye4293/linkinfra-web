import ModelDetailView from '@/sections/model-plaza/model-detail-view';

export const metadata = {
  title: 'Model details',
  description: 'View model performance metrics'
};

export default function ModelDetailPage({
  searchParams
}: {
  searchParams: { channel_id?: string; source_key?: string; returnTo?: string };
}) {
  return (
    <ModelDetailView
      channelId={searchParams.channel_id}
      sourceKey={searchParams.source_key}
      returnTo={
        typeof searchParams.returnTo === 'string' &&
        searchParams.returnTo.startsWith('/model-plaza?')
          ? searchParams.returnTo
          : '/model-plaza'
      }
    />
  );
}
