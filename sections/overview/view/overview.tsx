'use client';

import { useSession } from 'next-auth/react';
import { GettingStartedCard } from '@/components/getting-started-guide';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Wallet, Zap, CalendarDays, Users, ArrowRight } from 'lucide-react';
import { BarGraph } from '../bar-graph';
import { AnalyticsContent } from '../analytics-content';
import PageContainer from '@/components/layout/page-container';
import { RecentSales } from '../recent-sales';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { renderQuota } from '@/utils/render';
import { Skeleton } from '@/components/ui/skeleton';
import request from '@/app/lib/clientFetch';
import {
  Dashboard,
  DashboardResult,
  DashboardStatsResult
} from '@/lib/types/dashboard';
import { useLocale } from '@/components/providers/locale-provider';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip';

const isAdmin = (role: unknown) => [10, 100].includes(Number(role));

function compactQuota(quota: number) {
  const raw = String(renderQuota(quota));
  if (!raw.startsWith('$')) return { compact: raw, full: raw };
  const amount = Number(raw.slice(1));
  if (!Number.isFinite(amount)) return { compact: raw, full: raw };
  const full = amount.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  const compact =
    Math.abs(amount) >= 1_000_000
      ? `$${Intl.NumberFormat('en-US', {
          notation: 'compact',
          maximumFractionDigits: 2
        }).format(amount)}`
      : full;
  return { compact, full };
}

