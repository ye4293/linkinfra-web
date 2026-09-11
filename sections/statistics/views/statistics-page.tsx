'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { DateTimeRangePicker } from '@/components/datetime-range-picker';
import { DataTableSingleFilterBox } from '@/components/ui/table/data-table-single-filter-box';
import { LOG_OPTIONS } from '@/constants';
import { Search, Loader2, X, RefreshCw } from 'lucide-react';
import PageContainer from '@/components/layout/page-container';
import { Breadcrumbs } from '@/components/breadcrumbs';
import type {
  LogStatData,
  LogStatResponse,
  TimeBucket
} from '@/lib/types/log-stat';
import SummaryCards from '../components/summary-cards';
import DurationChart from '../components/duration-chart';
import LatencyChart from '../components/latency-chart';
import SpeedChart from '../components/speed-chart';
import RequestChart from '../components/request-chart';

const breadcrumbItems = [
  { title: 'Dashboard', link: '/dashboard' },
  { title: 'Statistics', link: '/dashboard/statistics' }
];

const TIME_BUCKETS: { value: TimeBucket; label: string }[] = [
  { value: '5m', label: '5m' },
  { value: '15m', label: '15m' },
  { value: '1h', label: '1h' }
];

function getTodayRange() {
  const now = new Date();
  return {
    from: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0),
    to: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)
  };
}

interface DateTimeRange {
  from: Date | undefined;
  to: Date | undefined;
}

