import { TopupPageView } from '@/sections/topup/view';

export const metadata = {
  title: 'Billing'
};

export default function page({
  searchParams
}: {
  searchParams: { paid?: string };
}) {
  return <TopupPageView paid={searchParams.paid} />;
}
