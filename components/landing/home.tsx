'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSession } from 'next-auth/react';
import { apiKeyHref, consoleHref } from '@/lib/api-key-navigation';
import { docsHref } from '@/lib/public-navigation';
import {
  ArrowUpRight,
  ArrowRight,
  Globe2,
  Layers3,
  Menu,
  X,
  RefreshCw
} from 'lucide-react';
import { useLocale } from '@/components/providers/locale-provider';
import { useSystemConfig } from '@/hooks/use-system-config';
import { ProviderLogoMark } from '@/sections/model-plaza/components/provider-logo';
import type { ModelPlazaResponse } from '@/lib/types/model-plaza';
import {
  fetchCatalog,
  modelTitle,
  modelEntryKey,
  modelDetailHref
} from './catalog';
import { HomeFeatures, HomeSections } from './home-sections';
import s from './home.module.css';
import { SiteNavLinks } from '@/components/layout/site-nav-links';
import { SiteNotice } from '@/components/site-notice';

const discordInvite = 'https://discord.gg/sUsmHckkA9';

const emptyCatalog: ModelPlazaResponse = {
  models: [],
  groups: [],
  providers: [],
  total: 0,
  page: 1,
  page_size: 100
};

export function LandingHome() {
  const { lang, setLang } = useLocale();
  const zh = lang === 'zh';
  const c = (cn: string, en: string) => (zh ? cn : en);
  const { data: session } = useSession();
  const { systemName } = useSystemConfig();
  const brand = systemName.trim() || 'LinkInfra';
  const start = apiKeyHref(Boolean(session), undefined, lang);
  const [menu, setMenu] = useState(false);
  const [catalog, setCatalog] = useState(emptyCatalog);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reload, setReload] = useState(0);
  const [paused, setPaused] = useState(false);

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
          <nav
            className={s.desktopNav}
            aria-label={c('主导航', 'Main navigation')}
          >
            <SiteNavLinks includeConsole={false} />
            <a href="#contact">{c('联系我们', 'Contact us')}</a>
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
            <Link
              className={s.navCta}
              href={consoleHref(Boolean(session), lang)}
            >
              Console
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
            <SiteNavLinks onNavigate={() => setMenu(false)} />
            <a href="#contact" onClick={() => setMenu(false)}>
              {c('联系我们', 'Contact us')}
            </a>
            <Link href="/getting-started" onClick={() => setMenu(false)}>
              {c('新手指引', 'Getting started')}
            </Link>
          </nav>
        )}
      </header>
      <main id="main-content">
        <SiteNotice className="mx-4 mt-4 sm:mx-8 lg:mx-12" />
        <section className={s.hero}>
          <div className={s.heroCopy}>
            <Link
              className={s.announcement}
              href={featured ? modelDetailHref(featured) : '/model-plaza'}
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
              <Link href="/model-plaza" className={s.secondary}>
                {c('进入模型广场', 'Explore models')}
                <ArrowRight size={16} />
              </Link>
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
        <section
          className={s.showcase}
          aria-label={c('平台模型展示', 'Model showcase')}
        >
          <div className={s.showcaseHeading}>
            <div>
              <h2>
                {c('多种模型，一个入口。', 'Many models. One connection.')}
              </h2>
              <p>
                {c(
                  '前往模型广场，查看价格与运行指标。',
                  'Explore pricing and performance in the marketplace.'
                )}
              </p>
            </div>
            <div className={s.showcaseActions}>
              <button
                type="button"
                onClick={() => setPaused(!paused)}
                aria-pressed={paused}
              >
                {paused
                  ? c('播放动画', 'Play animation')
                  : c('暂停动画', 'Pause animation')}
              </button>
              <Link href="/model-plaza" className={s.textLink}>
                {c('进入模型广场', 'Explore models')}
                <ArrowUpRight size={16} />
              </Link>
            </div>
          </div>
          {loading ? (
            <p role="status">{c('正在读取模型…', 'Loading models…')}</p>
          ) : error ? (
            <div role="alert">
              {c('暂时无法读取模型', 'Models are temporarily unavailable')}{' '}
              <button
                onClick={() => setReload((v) => v + 1)}
                className={s.textLink}
              >
                <RefreshCw size={14} />
                {c('重试', 'Retry')}
              </button>
            </div>
          ) : catalog.models.length === 0 ? (
            <p>{c('暂无公开模型', 'No public models yet')}</p>
          ) : (
            <div className={s.modelViewport} data-paused={paused}>
              <div className={s.modelTrack}>
                {[0, 1].map((copy) => (
                  <div
                    key={copy}
                    className={s.modelStrip}
                    aria-hidden={copy === 1 ? true : undefined}
                  >
                    {catalog.models.slice(0, 10).map((model) => (
                      <Link
                        key={modelEntryKey(model)}
                        tabIndex={copy === 1 ? -1 : undefined}
                        href={modelDetailHref(model)}
                        className={s.modelChip}
                      >
                        <ProviderLogoMark provider={model.provider} size={24} />
                        <span>{modelTitle(model.model_name)}</span>
                        <ArrowUpRight size={14} />
                      </Link>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
        <HomeSections
          sampleModel={
            catalog.models.find((m) => m.price_type === 'ratio')?.model_name ||
            'YOUR_MODEL_ID'
          }
        />
        <section
          id="contact"
          className={`${s.container} ${s.contactSection}`}
          aria-labelledby="contact-heading"
        >
          <div className={s.contactCard}>
            <div className={s.contactCopy}>
              <span className={s.sectionKicker}>
                {c('保持联系', 'Stay connected')}
              </span>
              <h2 id="contact-heading">{c('联系我们', 'Contact us')}</h2>
              <p>
                {c(
                  '有接入问题、产品建议或合作想法？加入我们的 Discord 社区，与我们交流。',
                  'Have questions, feedback, or ideas for working together? Join our Discord community and talk with us.'
                )}
              </p>
              <a
                href={discordInvite}
                className={s.contactAddress}
                target="_blank"
                rel="noopener noreferrer"
              >
                {discordInvite}
              </a>
              <a
                href={discordInvite}
                className={s.primary}
                target="_blank"
                rel="noopener noreferrer"
              >
                {c('加入 Discord', 'Join Discord')}
                <ArrowUpRight size={16} aria-hidden="true" />
              </a>
            </div>
            <div className={s.contactVisual}>
              <Image
                src="/discord.svg"
                alt={c('Discord 标志', 'Discord logo')}
                width={96}
                height={96}
              />
              <strong>Discord</strong>
              <span>{c('期待与你交流', 'Let’s talk')}</span>
            </div>
          </div>
        </section>
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
            <Link href={docsHref()}>{c('接入文档', 'Documentation')}</Link>
            <Link href="/dashboard/playground">Playground</Link>
            <Link href="/getting-started">
              {c('新手指引', 'Getting started')}
            </Link>
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
