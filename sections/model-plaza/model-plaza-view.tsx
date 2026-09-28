'use client';
import { useText } from '@/components/locale-text';
import { DurationPrice } from '@/components/duration-price';
import {
  modelPrices,
  modelEntryKey,
  modelDetailHref,
  fetchCatalog,
  matchesModel
} from '@/components/landing/catalog';

import { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  parseAsString,
  parseAsStringLiteral,
  parseAsInteger,
  parseAsNumberLiteral,
  useQueryStates
} from 'nuqs';
import type { Locale } from '@/locales';
import s from './model-plaza.module.css';
import { SHOW_PUBLIC_USER_TIERS } from '@/lib/public-navigation';
import { useLocale } from '@/components/providers/locale-provider';
import { useDocumentTitle } from '@/hooks/use-document-title';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Search,
  LayoutGrid,
  Table,
  Copy,
  Check,
  Zap,
  Hash,
  ChevronLeft,
  ChevronRight,
  Clock,
  Layers3,
  ArrowUpRight,
  RotateCcw
} from 'lucide-react';
import type { ModelPlazaItem, GroupConfigItem } from '@/lib/types/model-plaza';
import type { ModelMetricsMini } from '@/lib/types/model-metrics';
import StatusBadge from './components/status-badge';
import ProviderLogo from './components/provider-logo';
import { get } from '@/app/lib/clientFetch';

function formatPrice(price: number): string {
  if (price === 0) return '$0';
  if (price < 0.001) return `$${price.toFixed(6)}`;
  if (price < 0.01) return `$${price.toFixed(4)}`;
  if (price < 1) return `$${price.toFixed(4)}`;
  return `$${price.toFixed(2)}`;
}

// --- 复制按钮 ---
function CopyButton({ text, title }: { text: string; title: string }) {
  const [copied, setCopied] = useState(false);
  const { lang } = useLocale();
  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);
  const handleCopy = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      toast.error(
        lang === 'zh' ? '复制失败，请重试' : 'Could not copy. Please try again.'
      );
    }
  };
  return (
    <button
      type="button"
      aria-label={title}
      onClick={handleCopy}
      className="relative z-10 ml-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary"
      title={title}
    >
      {copied ? (
        <Check className="h-3 w-3 text-green-500" />
      ) : (
        <Copy className="h-3 w-3 text-muted-foreground" />
      )}
    </button>
  );
}

