import { Breadcrumbs } from '@/components/breadcrumbs';
import PageContainer from '@/components/layout/page-container';
import LogTable from '../tables';
import { Separator } from '@/components/ui/separator';
import UsageSummary from '../usage-summary';
import Link from 'next/link';

const breadcrumbItems = [
  { title: 'Dashboard', link: '/dashboard' },
  { title: 'Log', link: '/dashboard/log' }
];

export default function LogListingPage() {
  return (
    <PageContainer scrollable>
      <div className="space-y-4">
        <Breadcrumbs items={breadcrumbItems} />
        <Separator />
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <p className="text-muted-foreground">
            Individual requests, token usage and charges.
          </p>
          <Link
            href="/dashboard/statistics"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            View performance trends →
          </Link>
        </div>
        <UsageSummary />
        <LogTable />
      </div>
    </PageContainer>
  );
}
