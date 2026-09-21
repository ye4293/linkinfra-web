'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowDown, ArrowUp, BarChart3 } from 'lucide-react';
import { useLocale } from '@/components/providers/locale-provider';
import { Button } from '@/components/ui/button';
import MetricsChart from '@/sections/model-plaza/components/metrics-chart';
import type { RankingsData } from '@/lib/types/rankings';

const colors = [
  '#6366f1',
  '#10b981',
  '#f59e0b',
  '#ec4899',
  '#06b6d4',
  '#8b5cf6',
  '#f97316',
  '#84cc16',
  '#3b82f6',
  '#d946ef',
  '#94a3b8'
];
type Period = 'day' | 'week' | 'month';

export default function RankingsView() {
  const { lang } = useLocale();
  const c = (zh: string, en: string) => (lang === 'zh' ? zh : en);
  const [data, setData] = useState<RankingsData | null>(null);
  const [status, setStatus] = useState('loading');
  const [attempt, setAttempt] = useState(0);
  const [period, setPeriod] = useState<Period>('week');
  const [limit, setLimit] = useState(20);

  useEffect(() => {
    const controller = new AbortController();
    setStatus('loading');
    fetch('/api/rankings', { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error('unavailable');
        return response.json();
      })
      .then((result) => {
        if (controller.signal.aborted) return;
        setData(result.success ? result.data : null);
        setStatus(result.success ? 'ready' : result.status || 'preparing');
      })
      .catch(() => {
        if (!controller.signal.aborted) setStatus('error');
      });
    return () => controller.abort();
  }, [attempt]);

  const formatTokens = (value: number) =>
    new Intl.NumberFormat('en', {
      notation: 'compact',
      maximumFractionDigits: 2
    }).format(value);

  const chart = useMemo(
    () =>
      data?.trend.dates.map((date, index) => {
        const point: Record<string, unknown> = { date };
        data.trend.series.forEach((series, seriesIndex) => {
          point[`m${seriesIndex}`] = series.tokens[index];
        });
        return point;
      }) || [],
    [data]
  );
  const board = data?.leaderboards[period];
  const stale =
    data &&
    Date.now() - Date.parse(`${data.data_through}T00:00:00Z`) >
      2 * 86400000 + 3600000;

  const renderChange = (change: number | null, complete: boolean) => (
    <span
      title={
        !complete
          ? c(
              '历史数据不足，暂不计算环比',
              'Not enough history to compare periods'
            )
          : change === null
          ? c('上期无用量', 'No usage in the previous period')
          : undefined
      }
      className={`flex items-center justify-end gap-0.5 text-xs tabular-nums ${
        change !== null && change > 0
          ? 'text-emerald-600 dark:text-emerald-400'
          : 'text-muted-foreground'
      }`}
    >
      {change === null ? (
        '—'
      ) : (
        <>
          {change > 0 ? (
            <ArrowUp className="h-3 w-3 shrink-0" />
          ) : change < 0 ? (
            <ArrowDown className="h-3 w-3 shrink-0" />
          ) : null}
          {Math.abs(change) > 999 ? '>999' : Math.abs(change).toFixed(1)}%
        </>
      )}
    </span>
  );

  return (
    <main className="mx-auto w-full max-w-6xl space-y-10 px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <header className="space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <BarChart3 className="h-4 w-4" />
          {c('平台用量', 'Platform usage')}
        </div>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          {c('模型排行榜', 'Model rankings')}
        </h1>
        <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
          {c(
            '看看大家正在使用哪些模型。按平台记录的输入与输出 Token 总量排名，每天更新。',
            'Discover the models people are using. Ranked by recorded input and output tokens on this platform, updated daily.'
          )}
        </p>
        {data && (
          <p className="text-xs text-muted-foreground">
            {c('数据截至', 'Data through')}{' '}
            <span className="font-medium text-foreground">
              {data.data_through}
            </span>{' '}
            · UTC
            {stale && (
              <span className="ml-2 text-amber-600 dark:text-amber-400">
                {c(
                  '数据更新延迟，当前展示最近可用结果',
                  'Update delayed; showing the latest available results'
                )}
              </span>
            )}
          </p>
        )}
      </header>

      {!data ? (
        <div
          role="status"
          aria-live="polite"
          className="rounded-xl border border-dashed px-6 py-20 text-center"
        >
          <p className="text-sm text-muted-foreground">
            {status === 'loading'
              ? c('正在加载排行榜…', 'Loading rankings…')
              : status === 'error'
              ? c('暂时无法加载排行榜。', 'Rankings could not be loaded.')
              : status === 'disabled' || status === 'paused'
              ? c('排行榜暂时暂停更新。', 'Rankings are currently paused.')
              : c(
                  '排名数据准备中，将在首个完整统计日结束后展示。',
                  'Rankings will appear after the first complete day of collection.'
                )}
          </p>
          {status === 'error' && (
            <Button
              variant="outline"
              className="mt-5"
              onClick={() => setAttempt((value) => value + 1)}
            >
              {c('重新加载', 'Try again')}
            </Button>
          )}
        </div>
      ) : (
        <>
          <section aria-labelledby="ranking-trend-title" className="space-y-5">
            <div>
              <h2 id="ranking-trend-title" className="text-xl font-semibold">
                Top Models
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {c(
                  '最近 30 天的每日 Token 用量 · 前十模型与其他模型',
                  'Daily token usage over the last 30 days · Top 10 models and Others'
                )}
              </p>
            </div>
            {data.leaderboards.month.total_tokens > 0 ? (
              <div className="rounded-xl border p-3 sm:p-6">
                <MetricsChart
                  type="area"
                  data={chart}
                  dataKeys={data.trend.series.map((series, index) => ({
                    key: `m${index}`,
                    label:
                      series.model === 'Others'
                        ? c('其他模型', 'Others')
                        : series.model,
                    color: colors[index % colors.length],
                    stacked: true
                  }))}
                  xAxisKey="date"
                  xAxisFormatter={(value) => value.slice(5)}
                  yAxisFormatter={formatTokens}
                  height={300}
                />
                <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
                  {data.trend.series.map((series, index) => (
                    <span
                      key={series.model}
                      className="flex min-w-0 items-center gap-2"
                    >
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{
                          backgroundColor: colors[index % colors.length]
                        }}
                      />
                      <span className="break-all">
                        {series.model === 'Others'
                          ? c('其他模型', 'Others')
                          : series.model}
                      </span>
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <p className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
                {c(
                  '该统计区间暂无文本模型用量。',
                  'No text model usage in this period.'
                )}
              </p>
            )}
          </section>

          {board && (
            <section aria-labelledby="leaderboard-title" className="space-y-5">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <h2 id="leaderboard-title" className="text-xl font-semibold">
                    {c('模型用量排名', 'Leaderboard')}
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {formatTokens(board.total_tokens)} tokens ·{' '}
                    {c('按用量排序', 'Ranked by usage')}
                  </p>
                </div>
                <div
                  role="group"
                  aria-label={c('统计周期', 'Ranking period')}
                  className="flex gap-1 rounded-lg bg-muted p-1"
                >
                  {(['day', 'week', 'month'] as Period[]).map((value) => (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={value === period}
                      onClick={() => {
                        setPeriod(value);
                        setLimit(20);
                      }}
                      className={`rounded-md px-4 py-2 text-xs font-medium transition-colors sm:text-sm ${
                        value === period
                          ? 'bg-background text-foreground shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {value === 'day'
                        ? c('近 1 天', '1 day')
                        : value === 'week'
                        ? c('近 7 天', '7 days')
                        : c('近 30 天', '30 days')}
                    </button>
                  ))}
                </div>
              </div>
              {!board.window_complete && (
                <p className="text-xs text-muted-foreground">
                  {c('统计始于', 'Collection started on')} {data.coverage_start}
                  {c(
                    '，当前展示已收集的数据。',
                    '; showing the available days.'
                  )}
                </p>
              )}
              <div className="overflow-hidden rounded-xl border">
                <div className="grid grid-cols-[20px_minmax(0,1fr)_76px] gap-2 border-b bg-muted/40 px-3 py-3 text-xs text-muted-foreground sm:grid-cols-[36px_minmax(0,1fr)_110px_80px_100px] sm:gap-4 sm:px-5">
                  <span>#</span>
                  <span>{c('模型', 'Model')}</span>
                  <span className="text-right">Tokens</span>
                  <span className="hidden text-right sm:block">
                    {c('占比', 'Share')}
                  </span>
                  <span className="hidden text-right sm:block">
                    {c('较上期', 'Change')}
                  </span>
                </div>
                {board.entries.slice(0, limit).map((entry, index) => (
                  <div
                    key={entry.model}
                    className="grid grid-cols-[20px_minmax(0,1fr)_76px] items-center gap-2 border-b px-3 py-4 text-sm last:border-0 sm:grid-cols-[36px_minmax(0,1fr)_110px_80px_100px] sm:gap-4 sm:px-5"
                  >
                    <span className="tabular-nums text-muted-foreground">
                      {index + 1}
                    </span>
                    <div className="min-w-0">
                      <Link
                        href={`/model-plaza/${encodeURIComponent(entry.model)}`}
                        className="break-words font-medium hover:underline"
                      >
                        {entry.model}
                      </Link>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {entry.author}
                      </p>
                    </div>
                    <div className="text-right">
                      <span
                        title={entry.tokens.toLocaleString()}
                        className="font-medium tabular-nums"
                      >
                        {formatTokens(entry.tokens)}
                      </span>
                      <div className="mt-1 sm:hidden">
                        {renderChange(
                          entry.change_percent,
                          board.comparison_complete
                        )}
                      </div>
                    </div>
                    <span className="hidden text-right tabular-nums text-muted-foreground sm:block">
                      {(entry.share * 100).toFixed(1)}%
                    </span>
                    <div className="hidden sm:block">
                      {renderChange(
                        entry.change_percent,
                        board.comparison_complete
                      )}
                    </div>
                  </div>
                ))}
                {board.entries.length === 0 && (
                  <p className="p-10 text-center text-sm text-muted-foreground">
                    {c('该区间暂无用量。', 'No usage in this period.')}
                  </p>
                )}
              </div>
              {board.entries.length > limit && (
                <div className="text-center">
                  <Button
                    variant="outline"
                    onClick={() => setLimit((value) => value + 30)}
                  >
                    {c('显示更多', 'Show more')}
                  </Button>
                </div>
              )}
            </section>
          )}

          <aside className="space-y-2 border-t pt-6 text-xs leading-6 text-muted-foreground">
            <p>
              {c(
                '统计口径：完整 UTC 自然日的文本模型用量，包含已记录的缓存输入和推理输出。同模型不同服务来源合并统计；按次计量的图片与视频不计入。',
                'Methodology: text model usage for complete UTC days, including recorded cached input and reasoning output. Usage of the same model is combined across providers. Image and video counts are excluded.'
              )}
            </p>
            <p>
              {c(
                '榜单反映本站使用量，不代表模型能力或整个市场份额。环比对比前一个等长区间；历史不足或上期无用量时显示 —。',
                'Rankings describe usage on this platform, not model quality or the overall market. Changes compare consecutive periods of equal length; — indicates insufficient history or no previous usage.'
              )}
            </p>
          </aside>
        </>
      )}
    </main>
  );
}