// --- 模型卡片 ---
function ModelPriceCard({
  model,
  selectedGroup,
  t,
  metrics,
  href
}: {
  model: ModelPlazaItem;
  selectedGroup: string;
  t: Locale;
  metrics?: ModelMetricsMini;
  href: string;
}) {
  const tr = useText();
  const { lang } = useLocale();
  const prices = modelPrices(model, selectedGroup);
  const discountPercent = Number(((1 - prices.discount) * 100).toFixed(2));
  const hasDiscount = prices.discount < 1;
  const finalInputPrice = prices.input;
  const finalOutputPrice = prices.output;
  const finalFixedPrice = prices.fixed;

  return (
    <Card className="group relative flex min-h-[190px] flex-col border border-border/70 bg-card shadow-none transition-all focus-within:ring-2 focus-within:ring-primary hover:border-primary/40 hover:shadow-md">
      {/* 顶部区域 */}
      <div className="flex flex-wrap items-start justify-between gap-y-2 p-5 pb-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1">
            <h3 className="min-w-0 flex-1 break-words text-sm font-semibold leading-6">
              <Link
                href={href}
                prefetch={false}
                className="after:absolute after:inset-0 after:rounded-xl focus-visible:outline-none"
              >
                {model.model_name}
              </Link>
            </h3>
            <CopyButton
              text={model.model_name}
              title={t.modelPlaza.copyModel}
            />
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <ProviderLogo provider={model.provider} />
            <Badge
              variant="secondary"
              className="gap-0.5 text-[10px] leading-none"
            >
              {model.price_type === 'duration' ? (
                <>
                  <Clock className="h-2.5 w-2.5" />
                  {t.durationPricing.perDuration}
                </>
              ) : model.price_type === 'fixed' ? (
                <>
                  <Hash className="h-2.5 w-2.5" />
                  {t.modelPlaza.perCallShort}
                </>
              ) : (
                <>
                  <Zap className="h-2.5 w-2.5" />
                  {t.modelPlaza.tokenBasedShort}
                </>
              )}
            </Badge>
          </div>
        </div>
        <div className="ml-2 flex shrink-0 items-center gap-1.5">
          {metrics && <StatusBadge status={metrics.status} />}
          {hasDiscount && (
            <span className="inline-flex items-center rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-bold leading-none text-emerald-700 ring-1 ring-inset ring-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/30">
              {discountPercent}% OFF
            </span>
          )}
        </div>
      </div>

      {metrics &&
        Number.isFinite(metrics.total_requests_24h) &&
        metrics.total_requests_24h >= 0 && (
          <p className="px-4 pb-2 text-xs text-muted-foreground">
            {tr('Requests in the last 24 hours')}:{' '}
            {metrics.total_requests_24h.toLocaleString()}
            {' · '}
            {lang === 'zh'
              ? '当前来源全部渠道 · 上游调用'
              : 'All channels for this source · upstream calls'}
          </p>
        )}
      {/* 价格区域 */}
      <div className="mt-auto border-t border-border/60 px-5 py-4">
        {model.price_type === 'duration' ? (
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground">
              {t.durationPricing.price}
            </span>
            <div className="text-lg font-bold tabular-nums">
              {hasDiscount && (
                <span className="mr-2 text-xs font-normal text-muted-foreground/70 line-through">
                  <DurationPrice value={model.base_duration_price_per_minute} />
                </span>
              )}
              <DurationPrice value={prices.duration} />
            </div>
          </div>
        ) : model.price_type === 'fixed' ? (
          <div className="flex items-baseline justify-between">
            <span className="text-xs text-muted-foreground">
              {t.modelPlaza.perUnit}
            </span>
            <div className="flex items-baseline gap-1.5">
              {hasDiscount && (
                <span className="text-xs text-muted-foreground/70 line-through">
                  {formatPrice(model.base_fixed_price)}
                </span>
              )}
              <span className="text-lg font-bold tabular-nums tracking-tight text-foreground">
                {formatPrice(finalFixedPrice)}
              </span>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                {t.modelPlaza.input}
              </span>
              <div className="mt-1 flex items-baseline gap-1">
                {hasDiscount && (
                  <span className="text-[10px] text-muted-foreground/70 line-through">
                    {formatPrice(model.base_input_price)}
                  </span>
                )}
                <span className="text-base font-bold tabular-nums tracking-tight text-foreground">
                  {formatPrice(finalInputPrice)}
                  <span className="ml-0.5 text-[10px] font-normal text-muted-foreground">
                    /M
                  </span>
                </span>
              </div>
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                {t.modelPlaza.output}
              </span>
              <div className="mt-1 flex items-baseline gap-1">
                {hasDiscount && (
                  <span className="text-[10px] text-muted-foreground/70 line-through">
                    {formatPrice(model.base_output_price)}
                  </span>
                )}
                <span className="text-base font-bold tabular-nums tracking-tight text-foreground">
                  {formatPrice(finalOutputPrice)}
                  <span className="ml-0.5 text-[10px] font-normal text-muted-foreground">
                    /M
                  </span>
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 监控指标 mini */}
      {metrics && metrics.status !== 'no_data' && (
        <div className="flex items-center justify-between border-t border-border/30 px-4 py-1.5 text-[10px] text-muted-foreground">
          <span>
            {metrics.avg_latency == null
              ? '—'
              : `${metrics.avg_latency.toFixed(1)}s`}{' '}
            {tr('Latency')}
          </span>
          <span>
            {metrics.avg_speed == null
              ? '—'
              : `${metrics.avg_speed.toFixed(0)} t/s`}
          </span>
        </div>
      )}
    </Card>
  );
}

// --- 主视图 ---
export default function ModelPlazaView() {
  const tr = useText();
  const { t, lang } = useLocale();
  const c = (zh: string, en: string) => (lang === 'zh' ? zh : en);
  useDocumentTitle(t.modelPlaza.title);
  const [catalogModels, setCatalogModels] = useState<ModelPlazaItem[]>([]);
  const [groups, setGroups] = useState<GroupConfigItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  const resultsRef = useRef<HTMLDivElement>(null);
  const [metricsMap, setMetricsMap] = useState<
    Record<string, ModelMetricsMini>
  >({});

  const [filters, setFilters] = useQueryStates(
    {
      q: parseAsString.withDefault(''),
      provider: parseAsString.withDefault(''),
      billing: parseAsStringLiteral([
        '',
        'ratio',
        'fixed',
        'duration'
      ] as const).withDefault(''),
      group: parseAsString.withDefault(''),
      page: parseAsInteger.withDefault(1),
      size: parseAsNumberLiteral([12, 24, 48] as const).withDefault(24),
      view: parseAsStringLiteral(['card', 'table'] as const).withDefault('card')
    },
    { shallow: true, history: 'replace', scroll: false, clearOnDefault: true }
  );
  const {
    q: keyword,
    provider: selectedProvider,
    billing: selectedPriceType,
    size: pageSize,
    view: viewMode
  } = filters;
  const selectedGroup = groups.some((g) => g.group_key === filters.group)
    ? filters.group
    : groups[0]?.group_key || '';
  const setPage = (page: number) => {
    void setFilters({ page });
    resultsRef.current?.scrollIntoView({ block: 'start' });
  };
  const resetFilters = () =>
    void setFilters({ q: '', provider: '', billing: '', page: 1 });
  const hasFilters = Boolean(keyword || selectedProvider || selectedPriceType);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    const fetchData = async () => {
      setLoading(true);
      setError(false);
      try {
        const data = await fetchCatalog(controller.signal);
        if (!active) return;
        setCatalogModels(data.models);
        setGroups(data.groups);
      } catch (err) {
        if (active) {
          setError(true);
          setCatalogModels([]);
        }
      } finally {
        if (active) setLoading(false);
      }
    };
    fetchData();
    return () => {
      active = false;
      controller.abort();
    };
  }, [retry]);

  const filteredModels = useMemo(
    () =>
      catalogModels.filter(
        (model) =>
          (!selectedProvider || model.provider === selectedProvider) &&
          (!selectedPriceType || model.price_type === selectedPriceType) &&
          matchesModel(model, keyword)
      ),
    [catalogModels, keyword, selectedProvider, selectedPriceType]
  );
  const total = filteredModels.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.max(1, Math.min(filters.page, totalPages));
  const models = filteredModels.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
    if (!loading && !error && filters.page !== page) void setFilters({ page });
  }, [loading, error, filters.page, page, setFilters]);

  const providers = useMemo(() => {
    const counts = new Map<string, number>();
    for (const model of catalogModels) {
      if (!selectedPriceType || model.price_type === selectedPriceType) {
        counts.set(model.provider, (counts.get(model.provider) || 0) + 1);
      }
    }
    return Array.from(counts, ([name, count]) => ({ name, count })).sort(
      (a, b) => a.name.localeCompare(b.name)
    );
  }, [catalogModels, selectedPriceType]);
  const billingOptions = [
    { value: '', label: c('全部模型', 'All models'), icon: Layers3 },
    { value: 'ratio', label: t.modelPlaza.tokenBased, icon: Zap },
    { value: 'fixed', label: t.modelPlaza.perCall, icon: Hash },
    { value: 'duration', label: t.durationPricing.perDuration, icon: Clock }
  ] as const;
  const returnParams = new URLSearchParams({ lang });
  Object.entries({ ...filters, page }).forEach(([key, value]) => {
    if (value !== '') returnParams.set(key, String(value));
  });
  const returnTo = `/model-plaza?${returnParams}`;
  const detailHref = (model: ModelPlazaItem) => {
    const href = modelDetailHref(model);
    return `${href}${
      href.includes('?') ? '&' : '?'
    }returnTo=${encodeURIComponent(returnTo)}`;
  };

  // 获取模型监控迷你摘要
  useEffect(() => {
    get<any>('/api/model-plaza/metrics/all')
      .then((res: any) => {
        if (res?.success && res.data) {
          setMetricsMap(
            Array.isArray(res.data)
              ? Object.fromEntries(
                  res.data.map((item: any) => [
                    JSON.stringify([item.source_key, item.model_name]),
                    {
                      ...item,
                      status:
                        Date.now() / 1000 - item.as_of > 900
                          ? 'no_data'
                          : item.status,
                      total_requests_24h: item.total_requests
                    }
                  ])
                )
              : res.data
          );
        }
      })
      .catch(() => {});
  }, []);

  return (
    <main className={s.page}>
      <header className={s.heading}>
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-primary">
            {c('探索与接入', 'Explore & build')}
          </p>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            {t.modelPlaza.title}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {c(
              '按计费方式发现模型，比较价格，选择适合你的服务。',
              'Discover models by billing type, compare prices, and find your next API.'
            )}
          </p>
        </div>
        <Link
          href="/docs"
          className="inline-flex shrink-0 items-center gap-1.5 text-sm text-muted-foreground hover:text-primary"
        >
          {c('接入文档', 'API documentation')}
          <ArrowUpRight className="h-4 w-4" />
        </Link>
      </header>
      <div className={s.filters}>
        <div
          className={s.billing}
          role="group"
          aria-label={t.modelPlaza.billingType}
        >
          {billingOptions.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              aria-pressed={selectedPriceType === value}
              onClick={() => {
                const providerAvailable = catalogModels.some(
                  (m) =>
                    m.provider === selectedProvider &&
                    (!value || m.price_type === value)
                );
                void setFilters({
                  billing: value,
                  provider: providerAvailable ? selectedProvider : '',
                  page: 1
                });
              }}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{label}</span>
              <span className={s.count}>
                {loading
                  ? '—'
                  : catalogModels.filter(
                      (m) => !value || m.price_type === value
                    ).length}
              </span>
            </button>
          ))}
        </div>
        <div className={s.toolbar}>
          <div className={s.search}>
            <Search className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={t.modelPlaza.search}
              value={keyword}
              onChange={(event) =>
                void setFilters({ q: event.target.value, page: 1 })
              }
              className="h-10 bg-background pl-9"
              aria-label={t.modelPlaza.search}
            />
          </div>
          <label className={s.provider}>
            <span>{t.modelPlaza.provider}</span>
            <select
              aria-label={t.modelPlaza.provider}
              value={selectedProvider}
              disabled={loading || error}
              onChange={(event) =>
                void setFilters({ provider: event.target.value, page: 1 })
              }
            >
              <option value="">{c('全部供应商', 'All providers')}</option>
              {selectedProvider &&
                !providers.some((p) => p.name === selectedProvider) && (
                  <option value={selectedProvider}>{selectedProvider}</option>
                )}
              {providers.map((p) => (
                <option key={p.name} value={p.name}>
                  {p.name === 'Zhipu' ? 'Z.ai' : p.name} ({p.count})
                </option>
              ))}
            </select>
          </label>
          <div
            className={s.viewToggle}
            role="group"
            aria-label={c('显示方式', 'Display mode')}
          >
            <button
              type="button"
              onClick={() => void setFilters({ view: 'card' })}
              aria-label={tr('Card view')}
              title={tr('Card view')}
              aria-pressed={viewMode === 'card'}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => void setFilters({ view: 'table' })}
              aria-label={tr('Table view')}
              title={tr('Table view')}
              aria-pressed={viewMode === 'table'}
            >
              <Table className="h-4 w-4" />
            </button>
          </div>
        </div>
        {SHOW_PUBLIC_USER_TIERS && groups.length > 0 && (
          <label className={s.tier}>
            {t.modelPlaza.userTier}
            <select
              value={selectedGroup}
              onChange={(event) =>
                void setFilters({ group: event.target.value })
              }
            >
              {groups.map((g) => (
                <option key={g.group_key} value={g.group_key}>
                  {g.display_name}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      <div ref={resultsRef} className={s.resultsHeading}>
        <p aria-live="polite" className="text-sm font-medium">
          {loading
            ? c('正在加载模型…', 'Loading models…')
            : error
            ? c('模型暂不可用', 'Models unavailable')
            : c(`找到 ${total} 个模型`, `${total} models found`)}
        </p>
        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={resetFilters}
            className="gap-1.5"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            {c('重置筛选', 'Reset filters')}
          </Button>
        )}
        <p className={s.billingNote}>
          {selectedPriceType === 'ratio'
            ? c(
                '价格单位：美元 / 百万 Token',
                'Prices in USD per million tokens'
              )
            : selectedPriceType === 'fixed'
            ? c('价格单位：美元 / 次请求', 'Prices in USD per request')
            : selectedPriceType === 'duration'
            ? c('价格单位：美元 / 分钟', 'Prices in USD per minute')
            : c(
                '价格以美元计；/M 表示每百万 Token',
                'Prices in USD; /M means per million tokens'
              )}
        </p>
      </div>
      {/* 内容区 */}
      <div className={s.results} aria-busy={loading}>
        {loading ? (
          <div className={s.grid}>
            {Array.from({ length: pageSize }).map((_, i) => (
              <Card key={i} className="min-h-[190px] overflow-hidden">
                <div className="p-4">
                  <Skeleton className="mb-2 h-4 w-3/4" />
                  <Skeleton className="h-5 w-1/3" />
                </div>
                <div className="border-t border-border/60 p-4">
                  <Skeleton className="h-5 w-full" />
                </div>
              </Card>
            ))}
          </div>
        ) : error || models.length === 0 ? null : viewMode === 'card' ? (
          <div className={s.grid}>
            {models.map((model) => (
              <ModelPriceCard
                key={modelEntryKey(model)}
                model={model}
                selectedGroup={selectedGroup}
                t={t}
                metrics={metricsMap[modelEntryKey(model)]}
                href={detailHref(model)}
              />
            ))}
          </div>
        ) : (
          <div className={s.tableWrap}>
            <table className={s.table}>
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {t.modelPlaza.modelName}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {t.modelPlaza.provider}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {t.modelPlaza.billingType}
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {tr('Input / unit price')}
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {t.modelPlaza.outputPrice}
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {t.modelPlaza.discount}
                  </th>
                </tr>
              </thead>
              <tbody>
                {models.map((model) => {
                  const prices = modelPrices(model, selectedGroup);
                  const discountPercent = Number(
                    ((1 - prices.discount) * 100).toFixed(2)
                  );
                  const hasDiscount = prices.discount < 1;

                  return (
                    <tr
                      key={modelEntryKey(model)}
                      className="group border-b transition-colors hover:bg-muted/30"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <Link
                            href={detailHref(model)}
                            prefetch={false}
                            className="break-words font-medium hover:text-primary hover:underline focus-visible:ring-2 focus-visible:ring-primary"
                          >
                            {model.model_name}
                          </Link>
                          <CopyButton
                            text={model.model_name}
                            title={t.modelPlaza.copyModel}
                          />
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <ProviderLogo provider={model.provider} />
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {model.price_type === 'duration'
                          ? t.durationPricing.perDuration
                          : model.price_type === 'fixed'
                          ? t.modelPlaza.perCallShort
                          : t.modelPlaza.tokenBasedShort}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {model.price_type === 'duration' ? (
                          <span>
                            {hasDiscount && (
                              <span className="mr-2 text-muted-foreground/60 line-through">
                                <DurationPrice
                                  value={model.base_duration_price_per_minute}
                                />
                              </span>
                            )}
                            <DurationPrice value={prices.duration} />
                          </span>
                        ) : model.price_type === 'fixed' ? (
                          <span>
                            {hasDiscount && (
                              <span className="mr-1.5 text-muted-foreground/60 line-through">
                                {formatPrice(model.base_fixed_price)}
                              </span>
                            )}
                            <span className="font-medium">
                              {formatPrice(prices.fixed)}
                              <span className="ml-1 text-xs text-muted-foreground">
                                {c('/次', '/call')}
                              </span>
                            </span>
                          </span>
                        ) : (
                          <span>
                            {hasDiscount && (
                              <span className="mr-1.5 text-muted-foreground/60 line-through">
                                {formatPrice(model.base_input_price)}
                              </span>
                            )}
                            <span className="font-medium">
                              {formatPrice(prices.input)}
                              <span className="ml-0.5 text-xs text-muted-foreground">
                                /M
                              </span>
                            </span>
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {model.price_type === 'ratio' ? (
                          <span>
                            {hasDiscount && (
                              <span className="mr-1.5 text-muted-foreground/60 line-through">
                                {formatPrice(model.base_output_price)}
                              </span>
                            )}
                            <span className="font-medium">
                              {formatPrice(prices.output)}
                              <span className="ml-0.5 text-xs text-muted-foreground">
                                /M
                              </span>
                            </span>
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {hasDiscount ? (
                          <span className="inline-flex items-center rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-bold leading-none text-emerald-700 ring-1 ring-inset ring-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/30">
                            {discountPercent}% OFF
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* 空状态 */}
        {error && (
          <div role="alert" className="py-12 text-center">
            <p>{tr('Unable to load models.')}</p>
            <Button className="mt-3" onClick={() => setRetry((v) => v + 1)}>
              {tr('Retry')}
            </Button>
          </div>
        )}
        {!loading && !error && models.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24">
            <Search className="mb-4 h-12 w-12 text-muted-foreground/30" />
            <p className="text-lg font-medium text-muted-foreground">
              {t.modelPlaza.noResults}
            </p>
            {hasFilters && (
              <Button variant="outline" className="mt-4" onClick={resetFilters}>
                {c(
                  '清除筛选，查看全部模型',
                  'Clear filters and view all models'
                )}
              </Button>
            )}
          </div>
        )}
      </div>
      {!loading && !error && total > 0 && (
        <footer className={s.pagination}>
          <div className={s.pageSize}>
            <span>
              {c(
                `第 ${(page - 1) * pageSize + 1}–${Math.min(
                  page * pageSize,
                  total
                )} 项，共 ${total} 项`,
                `${(page - 1) * pageSize + 1}–${Math.min(
                  page * pageSize,
                  total
                )} of ${total}`
              )}
            </span>
            <label>
              {c('每页', 'Per page')}
              <select
                aria-label={c('每页', 'Per page')}
                value={pageSize}
                onChange={(event) => {
                  void setFilters({
                    size: Number(event.target.value) as 12 | 24 | 48,
                    page: 1
                  });
                  resultsRef.current?.scrollIntoView({ block: 'start' });
                }}
              >
                {[12, 24, 48].map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <nav
            aria-label={c('模型分页', 'Model pagination')}
            className={s.pageButtons}
          >
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              aria-label={t.modelPlaza.prevPage}
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="hidden sm:inline">{t.modelPlaza.prevPage}</span>
            </Button>
            <span className="px-3 text-sm tabular-nums">
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
              aria-label={t.modelPlaza.nextPage}
            >
              <span className="hidden sm:inline">{t.modelPlaza.nextPage}</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </nav>
        </footer>
      )}
    </main>
  );
}