export default function OverViewPage() {
  const { data: session, status } = useSession();
  const { t } = useLocale();
  const userRole = session?.user?.role;
  const userName = session?.user?.name || session?.user?.username || '';
  const [dashboardData, setDashboardData] = useState<Dashboard>({
    current_quota: 0,
    used_quota: 0,
    topup_quota: 0,
    gift_quota: 0,
    tpm: 0,
    rpm: 0,
    quota_pm: 0,
    request_pd: 0,
    used_pd: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status !== 'authenticated') return;

    const fetchDashboard = async () => {
      try {
        setLoading(true);
        const userApi = isAdmin(userRole)
          ? '/api/dashboard'
          : '/api/dashboard/self';

        const statsApi = isAdmin(userRole)
          ? '/api/dashboard/stats'
          : '/api/dashboard/stats/self';
        const [dashboardResponse, statsResponse] = await Promise.all([
          request.get(userApi),
          request.get(statsApi)
        ]);
        const res = dashboardResponse as unknown as DashboardResult;
        const statsRes = statsResponse as unknown as DashboardStatsResult;

        if (res?.success && res?.data && statsRes?.success && statsRes?.data) {
          setDashboardData({
            ...res.data,
            hourly: statsRes?.data?.hourly || [],
            model_stats: statsRes?.data?.model_stats || [],
            user_stats: statsRes?.data?.user_stats || [],
            recharge_amount: statsRes?.data?.recharge_amount || 0,
            cached_until: statsRes?.data?.cached_until
          });
        } else {
          throw new Error(
            statsRes?.message || res?.message || 'Dashboard data unavailable'
          );
        }
      } catch (error) {
        console.error('Dashboard data fetch failed:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, [userRole, status]);

  const current = dashboardData.current_quota || 0;
  const used = dashboardData.used_quota || 0;
  const total = current + used;
  const usedRatio = total > 0 ? Math.round((used / total) * 100) : 0;
  const lowBalance = total > 0 && usedRatio >= 80;
  const balanceDisplay = compactQuota(current);

  return (
    <PageContainer scrollable>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold tracking-tight sm:text-2xl">
            {t.dashboard.welcome}
            {userName ? `, ${userName}` : ''} 👋
            <span className="ml-2 text-base font-normal text-muted-foreground">
              {t.dashboard.welcomeBack}
            </span>
          </h2>
        </div>
        <Tabs defaultValue="overview" className="space-y-4">
          <GettingStartedCard />
          <TabsList>
            <TabsTrigger value="overview">
              {t.dashboard.tabs.overview}
            </TabsTrigger>
            <TabsTrigger value="analytics">
              {t.dashboard.tabs.analytics}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 lg:gap-4">
              <Card className="min-w-0">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {t.dashboard.cards.balance.title}
                  </CardTitle>
                  <Wallet className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent className="min-w-0">
                  {loading ? (
                    <div className="space-y-3">
                      <Skeleton className="h-9 w-32" />
                      <Skeleton className="h-3 w-40" />
                    </div>
                  ) : (
                    <>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div
                              className={cn(
                                'truncate text-3xl font-semibold tabular-nums tracking-tight',
                                lowBalance &&
                                  'text-amber-600 dark:text-amber-500'
                              )}
                            >
                              {balanceDisplay.compact}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>{balanceDisplay.full}</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <p className="mt-1 truncate text-xs text-muted-foreground">
                        {t.dashboard.cards.balance.used}{' '}
                        <span className="tabular-nums text-foreground/80">
                          {renderQuota(used)}
                        </span>
                        {total > 0 && ` · ${usedRatio}%`}
                      </p>
                      {total > 0 && (
                        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                          <div
                            className={cn(
                              'h-full rounded-full transition-all',
                              lowBalance ? 'bg-amber-500' : 'bg-primary'
                            )}
                            style={{ width: `${Math.min(usedRatio, 100)}%` }}
                          />
                        </div>
                      )}
                      <Link
                        href="/dashboard/topup"
                        className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                      >
                        View billing <ArrowRight className="h-3 w-3" />
                      </Link>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Throughput card */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {t.dashboard.cards.throughput.title}
                  </CardTitle>
                  <Zap className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="space-y-3">
                      <Skeleton className="h-9 w-24" />
                      <Skeleton className="h-3 w-40" />
                    </div>
                  ) : (
                    <>
                      <div className="text-3xl font-semibold tabular-nums tracking-tight">
                        {(dashboardData.tpm || 0).toLocaleString()}
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {t.dashboard.cards.throughput.tpm}
                      </p>
                      <div className="mt-3 flex items-center gap-4 text-xs">
                        <div>
                          <span className="text-muted-foreground">
                            {t.dashboard.cards.throughput.rpm}
                          </span>{' '}
                          <span className="font-medium tabular-nums text-foreground">
                            {(dashboardData.rpm || 0).toLocaleString()}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">
                            {t.dashboard.cards.throughput.qpm}
                          </span>{' '}
                          <span className="font-medium tabular-nums text-foreground">
                            {renderQuota(dashboardData.quota_pm || 0)}
                          </span>
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Today's usage card */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {t.dashboard.cards.today.title}
                  </CardTitle>
                  <CalendarDays className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="space-y-3">
                      <Skeleton className="h-9 w-24" />
                      <Skeleton className="h-3 w-40" />
                    </div>
                  ) : (
                    <>
                      <div className="text-3xl font-semibold tabular-nums tracking-tight">
                        {(dashboardData.request_pd || 0).toLocaleString()}
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {t.dashboard.cards.today.requests}
                      </p>
                      <div className="mt-3 text-xs">
                        <span className="text-muted-foreground">
                          {t.dashboard.cards.today.spend}
                        </span>{' '}
                        <span className="font-medium tabular-nums text-foreground">
                          {renderQuota(dashboardData.used_pd || 0)}
                        </span>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-7">
              <div className="lg:col-span-4">
                <BarGraph data={dashboardData.hourly || []} />
              </div>
              <Card className="lg:col-span-3">
                <CardHeader>
                  <CardTitle>{t.dashboard.popularModels.title}</CardTitle>
                  <CardDescription>
                    {t.dashboard.popularModels.description.replace(
                      '{count}',
                      String(dashboardData.model_stats?.length || 0)
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="space-y-4">
                      {[1, 2, 3].map((i) => (
                        <div className="flex items-center" key={i}>
                          <Skeleton className="h-9 w-9 rounded-full" />
                          <div className="ml-4 space-y-1">
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-3 w-32" />
                          </div>
                          <Skeleton className="ml-auto h-4 w-16" />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <RecentSales dataList={dashboardData.model_stats || []} />
                  )}
                </CardContent>
              </Card>
            </div>
            {isAdmin(userRole) && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div className="space-y-1">
                    <CardTitle>Top customers</CardTitle>
                    <CardDescription>
                      Consumption in the last 24 hours
                    </CardDescription>
                  </div>
                  <Users className="h-5 w-5 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  {(dashboardData.user_stats || []).length ? (
                    <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-5">
                      {(dashboardData.user_stats || []).map((user, index) => (
                        <div
                          key={user.user_id}
                          className="flex min-w-0 items-center gap-3 rounded-lg border bg-muted/20 px-3 py-2.5"
                        >
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                            {index + 1}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">
                              {user.username || `User ${user.user_id}`}
                            </p>
                            <p className="text-xs tabular-nums text-muted-foreground">
                              {renderQuota(user.quota_sum)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="py-6 text-center text-sm text-muted-foreground">
                      No customer usage in the last 24 hours
                    </p>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>
          <TabsContent value="analytics" className="space-y-4">
            <AnalyticsContent
              hourly={dashboardData.hourly || []}
              modelStats={dashboardData.model_stats || []}
            />
          </TabsContent>
        </Tabs>
      </div>
    </PageContainer>
  );
}
