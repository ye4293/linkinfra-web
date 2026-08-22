'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Activity, Coins, Gauge } from 'lucide-react';
import request from '@/app/lib/clientFetch';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { DashboardResult } from '@/lib/types/dashboard';
import { renderQuota } from '@/utils/render';

const isAdmin = (role: unknown) => [10, 100].includes(Number(role));

export default function UsageSummary() {
  const { data: session, status } = useSession();
  const [metrics, setMetrics] = useState({ rpm: 0, tpm: 0, used_pd: 0 });
  const [loading, setLoading] = useState(true);

  const loadMetrics = useCallback(async () => {
    if (status !== 'authenticated') return;
    try {
      const endpoint = isAdmin(session?.user?.role)
        ? '/api/dashboard'
        : '/api/dashboard/self';
      const response = (await request.get(
        endpoint
      )) as unknown as DashboardResult;
      if (response?.success && response.data) {
        setMetrics({
          rpm: response.data.rpm || 0,
          tpm: response.data.tpm || 0,
          used_pd: response.data.used_pd || 0
        });
      }
    } catch (error) {
      console.error('Failed to load usage summary:', error);
    } finally {
      setLoading(false);
    }
  }, [session?.user?.role, status]);

  useEffect(() => {
    loadMetrics();
    const timer = window.setInterval(loadMetrics, 30000);
    return () => window.clearInterval(timer);
  }, [loadMetrics]);

  const cards = [
    {
      title: 'RPM',
      value: metrics.rpm.toLocaleString(),
      description: 'Requests in the last 60 seconds',
      icon: Gauge
    },
    {
      title: 'TPM',
      value: metrics.tpm.toLocaleString(),
      description: 'Tokens in the last 60 seconds',
      icon: Activity
    },
    {
      title: "Today's Spend",
      value: renderQuota(metrics.used_pd),
      description: 'From 00:00 to now',
      icon: Coins
    }
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card key={card.title}>
            <CardContent className="flex items-start justify-between p-4">
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  {card.title}
                </p>
                {loading ? (
                  <Skeleton className="mt-2 h-8 w-24" />
                ) : (
                  <p className="mt-1 text-2xl font-bold tabular-nums tracking-tight">
                    {card.value}
                  </p>
                )}
                <p className="mt-1 text-xs text-muted-foreground">
                  {card.description}
                </p>
              </div>
              <Icon className="h-4 w-4 text-muted-foreground" />
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
