import { TokenPageHeader } from '../token-page-header';
import { auth } from '@/auth';
import { Breadcrumbs } from '@/components/breadcrumbs';
import PageContainer from '@/components/layout/page-container';
import TokenTable from '../tables';
import { Separator } from '@/components/ui/separator';
import { Token } from '@/lib/types/token';
import { searchParamsCache } from '@/lib/searchparams';
import { ApiConnectionGuide } from '@/components/api-connection-guide';
import { GettingStartedCard } from '@/components/getting-started-guide';

const breadcrumbItems = [
  { title: 'Dashboard', link: '/dashboard' },
  { title: 'Token', link: '/dashboard/token' }
];

type TTokenListingPage = {};

export default async function TokenListingPage({}: TTokenListingPage) {
  // Showcasing the use of search params cache in nested RSCs
  const page = searchParamsCache.get('page');
  const search = searchParamsCache.get('q');
  const status = searchParamsCache.get('status');
  const pageLimit = searchParamsCache.get('limit');

  const params = new URLSearchParams({
    page: String(page),
    pagesize: String(pageLimit),
    ...(search && { keyword: search }),
    ...(status && { status: status })
  });
  const session = await auth();
  const baseUrl =
    process.env.NEXT_PUBLIC_API_BASE_URL + `/api/token/search?${params}`;
  const res = await fetch(baseUrl, {
    credentials: 'include',
    headers: {
      Authorization: `Bearer ${session?.user?.accessToken}`
    }
  });
  const { data } = await res.json();
  const totalData = (data && data.total) || 0;
  const token: Token[] = (data && data.list) || [];

  return (
    <PageContainer scrollable>
      <div className="space-y-4">
        <Breadcrumbs items={breadcrumbItems} />

        <TokenPageHeader total={totalData} />
        <Separator />
        <ApiConnectionGuide compact />
        <TokenTable data={token} totalData={totalData} />
        <GettingStartedCard compact />
      </div>
    </PageContainer>
  );
}
