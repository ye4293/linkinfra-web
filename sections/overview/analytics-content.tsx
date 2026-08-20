'use client';

import * as React from 'react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent
} from '@/components/ui/chart';
import {
  DashboardHourlyStat,
  GraphData,
  ModelStat
} from '@/lib/types/dashboard';
import { renderQuota } from '@/utils/render';

interface AnalyticsContentProps {
  hourly: DashboardHourlyStat[];
  modelStats: ModelStat[];
}

const chartConfigs: Record<
  string,
  { label: string; color: string; unit: string }
> = {
  quota: { label: 'Consumption', color: 'hsl(var(--chart-1))', unit: '$' },
  token: { label: 'Tokens', color: 'hsl(var(--chart-2))', unit: '' },
  count: { label: 'Times', color: 'hsl(var(--chart-3))', unit: '' }
};

function getQuotaPerUnit(): number {
  return parseFloat(
    (typeof window !== 'undefined' &&
      localStorage?.getItem('quota_per_unit')) ||
      '500000'
  );
}

function formatTotal(key: string, total: number): string {
  if (key === 'quota') {
    // total 已经是 / quotaPerUnit 之后的美元值，直接格式化
    return '$' + total.toFixed(2);
  }
  if (total >= 1000000) return (total / 1000000).toFixed(1) + 'M';
  if (total >= 10000) return (total / 1000).toFixed(1) + 'k';
  return total.toLocaleString();
}

export function AnalyticsContent({
  hourly,
  modelStats
}: AnalyticsContentProps) {
  const chartsData = React.useMemo<Record<string, GraphData[]>>(() => {
    const quotaPerUnit = getQuotaPerUnit();
    const toGraphData = (
      getAmount: (item: DashboardHourlyStat) => number
    ): GraphData[] =>
      hourly.map((item) => ({
        hour: new Date(item.timestamp * 1000).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit'
        }),
        timestamp: item.timestamp,
        amount: getAmount(item)
      }));
    return {
      quota: toGraphData((item) =>
        Number((item.consumption / quotaPerUnit).toFixed(3))
      ),
      token: toGraphData((item) => item.tokens),
      count: toGraphData((item) => item.times)
    };
  }, [hourly]);

  const totals = React.useMemo(() => {
    const result: Record<string, number> = {};
    for (const key of ['quota', 'token', 'count']) {
      result[key] =
        chartsData[key]?.reduce((sum, item) => sum + item.amount, 0) || 0;
    }
    return result;
  }, [chartsData]);

  // 模型排行：计算百分比
  const totalModelQuota = React.useMemo(() => {
    return modelStats?.reduce((sum, stat) => sum + stat.quota_sum, 0) || 0;
  }, [modelStats]);

  return (
    <div className="space-y-4">
      {/* 三图并排 */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {(['quota', 'token', 'count'] as const).map((key) => {
          const config = chartConfigs[key];
          const chartConfig: ChartConfig = {
            amount: { label: config.label, color: config.color }
          };
          return (
            <Card key={key}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  {config.label}
                </CardTitle>
                <p className="text-2xl font-bold">
                  {formatTotal(key, totals[key])}
                </p>
              </CardHeader>
              <CardContent className="pb-4">
                <ChartContainer
                  config={chartConfig}
                  className="h-[160px] w-full"
                >
                  <BarChart
                    data={chartsData[key]}
                    margin={{ left: 0, right: 0, top: 5, bottom: 0 }}
                  >
                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                    <XAxis
                      dataKey="hour"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={4}
                      tick={{ fontSize: 10 }}
                      interval="preserveStartEnd"
                    />
                    <YAxis hide />
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          className="w-[120px]"
                          nameKey="amount"
                          labelFormatter={(value) => String(value)}
                        />
                      }
                    />
                    <Bar
                      dataKey="amount"
                      fill={config.color}
                      radius={[2, 2, 0, 0]}
                    />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* 模型消耗排行 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">
            Model Consumption Ranking
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!modelStats?.length ? (
            <p className="text-sm text-muted-foreground">
              No model data in the last 24 hours
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8">#</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead className="text-right">Consumption</TableHead>
                  <TableHead className="hidden w-[200px] sm:table-cell">
                    Share
                  </TableHead>
                  <TableHead className="w-14 text-right sm:hidden">%</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {modelStats.map((stat, index) => {
                  const percentage =
                    totalModelQuota > 0
                      ? (stat.quota_sum / totalModelQuota) * 100
                      : 0;
                  return (
                    <TableRow key={stat.model_name}>
                      <TableCell className="font-medium">{index + 1}</TableCell>
                      <TableCell className="max-w-[120px] truncate font-mono text-sm">
                        {stat.model_name}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {renderQuota(stat.quota_sum)}
                      </TableCell>
                      {/* PC 端：进度条 + 百分比 */}
                      <TableCell className="hidden sm:table-cell">
                        <div className="flex items-center gap-2">
                          <div className="h-2 flex-1 rounded-full bg-muted">
                            <div
                              className="h-2 rounded-full bg-primary"
                              style={{ width: `${Math.min(percentage, 100)}%` }}
                            />
                          </div>
                          <span className="w-12 text-right text-xs text-muted-foreground">
                            {percentage.toFixed(1)}%
                          </span>
                        </div>
                      </TableCell>
                      {/* 手机端：只显示百分比 */}
                      <TableCell className="text-right text-xs text-muted-foreground sm:hidden">
                        {percentage.toFixed(1)}%
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