export default function StatisticsPage() {
  const { data: session } = useSession();
  const isAdmin = [10, 100].includes(Number((session?.user as any)?.role));
  const userId = session?.user?.id;

  // Filter states
  const [modelName, setModelName] = useState('');
  const [channelId, setChannelId] = useState('');
  const [tokenName, setTokenName] = useState('');
  const [userName, setUserName] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [timeBucket, setTimeBucket] = useState<TimeBucket>('5m');
  const [dateTimeRange, setDateTimeRange] =
    useState<DateTimeRange>(getTodayRange);

  // Data states
  const [data, setData] = useState<LogStatData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const activeRequest = useRef<AbortController | null>(null);
  const [refresh, setRefresh] = useState(0);

  // Adapter for DataTableSingleFilterBox which expects nuqs-style setter
  const typeFilterSetter = useCallback(
    (value: string | ((old: string) => string | null) | null) => {
      if (typeof value === 'function') {
        setTypeFilter((prev) => value(prev) || '');
      } else {
        setTypeFilter(value || '');
      }
      return Promise.resolve(new URLSearchParams());
    },
    []
  );

  const fetchData = useCallback(
    async (controller: AbortController) => {
      if (!userId) return;
      const { signal } = controller;
      const start = dateTimeRange.from?.getTime();
      const end = dateTimeRange.to?.getTime();
      if (
        start === undefined ||
        end === undefined ||
        !Number.isFinite(start) ||
        !Number.isFinite(end)
      ) {
        setError('Select both a start and end time to view statistics.');
        setLoading(false);
        return;
      }
      if (start > end) {
        setError('Start time must be before end time.');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const apiPath = isAdmin ? '/api/log/stat' : '/api/log/stat/self';
        const params: Record<string, string> = {
          start_timestamp: String(Math.floor(start / 1000)),
          end_timestamp: String(Math.floor(end / 1000)),
          time_bucket: timeBucket
        };

        if (modelName) params.model_name = modelName;
        if (channelId && isAdmin) params.channel = channelId;
        if (tokenName) params.token_name = tokenName;
        if (userName && isAdmin) params.username = userName;
        if (typeFilter) params.type = typeFilter;

        const response = await fetch(
          `${apiPath}?${new URLSearchParams(params)}`,
          { signal, cache: 'no-store' }
        );
        if (!response.ok)
          throw new Error('Unable to load statistics. Please try again.');
        const result: LogStatResponse = await response.json();
        if (signal.aborted) return;
        if (
          !result.success ||
          !result.data?.summary ||
          !Array.isArray(result.data.timeseries)
        ) {
          throw new Error(
            result.message || 'Unable to load statistics. Please try again.'
          );
        }
        setData(result.data);
      } catch (err) {
        if (signal.aborted) return;
        setError(err instanceof Error ? err.message : 'Request failed');
      } finally {
        if (!signal.aborted) setLoading(false);
      }
    },
    [
      userId,
      isAdmin,
      dateTimeRange,
      timeBucket,
      modelName,
      channelId,
      tokenName,
      userName,
      typeFilter
    ]
  );

  // 筛选变化后自动查询；取消旧请求，避免结果在快速切换时倒退。
  useEffect(() => {
    const controller = new AbortController();
    activeRequest.current = controller;
    setData(null);
    setError(null);
    setLoading(true);
    const timer = setTimeout(() => {
      void fetchData(controller);
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [fetchData, refresh]);

  const handleSearch = () => {
    activeRequest.current?.abort();
    setRefresh((value) => value + 1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  const handleReset = () => {
    setModelName('');
    setChannelId('');
    setTokenName('');
    setUserName('');
    setTypeFilter('');
    setTimeBucket('5m');
    setDateTimeRange(getTodayRange());
    handleSearch();
  };

  // Format timeseries timestamps for chart display
  const formattedTimeseries = useMemo(() => {
    if (!data?.timeseries) return [];
    return data.timeseries.map((point) => ({
      ...point,
      time: new Date(point.timestamp * 1000).toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    }));
  }, [data?.timeseries]);

  return (
    <PageContainer scrollable>
      <div className="space-y-4">
        <Breadcrumbs items={breadcrumbItems} />
        <Separator />
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold">Performance statistics</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Request volume, reliability and response speed for the selected
              period.
            </p>
          </div>
          <Link
            href="/dashboard/log"
            className="text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            View request history & live usage →
          </Link>
        </div>

        {/* Filters */}
        <div className="space-y-3">
          {/* Row 1: Main filters + search */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <div className="relative min-w-0 flex-1 sm:min-w-[180px] sm:flex-none">
              <Input
                placeholder="Token Name..."
                value={tokenName}
                onChange={(e) => setTokenName(e.target.value)}
                onKeyDown={handleKeyDown}
                className="pr-8"
              />
              {tokenName && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setTokenName('')}
                  className="absolute right-1 top-1/2 h-6 w-6 -translate-y-1/2 p-0 hover:bg-gray-100"
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
            <div className="relative min-w-0 flex-1 sm:min-w-[180px] sm:flex-none">
              <Input
                placeholder="Model Name..."
                value={modelName}
                onChange={(e) => setModelName(e.target.value)}
                onKeyDown={handleKeyDown}
                className="pr-8"
              />
              {modelName && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setModelName('')}
                  className="absolute right-1 top-1/2 h-6 w-6 -translate-y-1/2 p-0 hover:bg-gray-100"
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
            {isAdmin && (
              <>
                <div className="relative min-w-0 flex-1 sm:min-w-[160px] sm:flex-none">
                  <Input
                    placeholder="Channel ID..."
                    value={channelId}
                    onChange={(e) => setChannelId(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="pr-8"
                  />
                  {channelId && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setChannelId('')}
                      className="absolute right-1 top-1/2 h-6 w-6 -translate-y-1/2 p-0 hover:bg-gray-100"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                <div className="relative min-w-0 flex-1 sm:min-w-[160px] sm:flex-none">
                  <Input
                    placeholder="Username..."
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="pr-8"
                  />
                  {userName && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setUserName('')}
                      className="absolute right-1 top-1/2 h-6 w-6 -translate-y-1/2 p-0 hover:bg-gray-100"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Row 2: Type, time bucket, date range, actions */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <div className="flex-shrink-0">
              <DataTableSingleFilterBox
                filterKey="type"
                title="Type"
                options={LOG_OPTIONS}
                setFilterValue={typeFilterSetter}
                filterValue={typeFilter}
              />
            </div>

            {/* Time bucket selector */}
            <div
              className="flex flex-shrink-0 items-center gap-1"
              role="group"
              aria-label="Chart interval"
            >
              <span className="mr-1 text-xs text-muted-foreground">
                Chart interval
              </span>
              {TIME_BUCKETS.map((b) => (
                <Button
                  key={b.value}
                  variant={timeBucket === b.value ? 'default' : 'outline'}
                  size="sm"
                  className="h-8 px-3 text-xs"
                  onClick={() => setTimeBucket(b.value)}
                  aria-pressed={timeBucket === b.value}
                >
                  {b.label}
                </Button>
              ))}
            </div>

            <div className="min-w-0 basis-full sm:flex-1 sm:basis-auto">
              <DateTimeRangePicker
                value={dateTimeRange}
                onValueChange={(range) =>
                  setDateTimeRange(range || { from: undefined, to: undefined })
                }
              />
            </div>

            <Button
              onClick={handleSearch}
              disabled={loading}
              className="flex-shrink-0 gap-2"
              aria-label="Apply filters"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              <span className="hidden sm:inline">
                {loading ? 'Loading...' : 'Search'}
              </span>
            </Button>

            <Button
              variant="outline"
              size="icon"
              onClick={handleSearch}
              disabled={loading}
              className="h-8 w-8 flex-shrink-0"
              title="Refresh"
              aria-label="Refresh statistics"
            >
              <RefreshCw
                className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`}
              />
            </Button>

            <Button
              variant="outline"
              onClick={handleReset}
              className="flex-shrink-0 text-xs"
            >
              Reset
            </Button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Filters update automatically. Chart interval groups requests into
          5-minute, 15-minute or hourly points; it does not change the selected
          date range. Times use your local timezone.
        </p>
        {data && (
          <p className="text-sm text-muted-foreground">
            Showing: {dateTimeRange.from?.toLocaleString()} —{' '}
            {dateTimeRange.to?.toLocaleString()}
          </p>
        )}

        {/* Error */}
        {error && (
          <div
            role="alert"
            className="flex flex-wrap items-center gap-3 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
          >
            {error}
            <Button variant="outline" size="sm" onClick={handleSearch}>
              Retry
            </Button>
          </div>
        )}

        {/* Summary Cards */}
        {loading && !data ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-lg" />
            ))}
          </div>
        ) : data?.summary ? (
          <SummaryCards summary={data.summary} />
        ) : null}

        {/* Charts */}
        {loading && !data ? (
          <div className="space-y-4">
            <Skeleton className="h-[320px] rounded-lg" />
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <Skeleton className="h-[280px] rounded-lg" />
              <Skeleton className="h-[280px] rounded-lg" />
            </div>
            <Skeleton className="h-[280px] rounded-lg" />
          </div>
        ) : formattedTimeseries.length > 0 ? (
          <div className="space-y-4">
            <DurationChart data={formattedTimeseries} />
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <LatencyChart data={formattedTimeseries} />
              <SpeedChart data={formattedTimeseries} />
            </div>
            <RequestChart data={formattedTimeseries} />
          </div>
        ) : !loading && data ? (
          <div className="flex h-[200px] items-center justify-center text-muted-foreground">
            No data available for the selected time range.
          </div>
        ) : null}
      </div>
    </PageContainer>
  );
}
