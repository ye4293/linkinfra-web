'use client';

import { useEffect, useState } from 'react';
import { badgeVariants } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Plus, Settings2 } from 'lucide-react';
import Link from 'next/link';
import { useLocale } from '@/components/providers/locale-provider';

export default function ChannelPageHeader({
  total,
  canEditSettings
}: {
  total: number;
  canEditSettings: boolean;
}) {
  const { t } = useLocale();
  const [retryTimes, setRetryTimes] = useState<number | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const loadRetryTimes = async () => {
      try {
        const response = await fetch('/api/channel/ops', {
          signal: controller.signal,
          cache: 'no-store'
        });
        if (!response.ok) return;
        const result = await response.json();
        const value = result.data?.retry_times;
        if (result.success && Number.isInteger(value) && value >= 0) {
          setRetryTimes(value);
        }
      } catch {
        // The channel list remains usable if operational settings are unavailable.
      }
    };
    void loadRetryTimes();
    return () => controller.abort();
  }, []);

  const settingsLinkClass = cn(
    badgeVariants({ variant: 'outline' }),
    'shrink-0 gap-1.5 rounded-full hover:bg-accent'
  );

  return (
    <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-3xl font-bold tracking-tight">
            {t.channelPage.title} ({total})
          </h2>
          {canEditSettings ? (
            <>
              <Link
                href="/dashboard/setting#retry-count"
                className={settingsLinkClass}
                title={t.channelPage.retrySettings}
              >
                {t.channelPage.maxRetries}: {retryTimes ?? '—'}
                <Settings2 className="h-3 w-3" aria-hidden="true" />
              </Link>
              <Link
                href="/dashboard/setting#retry-keywords"
                className={settingsLinkClass}
              >
                {t.channelPage.retryKeywords}
                <Settings2 className="h-3 w-3" aria-hidden="true" />
              </Link>
            </>
          ) : retryTimes !== null ? (
            <span
              className={cn(
                badgeVariants({ variant: 'outline' }),
                'rounded-full'
              )}
            >
              {t.channelPage.maxRetries}: {retryTimes}
            </span>
          ) : null}
        </div>
        <p className="text-sm text-muted-foreground">
          {t.channelPage.description}
        </p>
      </div>
      <Link
        href="/dashboard/channel/create"
        className={cn(buttonVariants({ variant: 'default' }), 'shrink-0')}
      >
        <Plus className="mr-2 h-4 w-4" /> {t.channelPage.addNew}
      </Link>
    </div>
  );
}
