import { auth } from '@/auth';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { Separator } from '@/components/ui/separator';
import PageContainer from '@/components/layout/page-container';
import { Card, CardContent } from '@/components/ui/card';
import { renderQuota } from '@/utils/render';
import TopupForm from '../topup-form';
import PaymentSection from '../payment-section';
import PaymentSuccessIndicator from '../payment-success-indicator';
import InviteCard from '../invite-card';
import TransactionHistory from '../transaction-history';
import { BadgeDollarSign, CreditCard, Gift, Wallet } from 'lucide-react';

const breadcrumbItems = [
  { title: 'Dashboard', link: '/dashboard' },
  { title: 'Topup', link: '/dashboard/topup' }
];

export default async function TopupPage({ paid }: { paid?: string }) {
  const session = await auth();

  // Fetch user info (balance, etc.)
  const userRes = await fetch(
    process.env.NEXT_PUBLIC_API_BASE_URL + `/api/user/self`,
    {
      credentials: 'include',
      headers: {
        Authorization: `Bearer ${session?.user?.accessToken}`
      }
    }
  );
  const { data: userData } = await userRes.json();
  const admin = [10, 100].includes(Number(session?.user?.role));
  let rechargeAmount = 0;
  if (admin) {
    try {
      const statsRes = await fetch(
        process.env.NEXT_PUBLIC_API_BASE_URL + '/api/dashboard/stats',
        {
          credentials: 'include',
          headers: { Authorization: `Bearer ${session?.user?.accessToken}` }
        }
      );
      if (statsRes.ok) {
        const stats = await statsRes.json();
        rechargeAmount = stats?.data?.recharge_amount || 0;
      }
    } catch (error) {
      console.error('Failed to load 24h recharge amount:', error);
    }
  }

  return (
    <PageContainer scrollable>
      <div className="space-y-6 pb-8">
        <div className="space-y-2">
          <Breadcrumbs items={breadcrumbItems} />
          <Separator />
        </div>

        {paid && <PaymentSuccessIndicator paid={paid} />}

        <div
          className={`grid gap-4 ${
            admin ? 'md:grid-cols-2 xl:grid-cols-4' : 'md:grid-cols-3'
          }`}
        >
          <Card className="border-none bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="rounded-full bg-white/20 p-3">
                <Wallet className="h-7 w-7 text-white" />
              </div>
              <div className="min-w-0">
                <p className="mb-1 text-sm font-medium text-blue-100">
                  Current balance
                </p>
                <h2
                  className="truncate text-2xl font-bold tracking-tight"
                  title={String(renderQuota(userData?.quota || 0))}
                >
                  {renderQuota(userData?.quota || 0)}
                </h2>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 p-6">
              <div className="rounded-full bg-emerald-500/10 p-3">
                <BadgeDollarSign className="h-7 w-7 text-emerald-600" />
              </div>
              <div className="min-w-0">
                <p className="mb-1 text-sm font-medium text-muted-foreground">
                  Cumulative top-ups
                </p>
                <h2
                  className="truncate text-2xl font-bold tracking-tight"
                  title={String(renderQuota(userData?.topup_quota || 0))}
                >
                  {renderQuota(userData?.topup_quota || 0)}
                </h2>
              </div>
            </CardContent>
          </Card>
          {admin && (
            <Card>
              <CardContent className="flex min-w-0 items-center gap-4 p-6">
                <div className="rounded-full bg-blue-500/10 p-3">
                  <CreditCard className="h-7 w-7 text-blue-600" />
                </div>
                <div className="min-w-0">
                  <p className="mb-1 text-sm font-medium text-muted-foreground">
                    Recharge · 24h
                  </p>
                  <h2
                    className="truncate text-2xl font-bold tabular-nums tracking-tight"
                    title={`$${rechargeAmount.toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })}`}
                  >
                    $
                    {rechargeAmount.toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })}
                  </h2>
                </div>
              </CardContent>
            </Card>
          )}
          <Card>
            <CardContent className="flex items-center gap-4 p-6">
              <div className="rounded-full bg-amber-500/10 p-3">
                <Gift className="h-7 w-7 text-amber-600" />
              </div>
              <div className="min-w-0">
                <p className="mb-1 text-sm font-medium text-muted-foreground">
                  Cumulative bonus
                </p>
                <h2
                  className="truncate text-2xl font-bold tracking-tight"
                  title={String(renderQuota(userData?.gift_quota || 0))}
                >
                  {renderQuota(userData?.gift_quota || 0)}
                </h2>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Grid Layout */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Left Column: Topup & Payment */}
          <div className="flex flex-col gap-6 lg:col-span-7">
            <PaymentSection />
          </div>

          {/* Right Column: Invite & Rewards */}
          <div className="flex flex-col gap-6 lg:col-span-5">
            <InviteCard user={userData} />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="flex flex-col gap-6 lg:col-span-7">
            <TopupForm />
          </div>
        </div>

        {/* Bottom Section: Transaction History */}
        <TransactionHistory />
      </div>
    </PageContainer>
  );
}
