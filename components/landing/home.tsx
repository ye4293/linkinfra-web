'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import {
  ArrowUpRight,
  ArrowRight,
  Globe2,
  Layers3,
  Menu,
  Search,
  X,
  Activity,
  Braces,
  RefreshCw
} from 'lucide-react';
import { useLocale } from '@/components/providers/locale-provider';
import { useSystemConfig } from '@/hooks/use-system-config';
import { ProviderLogoMark } from '@/sections/model-plaza/components/provider-logo';
import type { ModelPlazaResponse } from '@/lib/types/model-plaza';
import type { ModelMetricsMini } from '@/lib/types/model-metrics';
import { ModelMetrics } from './model-metrics';
import {
  fetchCatalog,
  formatPrice,
  matchesModel,
  modelPrices,
  modelTitle
} from './catalog';
import { HomeFeatures, HomeSections } from './home-sections';
import s from './home.module.css';

const emptyCatalog: ModelPlazaResponse = {
  models: [],
  groups: [],
  providers: [],
  total: 0,
  page: 1,
  page_size: 100
};

function focusModelSearch() {
  document.getElementById('models')?.scrollIntoView({ behavior: 'auto' });
  document.getElementById('model-search')?.focus({ preventScroll: true });
}

export function LandingHome() {
  const { lang, setLang } = useLocale();
  const zh = lang === 'zh';
  const c = (cn: string, en: string) => (zh ? cn : en);
  const { data: session } = useSession();
  const { systemName, docsAddress } = useSystemConfig();
  const brand = systemName.trim() || 'LinkInfra';
  const start = session ? '/dashboard' : '/sign-in';
  const [menu, setMenu] = useState(false);
  const [catalog, setCatalog] = useState(emptyCatalog);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reload, setReload] = useState(0);
  const [provider, setProvider] = useState('all');
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState('');
  const [sort, setSort] = useState('featured');
  const [billing, setBilling] = useState('all');
  const [metrics, setMetrics] = useState<Record<string, ModelMetricsMini>>({});

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        event.key !== '/' ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey ||
        event.isComposing ||
        target?.isContentEditable ||
        target?.closest('input, textarea, select')
      )
        return;
      event.preventDefault();
      focusModelSearch();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    fetch('/api/model-plaza/metrics/all', { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : null))
      .then((result) => {
        if (!controller.signal.aborted && result?.success && result.data)
          setMetrics(result.data);
      })
      .catch(() => {
        /* Monitoring is optional; cards without observations stay compact. */
      })
      .finally(() => clearTimeout(timeout));
    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [reload]);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    let active = true;
    setLoading(true);
    setError(false);
    fetchCatalog(controller.signal)
      .then((data) => {
        if (active) setCatalog(data);
      })
      .catch(() => {
        if (active) setError(true);
      })
      .finally(() => {
        clearTimeout(timeout);
        if (active) setLoading(false);
      });
    return () => {
      active = false;
      clearTimeout(timeout);
      controller.abort();
    };
  }, [reload]);

  const selectedGroup = catalog.groups.some((item) => item.group_key === group)
    ? group
    : catalog.groups[0]?.group_key || '';
  const filtered = useMemo(() => {
    const models = catalog.models.filter(
      (model) =>
        (provider === 'all' || model.provider === provider) &&
        (billing === 'all' || model.price_type === billing) &&
        matchesModel(model, query)
    );
    if (sort === 'price')
      models.sort((a, b) => {
        // Token and per-call prices use different units; keep them separate.
        if (a.price_type !== b.price_type)
          return a.price_type === 'ratio' ? -1 : 1;
        const ap = modelPrices(a, selectedGroup),
          bp = modelPrices(b, selectedGroup);
        return a.price_type === 'ratio'
          ? ap.input - bp.input
          : ap.fixed - bp.fixed;
      });
    if (sort === 'name')
      models.sort((a, b) =>
        a.model_name.localeCompare(b.model_name, 'en', { numeric: true })
      );
    return models;
  }, [catalog.models, provider, query, sort, selectedGroup, billing]);
  const featured = catalog.models[0];

  return (
    <div className={s.page} lang={zh ? 'zh-CN' : 'en'}>
      <a href="#main-content" className={s.skip}>
        {c('跳转到主要内容', 'Skip to content')}
      </a>
      <header className={s.header}>
        <div className={s.navInner}>
          <Link
            href="/"
            className={s.brand}
            aria-label={`${brand} ${c('首页', 'home')}`}
          >
            <span className={s.brandMark}>
              <Layers3 size={23} />
            </span>
            {brand}
          </Link>
          <button
            className={s.navSearch}
            onClick={focusModelSearch}
            aria-label={c('搜索模型', 'Search models')}
            aria-keyshortcuts="/"
          >
            <Search size={14} />
            <span>{c('搜索模型', 'Search models')}</span>
            <span className={s.searchHint}>/</span>
          </button>
          <nav
            className={s.desktopNav}
            aria-label={c('主导航', 'Main navigation')}
          >
            <a href="#models">{c('模型', 'Models')}</a>
            <Link href="/dashboard/playground">
              {c('在线体验', 'Playground')}
            </Link>
            <a href="#models">{c('价格', 'Pricing')}</a>
            <a href={docsAddress || '#developers'}>
              {c('文档', 'Docs')} <ArrowUpRight size={12} />
            </a>
          </nav>
          <div className={s.navActions}>
            <button
              className={s.language}
              onClick={() => setLang(zh ? 'en' : 'zh')}
              aria-label={zh ? 'Switch to English' : '切换为中文'}
            >
              <Globe2 size={16} />
              <span>{zh ? 'EN' : '中文'}</span>
            </button>
            {!session && (
              <Link className={s.signIn} href="/sign-in">
                {c('登录', 'Sign in')}
              </Link>
            )}
            <Link className={s.navCta} href={start}>
              {session
                ? c('控制台', 'Dashboard')
                : c('开始构建', 'Start building')}
              <ArrowUpRight size={15} />
            </Link>
            <button
              className={s.menuButton}
              onClick={() => setMenu(!menu)}
              aria-expanded={menu}
              aria-controls="landing-mobile-nav"
              aria-label={c('切换导航菜单', 'Toggle navigation')}
            >
              {menu ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
        {menu && (
          <nav
            id="landing-mobile-nav"
            className={s.mobileNav}
            aria-label={c('移动导航', 'Mobile navigation')}
          >
            {[
              ['#models', c('模型广场', 'Models')],
              ['/dashboard/playground', c('在线体验', 'Playground')],
              ['#platform', c('平台能力', 'Platform')],
              ['#developers', c('开发者文档', 'Developers')]
            ].map(([href, label]) => (
              <a key={href} href={href} onClick={() => setMenu(false)}>
                {label}
                <ArrowUpRight size={16} />
              </a>
            ))}
          </nav>
        )}
      </header>
      <main id="main-content">
        <section className={s.hero}>
          <div className={s.heroCopy}>
            <Link
              className={s.announcement}
              href={
                featured
                  ? `/model-plaza/${encodeURIComponent(featured.model_name)}`
                  : '/model-plaza'
              }
            >
              <span className={s.announcementTag}>
                {c('模型精选', 'Featured')}
              </span>
              {featured
                ? modelTitle(featured.model_name)
                : c('探索平台模型', 'Explore the model catalog')}
              <ArrowRight size={13} />
            </Link>
            <h1>
              {c('连接智能，', 'Connect to intelligence.')}
              <br />
              {c('构建新可能。', 'Build what’s next.')}
            </h1>
            <p className={s.heroDescription}>
              {c(
                '统一接入多种模型，透明的价格，熟悉的开发体验。',
                'Your models, connected. Transparent pricing. A familiar developer experience.'
              )}
            </p>
            <div className={s.heroButtons}>
              <Link href={start} className={s.primary}>
                {c('获取 API Key', 'Get API key')}
                <ArrowUpRight size={16} />
              </Link>
              <a href="#models" className={s.secondary}>
                {c('发现模型', 'Discover models')}
                <ArrowRight size={16} />
              </a>
            </div>
          </div>
          <div className={s.stats}>
            <div>
              <strong>{loading || error ? '—' : catalog.total}</strong>
              <p>{c('可用模型', 'Models in the catalog')}</p>
            </div>
            <div>
              <strong>
                {loading || error ? '—' : catalog.providers.length}
              </strong>
              <p>{c('模型厂商', 'Model providers')}</p>
            </div>
            <div>
              <strong>1</strong>
              <p>{c('统一 API Key', 'Unified API key')}</p>
            </div>
            <div>
              <strong>{c('按量', 'Pay as you go')}</strong>
              <p>{c('透明计费', 'Transparent pricing')}</p>
            </div>
          </div>
        </section>
        <HomeFeatures />
        <section id="models" className={`${s.container} ${s.section}`}>
          <div className={s.sectionHeader}>
            <div>
              <h2>{c('发现模型', 'Explore models')}</h2>
              <p>
                {c(
                  '比较模型与价格，为你的应用找到合适的选择。',
                  'Compare models and pricing. Find the right fit for your application.'
                )}
              </p>
            </div>
            <Link href="/model-plaza" className={s.textLink}>
              {c('查看完整模型广场', 'Explore all models')}
              <ArrowUpRight size={17} />
            </Link>
          </div>
          <div>
            <div className={s.filterBar}>
              <div
                className={s.providerTabs}
                aria-label={c('厂商筛选', 'Filter by provider')}
              >
                <button
                  className={provider === 'all' ? s.activeTab : ''}
                  onClick={() => setProvider('all')}
                  aria-pressed={provider === 'all'}
                >
                  <Layers3 size={14} />
                  {c('全部模型', 'All models')}
                  <span>{loading || error ? '—' : catalog.total}</span>
                </button>
                {catalog.providers.map((p) => (
                  <button
                    key={p.name}
                    className={provider === p.name ? s.activeTab : ''}
                    onClick={() => setProvider(p.name)}
                    aria-pressed={provider === p.name}
                  >
                    <ProviderLogoMark provider={p.name} size={14} />
                    {p.name === 'Zhipu' ? 'Z.ai' : p.name}
                    <span>{p.count}</span>
                  </button>
                ))}
              </div>
              <div className={s.search}>
                <Search size={16} />
                <input
                  id="model-search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={c('搜索模型…', 'Search models…')}
                  aria-label={c('搜索模型', 'Search models')}
                />
                {query && (
                  <button
                    onClick={() => setQuery('')}
                    aria-label={c('清空搜索', 'Clear search')}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>
            <div className={s.resultBar}>
              <span aria-live="polite">
                {loading
                  ? c('正在读取模型目录…', 'Loading model catalog…')
                  : error
                  ? c('暂时无法读取目录', 'Catalog currently unavailable')
                  : c(
                      `找到 ${filtered.length} 个模型，展示前 ${Math.min(
                        filtered.length,
                        6
                      )} 个`,
                      `${filtered.length} models · showing ${Math.min(
                        filtered.length,
                        6
                      )}`
                    )}
              </span>
              <div>
                <select
                  aria-label={c('计费方式', 'Billing type')}
                  value={billing}
                  onChange={(e) => setBilling(e.target.value)}
                >
                  <option value="all">
                    {c('全部计费方式', 'All billing types')}
                  </option>
                  <option value="ratio">{c('按 Token', 'Per token')}</option>
                  <option value="fixed">{c('按次调用', 'Per call')}</option>
                </select>
                {catalog.groups.length > 0 && (
                  <label>
                    {c('价格分组', 'Price group')}
                    <select
                      aria-label={c('价格分组', 'Price group')}
                      value={selectedGroup}
                      onChange={(e) => setGroup(e.target.value)}
                    >
                      {catalog.groups.map((g) => (
                        <option key={g.group_key} value={g.group_key}>
                          {g.display_name}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                <select
                  aria-label={c('模型排序', 'Sort models')}
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                >
                  <option value="featured">{c('精选排序', 'Featured')}</option>
                  <option value="price">
                    {c('价格从低到高', 'Price: low to high')}
                  </option>
                  <option value="name">{c('按名称排序', 'Name: A–Z')}</option>
                </select>
              </div>
            </div>
            {loading ? (
              <div className={s.modelGrid}>
                {Array.from({ length: 6 }, (_, index) => (
                  <div key={index} className={s.skeleton} aria-hidden="true">
                    <span />
                    <span />
                    <span />
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className={s.empty}>
                <Layers3 size={30} />
                <h3>
                  {c(
                    '模型目录暂时无法加载',
                    'The model catalog is unavailable'
                  )}
                </h3>
                <p>
                  {c(
                    '稍后重试，或前往模型广场查看。',
                    'Try again or visit the model marketplace.'
                  )}
                </p>
                <button
                  className={s.secondary}
                  onClick={() => setReload((value) => value + 1)}
                >
                  <RefreshCw size={15} />
                  {c('重新加载', 'Try again')}
                </button>
              </div>
            ) : !filtered.length ? (
              <div className={s.empty}>
                <Search size={28} />
                <h3>{c('没有找到匹配的模型', 'No matching models')}</h3>
                <p>
                  {c(
                    '试试其他名称，或重置筛选条件。',
                    'Try another name or reset your filters.'
                  )}
                </p>
                <button
                  className={s.secondary}
                  onClick={() => {
                    setQuery('');
                    setProvider('all');
                    setBilling('all');
                  }}
                >
                  {c('重置筛选', 'Reset filters')}
                </button>
              </div>
            ) : (
              <div className={s.modelGrid}>
                {filtered.slice(0, 6).map((model, index) => {
                  const prices = modelPrices(model, selectedGroup);
                  return (
                    <Link
                      key={model.model_name}
                      href={`/model-plaza/${encodeURIComponent(
                        model.model_name
                      )}`}
                      className={s.modelCard}
                    >
                      <div className={s.cardTop}>
                        <span className={s.providerIcon}>
                          <ProviderLogoMark
                            provider={model.provider}
                            size={25}
                          />
                        </span>
                        <span className={s.modelProvider}>
                          {model.provider === 'Zhipu' ? 'Z.ai' : model.provider}
                        </span>
                        {index === 0 &&
                          sort === 'featured' &&
                          provider === 'all' &&
                          !query && (
                            <span className={s.featuredTag}>
                              {c('精选', 'SPOTLIGHT')}
                            </span>
                          )}
                        <ArrowUpRight className={s.cardArrow} size={17} />
                      </div>
                      <h3>{modelTitle(model.model_name)}</h3>
                      <code className={s.modelId} title={model.model_name}>
                        {model.model_name}
                      </code>
                      <div className={s.modelTags}>
                        <span>
                          <Braces size={11} />
                          API
                        </span>
                        <span>
                          {model.price_type === 'fixed'
                            ? c('按次计费', 'Per-call billing')
                            : c('按 Token 计费', 'Token billing')}
                        </span>
                        {model.model_name.includes('thinking') && (
                          <span>Thinking</span>
                        )}
                        {model.model_name.startsWith('global.') && (
                          <span>Global</span>
                        )}
                      </div>
                      <div className={s.modelPrice}>
                        {model.price_type === 'fixed' ? (
                          <div>
                            <span>{c('每次调用', 'Per call')}</span>
                            <strong>
                              {formatPrice(prices.fixed)}
                              <small> / {c('次', 'call')}</small>
                            </strong>
                          </div>
                        ) : (
                          <>
                            <div>
                              <span>{c('输入', 'INPUT')}</span>
                              <strong>
                                {formatPrice(prices.input)}
                                <small> / M</small>
                              </strong>
                            </div>
                            <div>
                              <span>{c('输出', 'OUTPUT')}</span>
                              <strong>
                                {formatPrice(prices.output)}
                                <small> / M</small>
                              </strong>
                            </div>
                          </>
                        )}
                      </div>
                      {metrics[model.model_name]?.total_requests_24h > 0 &&
                        metrics[model.model_name]?.status !== 'no_data' && (
                          <ModelMetrics metrics={metrics[model.model_name]} />
                        )}
                    </Link>
                  );
                })}
              </div>
            )}
            <div className={s.catalogFoot}>
              <span>
                <Activity size={13} />
                {c(
                  '目录价格 · USD / 百万 Tokens（按次模型除外）',
                  'Catalog pricing · USD / 1M tokens, except per-call models'
                )}
              </span>
              <Link href="/model-plaza">
                {c('价格与运行指标', 'Pricing & metrics')}
                <ArrowRight size={13} />
              </Link>
            </div>
          </div>
        </section>
        <HomeSections
          sampleModel={
            catalog.models.find((m) => m.price_type === 'ratio')?.model_name ||
            'YOUR_MODEL_ID'
          }
          start={start}
        />
      </main>
      <footer className={`${s.container} ${s.footer}`}>
        <div className={s.footerTop}>
          <div>
            <Link href="/" className={s.brand}>
              <span className={s.brandMark}>
                <Layers3 size={23} />
              </span>
              {brand}
            </Link>
            <p>
              {c(
                '连接智能，构建新可能。',
                'Connect to intelligence. Build what’s next.'
              )}
            </p>
          </div>
          <div>
            <strong>{c('探索', 'Explore')}</strong>
            <Link href="/model-plaza">
              {c('模型与价格', 'Models & pricing')}
            </Link>
            <a href="#platform">{c('平台能力', 'Platform')}</a>
          </div>
          <div>
            <strong>{c('开发', 'Build')}</strong>
            <a href={docsAddress || '#developers'}>
              {c('接入文档', 'Documentation')}
            </a>
            <Link href="/dashboard/playground">Playground</Link>
          </div>
          <div>
            <strong>{c('管理', 'Manage')}</strong>
            <Link href="/dashboard">{c('控制台', 'Dashboard')}</Link>
            <Link href="/dashboard/token">API Keys</Link>
          </div>
        </div>
        <div className={s.footerBottom}>
          <span>
            © {new Date().getFullYear()} {brand}. All rights reserved.
          </span>

          <a href="#main-content">{c('回到顶部', 'Back to top')} ↑</a>
        </div>
      </footer>
    </div>
  );
}
