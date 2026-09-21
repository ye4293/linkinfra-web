import RankingsView from '@/sections/rankings/rankings-view';

export const metadata = {
  title: 'Model rankings',
  description: 'Daily model usage rankings and token trends on Linkinfra.'
};

export default function RankingsPage() {
  return <RankingsView />;
}
