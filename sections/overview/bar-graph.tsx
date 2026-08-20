'use client';

import * as React from 'react';
import { Bar, BarChart, CartesianGrid, XAxis } from 'recharts';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent
} from '@/components/ui/chart';
import { DashboardHourlyStat, GraphData } from '@/lib/types/dashboard';

interface BarGraphProps {
  data: DashboardHourlyStat[];
}

const chartConfig = {
  quota: { label: 'Consumption', color: 'hsl(var(--chart-1))' },
  token: { label: 'Tokens', color: 'hsl(var(--chart-2))' },
  count: { label: 'Times', color: 'hsl(var(--chart-3))' }
} satisfies ChartConfig;

export function BarGraph({ data }: BarGraphProps) {
  const [activeChart, setActiveChart] =
    React.useState<keyof typeof chartConfig>('quota');

  const graphData = React.useMemo<GraphData[]>(() => {
    const quotaPerUnit = parseFloat(
      (typeof window !== 'undefined' &&
        localStorage?.getItem('quota_per_unit')) ||
        '500000'
    );
    return data.map((item) => {
      const amount =
        activeChart === 'quota'
          ? item.consumption
          : activeChart === 'token'
          ? item.tokens
          : item.times;
      return {
        hour: new Date(item.timestamp * 1000).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit'
        }),
        timestamp: item.timestamp,
        amount:
          activeChart === 'quota'
            ? Number((amount / quotaPerUnit).toFixed(3))
            : amount
      };
    });
  }, [activeChart, data]);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-col items-stretch space-y-0 border-b p-0 lg:flex-row">
        <div className="flex flex-1 flex-col justify-center gap-1 px-4 py-4 sm:px-6 sm:py-5">
          <CardTitle>Data Analysis</CardTitle>
          <CardDescription>Showing usage for the last 24 hours</CardDescription>
        </div>
        <div className="grid grid-cols-3 lg:flex">
          {(Object.keys(chartConfig) as (keyof typeof chartConfig)[]).map(
            (chart) => (
              <button
                key={chart}
                data-active={activeChart === chart}
                className="relative flex min-w-0 flex-1 justify-center border-t px-3 py-3 text-center data-[active=true]:bg-muted/60 data-[active=true]:text-foreground lg:min-w-28 lg:items-center lg:border-t-0 lg:px-5 lg:py-5 [&:not(:first-child)]:border-l"
                onClick={() => setActiveChart(chart)}
              >
                <span className="text-xs text-muted-foreground">
                  {chartConfig[chart].label}
                </span>
              </button>
            )
          )}
        </div>
      </CardHeader>
      <CardContent className="px-2 sm:p-6">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[230px] w-full sm:h-[280px]"
        >
          <BarChart
            accessibilityLayer
            data={graphData}
            margin={{ left: 12, right: 12 }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="hour"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tick={{ fontSize: 11 }}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent className="w-[150px]" nameKey="amount" />
              }
            />
            <Bar dataKey="amount" fill={`var(--color-${activeChart})`} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
