import { Breadcrumbs } from '@/components/breadcrumbs';
import PageContainer from '@/components/layout/page-container';
import LogTable from '../tables';
import { Separator } from '@/components/ui/separator';
import UsageSummary from '../usage-summary';

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
        <UsageSummary />
        <LogTable />
      </div>
    </PageContainer>
  );
}
