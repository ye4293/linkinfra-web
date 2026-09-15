'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Command } from 'cmdk';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  AudioLines,
  BookOpen,
  Check,
  ChevronDown,
  ChevronRight,
  Code2,
  Copy,
  FileText,
  Globe2,
  Hash,
  ImageIcon,
  Info,
  KeyRound,
  Layers3,
  Menu,
  MessageSquare,
  Moon,
  Search,
  ShieldCheck,
  Sparkles,
  Sun,
  Terminal,
  Zap
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { toast } from 'sonner';
import { useLocale } from '@/components/providers/locale-provider';
import { useSystemConfig } from '@/hooks/use-system-config';
import { apiKeyHref } from '@/lib/api-key-navigation';
import {
  allDocs,
  apiDocs,
  docGroups,
  findApiDoc,
  guideDocs,
  type DocField,
  type DocLanguage
} from '@/lib/api-docs/catalog';
import {
  codeLanguages,
  docMarkdown,
  requestExample,
  type CodeLanguage
} from '@/lib/api-docs/examples';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle
} from '@/components/ui/sheet';
import s from './docs.module.css';

const groupIcons = {
  text: MessageSquare,
  images: ImageIcon,
  audio: AudioLines,
  embeddings: Layers3,
  models: Sparkles
};

function CopyButton({
  value,
  label,
  compact = false
}: {
  value: string;
  label: string;
  compact?: boolean;
}) {
  const { lang } = useLocale();
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);
  return (
    <button
      type="button"
      className={compact ? s.iconButton : s.copyButton}
      title={label}
      aria-label={copied ? (lang === 'zh' ? '已复制' : 'Copied') : label}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          toast.success(
            lang === 'zh' ? '已复制到剪贴板' : 'Copied to clipboard'
          );
        } catch {
          toast.error(
            lang === 'zh'
              ? '复制失败，请选中文本手动复制'
              : 'Could not copy. Please select and copy the text.'
          );
        }
      }}
    >
      {copied ? <Check size={14} /> : <Copy size={14} />}
      {!compact && (
        <span>{copied ? (lang === 'zh' ? '已复制' : 'Copied') : label}</span>
      )}
    </button>
  );
}

function HighlightedCode({ value }: { value: string }) {
  const tokens = value.split(
    /("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\b(?:true|false|null|const|await|import|from|if|throw|new|return|func|package|defer|var|with|as)\b|\b\d+(?:\.\d+)?\b)/g
  );
  return (
    <pre className={s.code}>
      <code>
        {tokens.map((token, index) => {
          const string = /^['"]/.test(token);
          const key = string && /^\s*:/.test(tokens[index + 1] || '');
          const className = key
            ? s.codeKey
            : string
            ? s.codeString
            : /^\d/.test(token)
            ? s.codeNumber
            : /^[a-z]+$/.test(token)
            ? s.codeKeyword
            : undefined;
          return (
            <span key={index} className={className}>
              {token}
            </span>
          );
        })}
      </code>
    </pre>
  );
}

function FieldList({
  fields,
  lang
}: {
  fields: DocField[];
  lang: DocLanguage;
}) {
  return (
    <div className={s.fields}>
      {fields.map((field) => (
        <div key={field.name} className={s.field}>
          <div className={s.fieldHead}>
            <code>{field.name}</code>
            <span className={s.fieldType}>{field.type}</span>
            {field.required && (
              <span className={s.required}>
                {lang === 'zh' ? '必填' : 'required'}
              </span>
            )}
          </div>
          <p>{field.description[lang]}</p>
          {field.children && (
            <details className={s.nestedFields}>
              <summary>
                <ChevronRight size={14} />
                {lang === 'zh' ? '查看子字段' : 'Show child properties'}
                <span>{field.children.length}</span>
              </summary>
              <FieldList fields={field.children} lang={lang} />
            </details>
          )}
        </div>
      ))}
    </div>
  );
}

function SectionTitle({
  id,
  children,
  aside
}: {
  id: string;
  children: React.ReactNode;
  aside?: string;
}) {
  return (
    <div className={s.sectionTitle}>
      <h2 id={id}>
        <a href={`#${id}`}>
          {children}
          <Hash size={16} aria-hidden="true" />
        </a>
      </h2>
      {aside && <span>{aside}</span>}
    </div>
  );
}

export function DocsPage({ slug }: { slug: string }) {
  const router = useRouter();
  const { lang, setLang } = useLocale();
  const c = (zh: string, en: string) => (lang === 'zh' ? zh : en);
  const { resolvedTheme, setTheme } = useTheme();
  const { loading } = useSystemConfig();
  const { data: session } = useSession();
  const brand = 'Linkinfra API';
  const root = 'https://api.linkinfra.ai';
  const keyHref = apiKeyHref(Boolean(session));
  const doc = findApiDoc(slug);
  const page = allDocs.find((item) => item.slug === slug)!;
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [language, setLanguage] = useState<CodeLanguage>('cURL');
  const [mounted, setMounted] = useState(false);
  const dark = mounted && resolvedTheme === 'dark';
  const pageIndex = allDocs.findIndex((item) => item.slug === slug);
  const previous = allDocs[pageIndex - 1];
  const next = allDocs[pageIndex + 1];

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!loading) document.title = `${page.title[lang]} | ${brand} Docs`;
  }, [page, lang, brand, loading]);
  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setSearchOpen((open) => !open);
      }
    };
    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
  }, []);

  const sidebar = (
    <>
      <button
        className={s.searchButton}
        onClick={() => {
          setMobileOpen(false);
          setSearchOpen(true);
        }}
      >
        <Search size={16} />
        <span>{c('搜索文档…', 'Search documentation…')}</span>
        <kbd>
          {mounted && /Mac|iPhone|iPad/.test(navigator.platform)
            ? '⌘ K'
            : 'Ctrl K'}
        </kbd>
      </button>
      <nav
        aria-label={c('文档目录', 'Documentation navigation')}
        className={s.sideNav}
      >
        <div className={s.navLabel}>{c('开始使用', 'GET STARTED')}</div>
        {guideDocs.map((item, index) => {
          const Icon = [Zap, ShieldCheck, FileText][index];
          return (
            <Link
              key={item.slug}
              href={`/docs/${item.slug}`}
              className={`${s.guideLink} ${slug === item.slug ? s.active : ''}`}
              aria-current={slug === item.slug ? 'page' : undefined}
              onClick={() => setMobileOpen(false)}
            >
              <Icon size={16} />
              {item.title[lang]}
            </Link>
          );
        })}
        <div className={s.navLabel}>{c('API 参考', 'API REFERENCE')}</div>
        {docGroups.map((group) => {
          const Icon = groupIcons[group.id as keyof typeof groupIcons];
          return (
            <details open key={group.id} className={s.navGroup}>
              <summary>
                <Icon size={16} />
                <span>{group.label[lang]}</span>
                <ChevronDown size={14} />
              </summary>
              <div className={s.navChildren}>
                {apiDocs
                  .filter((item) => item.group === group.id)
                  .map((item) => (
                    <Link
                      key={item.slug}
                      href={`/docs/${item.slug}`}
                      className={`${s.endpointLink} ${
                        slug === item.slug ? s.active : ''
                      }`}
                      aria-current={slug === item.slug ? 'page' : undefined}
                      onClick={() => setMobileOpen(false)}
                    >
                      <span>{item.title[lang]}</span>
                      <span
                        className={`${s.navMethod} ${
                          item.method === 'GET' ? s.get : ''
                        }`}
                      >
                        {item.method}
                      </span>
                    </Link>
                  ))}
              </div>
            </details>
          );
        })}
      </nav>
      <div className={s.sideBottom}>
        <div>
          <Terminal size={17} />
          <strong>{c('从第一个请求开始', 'Your first request awaits')}</strong>
        </div>
        <p>
          {c(
            '创建一个 Key，连接多种 AI 模型。',
            'One API key. A world of AI models.'
          )}
        </p>
        <a href={keyHref}>
          {c('获取 API Key', 'Get an API key')}
          <ArrowUpRight size={14} />
        </a>
      </div>
    </>
  );

  return (
    <div className={s.docs} lang={lang === 'zh' ? 'zh-CN' : 'en'}>
      <a href="#doc-main" className={s.skipLink}>
        {c('跳到文档正文', 'Skip to content')}
      </a>
      <header className={s.header}>
        <div className={s.headerInner}>
          <div className={s.brandArea}>
            <Link href="/" className={s.brand}>
              <span className={s.brandMark}>
                <Layers3 size={19} strokeWidth={2.2} />
              </span>
              {brand}
            </Link>
            <span className={s.docsBadge}>docs</span>
          </div>
          <nav
            className={s.topNav}
            aria-label={c('文档导航', 'Documentation sections')}
          >
            <Link href="/docs/quickstart" className={!doc ? s.topActive : ''}>
              {c('开发指南', 'Guides')}
            </Link>
            <Link
              href="/docs/api/chat-completions"
              className={doc ? s.topActive : ''}
            >
              {c('API 参考', 'API Reference')}
            </Link>
            <Link href="/model-plaza">
              {c('模型广场', 'Models')}
              <ArrowUpRight size={12} />
            </Link>
          </nav>
          <div className={s.headerActions}>
            <button
              className={`${s.iconButton} ${s.mobileSearch}`}
              aria-label={c('搜索文档', 'Search documentation')}
              onClick={() => setSearchOpen(true)}
            >
              <Search size={17} />
            </button>
            <button
              className={s.localeButton}
              onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')}
              aria-label={c('Switch to English', '切换为中文')}
            >
              <Globe2 size={16} />
              <span>{c('中', 'EN')}</span>
            </button>
            <button
              className={s.iconButton}
              onClick={() => setTheme(dark ? 'light' : 'dark')}
              aria-label={
                dark
                  ? c('切换浅色模式', 'Switch to light mode')
                  : c('切换深色模式', 'Switch to dark mode')
              }
            >
              {dark ? <Sun size={17} /> : <Moon size={17} />}
            </button>
            <a href="/dashboard" className={s.consoleLink}>
              {c('控制台', 'Console')}
              <ArrowUpRight size={14} />
            </a>
          </div>
        </div>
      </header>

      <div className={s.layout}>
        <aside className={s.sidebar}>{sidebar}</aside>
        <div className={s.workspace}>
          <div className={s.mobileBar}>
            <button onClick={() => setMobileOpen(true)}>
              <Menu size={17} />
              {c('文档目录', 'Documentation')}
            </button>
            <span>{page.title[lang]}</span>
          </div>
          <main id="doc-main" className={s.main}>
            <div className={s.pageHeading}>
              <div className={s.breadcrumb}>
                <Link href="/docs">{c('文档', 'Docs')}</Link>
                <ChevronRight size={12} />
                <span>
                  {doc
                    ? docGroups.find((group) => group.id === doc.group)?.label[
                        lang
                      ]
                    : c('开发指南', 'Guides')}
                </span>
              </div>
              <div className={s.headingRow}>
                <h1>{page.title[lang]}</h1>
                {doc && (
                  <CopyButton
                    value={docMarkdown(doc, root, lang)}
                    label={c('复制页面', 'Copy page')}
                  />
                )}
              </div>
              <p className={s.description}>{page.description[lang]}</p>
              {doc && (
                <div className={s.headingTags}>
                  <span>
                    <Code2 size={12} />
                    {doc.protocol} {c('兼容', 'compatible')}
                  </span>
                  {doc.streaming && (
                    <span>
                      <Zap size={12} />
                      {c('支持流式输出', 'Streaming supported')}
                    </span>
                  )}
                </div>
              )}
            </div>

            {doc ? (
              <div className={s.apiGrid}>
                <article className={s.article}>
                  <div className={s.endpointBox}>
                    <span
                      className={`${s.method} ${
                        doc.method === 'GET' ? s.get : ''
                      }`}
                    >
                      {doc.method}
                    </span>
                    <code>{doc.path}</code>
                    <CopyButton
                      compact
                      value={`${root}${doc.path}`}
                      label={c('复制接口地址', 'Copy endpoint URL')}
                    />
                  </div>
                  <div className={s.baseUrl}>
                    <span>Base URL</span>
                    <code>{root}</code>
                  </div>
                  <div className={s.sectionLinks}>
                    <a href="#authorization">
                      {c('身份验证', 'Authorization')}
                    </a>
                    {doc.pathFields && (
                      <a href="#path-parameters">{c('路径参数', 'Path')}</a>
                    )}
                    <a href="#request-body">{c('请求参数', 'Body')}</a>
                    <a href="#response">
                      {c('响应', 'Response')}
                      <ArrowDown size={12} />
                    </a>
                  </div>
                  <SectionTitle id="authorization" aside="Bearer Token">
                    {c('身份验证', 'Authorization')}
                  </SectionTitle>
                  <div className={s.authLine}>
                    <KeyRound size={16} />
                    <code>Authorization</code>
                    <span>Bearer &lt;token&gt;</span>
                  </div>
                  <p className={s.paragraph}>
                    {c(
                      '所有接口均需使用 API Key 验证身份。在请求头中传入：',
                      'Authenticate requests with your API key in the request header:'
                    )}
                  </p>
                  <div className={s.inlineCode}>
                    <code>Authorization: Bearer sk-your-api-key</code>
                    <CopyButton
                      compact
                      value="Authorization: Bearer sk-your-api-key"
                      label={c('复制鉴权格式', 'Copy authorization format')}
                    />
                  </div>
                  <p className={s.smallText}>
                    {c('还没有密钥？', 'Need a key?')}{' '}
                    <a href={keyHref}>
                      {c('前往控制台创建', 'Create one in the console')}
                      <ArrowUpRight size={12} />
                    </a>
                  </p>
                  {doc.headers && (
                    <div className={s.additionalHeaders}>
                      {Object.entries(doc.headers).map(([key, value]) => (
                        <div key={key}>
                          <code>{key}</code>
                          <code>{value}</code>
                        </div>
                      ))}
                    </div>
                  )}
                  {doc.note && (
                    <div className={s.callout}>
                      <Info size={17} />
                      <p>{doc.note[lang]}</p>
                    </div>
                  )}
                  {doc.pathFields && (
                    <>
                      <SectionTitle id="path-parameters">
                        {c('路径参数', 'Path parameters')}
                      </SectionTitle>
                      <FieldList fields={doc.pathFields} lang={lang} />
                    </>
                  )}
                  <SectionTitle
                    id="request-body"
                    aside={
                      doc.method === 'GET'
                        ? undefined
                        : doc.multipart
                        ? 'multipart/form-data'
                        : 'application/json'
                    }
                  >
                    {c('请求参数', 'Request body')}
                  </SectionTitle>
                  {doc.fields.length ? (
                    <FieldList fields={doc.fields} lang={lang} />
                  ) : (
                    <p className={s.paragraph}>
                      {c(
                        '此接口不需要请求体。',
                        'This endpoint does not require a request body.'
                      )}
                    </p>
                  )}
                  {doc.streaming && (
                    <>
                      <SectionTitle id="streaming">
                        {c('流式响应', 'Streaming')}
                      </SectionTitle>
                      <div className={s.callout}>
                        <Zap size={17} />
                        <p>{doc.streaming[lang]}</p>
                      </div>
                    </>
                  )}
                  <SectionTitle
                    id="response"
                    aside={doc.binary ? 'audio/mpeg' : 'application/json'}
                  >
                    {c('响应', 'Response')}
                  </SectionTitle>
                  <div className={s.responseStatus}>
                    <span />
                    <code>200</code>
                    <span>{c('请求成功', 'Successful response')}</span>
                  </div>
                  <FieldList fields={doc.responseFields} lang={lang} />
                  <Link href="/docs/errors" className={s.errorLink}>
                    {c(
                      '请求失败？查看错误处理指南',
                      'Request failed? Read the error handling guide'
                    )}
                    <ArrowRight size={14} />
                  </Link>
                </article>
                <aside
                  className={s.examples}
                  aria-label={c('代码示例', 'Code examples')}
                >
                  <div className={s.examplesInner}>
                    <div className={s.exampleTitle}>
                      <Terminal size={15} />
                      <span>{c('请求示例', 'Request example')}</span>
                    </div>
                    <div className={s.codeCard}>
                      <div
                        className={s.codeTabs}
                        role="group"
                        aria-label={c('示例语言', 'Example language')}
                      >
                        {codeLanguages.map((item) => (
                          <button
                            key={item}
                            aria-pressed={language === item}
                            className={language === item ? s.selectedTab : ''}
                            onClick={() => setLanguage(item)}
                          >
                            {item}
                          </button>
                        ))}
                      </div>
                      <div className={s.codeToolbar}>
                        <span>
                          {language === 'JavaScript'
                            ? 'Node.js 20+'
                            : language === 'Python'
                            ? 'pip install requests'
                            : language === 'Go'
                            ? 'Go 1.20+'
                            : 'HTTP'}
                        </span>
                        <CopyButton
                          compact
                          value={requestExample(doc, root, language)}
                          label={c('复制请求示例', 'Copy request example')}
                        />
                      </div>
                      <HighlightedCode
                        value={requestExample(doc, root, language)}
                      />
                    </div>
                    <p className={s.exampleHint}>
                      {c(
                        '先将 API Key 写入环境变量',
                        'Set your API key in the environment variable'
                      )}{' '}
                      <code>LINKINFRA_API_KEY</code>
                      {c('。', '. ')}
                    </p>
                    <div className={s.codeCard}>
                      <div className={s.responseCodeHeader}>
                        <span>
                          <span className={s.statusDot} />
                          200 <span>OK</span>
                        </span>
                        <span>{c('响应示例', 'Example response')}</span>
                        <CopyButton
                          compact
                          value={
                            doc.binary
                              ? String(doc.response)
                              : JSON.stringify(doc.response, null, 2)
                          }
                          label={c('复制响应示例', 'Copy response example')}
                        />
                      </div>
                      <HighlightedCode
                        value={
                          doc.binary
                            ? String(doc.response)
                            : JSON.stringify(doc.response, null, 2)
                        }
                      />
                    </div>
                    <div className={s.modelNote}>
                      <Info size={14} />
                      <p>
                        {c(
                          '示例模型和响应仅供接入参考。请在模型广场确认可用模型及价格。',
                          'Models and responses are illustrative. Check the model catalog for availability and pricing.'
                        )}{' '}
                        <Link href="/model-plaza">
                          {c('浏览模型', 'Explore models')}
                          <ArrowUpRight size={11} />
                        </Link>
                      </p>
                    </div>
                  </div>
                </aside>
              </div>
            ) : (
              <GuideContent
                slug={slug}
                lang={lang}
                root={root}
                keyHref={keyHref}
              />
            )}

            <footer className={s.pageFooter}>
              <div className={s.footerNote}>
                <BookOpen size={15} />
                {c(
                  '一个接口，连接你的下一个想法。',
                  'One API for your next idea.'
                )}
              </div>
              <div className={s.pagination}>
                {previous ? (
                  <Link href={`/docs/${previous.slug}`}>
                    <ArrowLeft size={16} />
                    <span>
                      <small>{c('上一篇', 'Previous')}</small>
                      {previous.title[lang]}
                    </span>
                  </Link>
                ) : (
                  <span />
                )}
                {next && (
                  <Link href={`/docs/${next.slug}`}>
                    <span>
                      <small>{c('下一篇', 'Next')}</small>
                      {next.title[lang]}
                    </span>
                    <ArrowRight size={16} />
                  </Link>
                )}
              </div>
              <div className={s.copyright}>
                © {new Date().getFullYear()} {brand}
                <Link href="/getting-started">
                  {c('客户端接入指南', 'Client setup guide')}
                  <ArrowUpRight size={12} />
                </Link>
              </div>
            </footer>
          </main>
        </div>
      </div>

      <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
        <DialogContent className={s.searchDialog}>
          <DialogTitle className="sr-only">
            {c('搜索文档', 'Search documentation')}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {c(
              '搜索接口名称、路径或关键词。使用方向键选择结果，回车打开。',
              'Search names, paths, or keywords. Use arrow keys to choose a result and Enter to open it.'
            )}
          </DialogDescription>
          <Command
            className={s.command}
            label={c('搜索文档', 'Search documentation')}
          >
            <div className={s.searchInput}>
              <Search size={19} />
              <Command.Input
                autoFocus
                placeholder={c(
                  '搜索接口、路径、关键词…',
                  'Search endpoints, paths, keywords…'
                )}
              />
            </div>
            <Command.List>
              <Command.Empty>
                {c(
                  '没有找到相关文档，请尝试其他关键词。',
                  'No documentation found. Try another keyword.'
                )}
              </Command.Empty>
              {[...guideDocs, ...apiDocs].map((item) => (
                <Command.Item
                  key={item.slug}
                  value={`${item.title.zh} ${item.title.en} ${
                    item.description.zh
                  } ${item.description.en} ${'path' in item ? item.path : ''}`}
                  onSelect={() => {
                    setSearchOpen(false);
                    router.push(`/docs/${item.slug}`);
                  }}
                >
                  <FileText size={17} />
                  <Link
                    id={`search-${item.slug}`}
                    href={`/docs/${item.slug}`}
                    tabIndex={-1}
                    onClick={() => setSearchOpen(false)}
                  >
                    <strong>{item.title[lang]}</strong>
                    <span>
                      {'path' in item
                        ? String(item.path)
                        : c('开发指南', 'Guides')}
                    </span>
                  </Link>
                  <ArrowRight size={14} />
                </Command.Item>
              ))}
            </Command.List>
            <div className={s.searchFooter}>
              <span>↑ ↓ {c('选择', 'Navigate')}</span>
              <span>↵ {c('打开', 'Open')}</span>
              <span>esc {c('关闭', 'Close')}</span>
            </div>
          </Command>
        </DialogContent>
      </Dialog>
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className={`${s.docs} ${s.mobileSheet}`}>
          <SheetTitle>{brand} Docs</SheetTitle>
          <SheetDescription className="sr-only">
            {c(
              '浏览开发指南和 API 参考文档',
              'Browse guides and API reference documentation'
            )}
          </SheetDescription>
          <div className={s.mobileSidebar}>{sidebar}</div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function GuideContent({
  slug,
  lang,
  root,
  keyHref
}: {
  slug: string;
  lang: DocLanguage;
  root: string;
  keyHref: string;
}) {
  const c = (zh: string, en: string) => (lang === 'zh' ? zh : en);
  const quickstart = slug === 'quickstart';
  const authentication = slug === 'authentication';
  const sections = quickstart
    ? [
        ['create-key', c('创建 API Key', 'Create an API key')],
        ['base-url', c('设置请求地址', 'Set the base URL')],
        ['first-request', c('发送第一个请求', 'Make your first request')]
      ]
    : authentication
    ? [
        ['api-keys', c('API Key', 'API keys')],
        ['protocols', c('协议与地址', 'Protocols & base URLs')],
        ['key-security', c('密钥管理', 'Key management')]
      ]
    : [
        ['status-codes', c('HTTP 状态码', 'HTTP status codes')],
        ['retry', c('重试策略', 'Retry strategy')],
        ['debugging', c('排查请求', 'Debugging requests')]
      ];
  return (
    <div className={s.guideGrid}>
      <article className={`${s.article} ${s.guideArticle}`}>
        {quickstart ? (
          <>
            <div className={s.callout}>
              <Zap size={18} />
              <p>
                {c(
                  '只需要一个 API Key 和 API 地址，就能开始调用。已有 OpenAI SDK 的应用可以直接替换 base_url 和 api_key。',
                  'All you need is an API key and a base URL. For applications using the OpenAI SDK, replace base_url and api_key to get started.'
                )}
              </p>
            </div>
            <SectionTitle id="create-key">
              {c('1. 创建 API Key', '1. Create an API key')}
            </SectionTitle>
            <p className={s.paragraph}>
              {c(
                '登录控制台，在 API Key 页面创建密钥。确认账户余额和密钥额度充足，然后将密钥保存为环境变量。',
                'Sign in to the console and create a key on the API Keys page. Check your account balance and key spending limit, then save the key as an environment variable.'
              )}
            </p>
            <a href={keyHref} className={s.primaryLink}>
              {c('创建 API Key', 'Create an API key')}
              <ArrowUpRight size={15} />
            </a>
            <div className={s.standaloneCode}>
              <CopyButton
                compact
                value={'export LINKINFRA_API_KEY="sk-your-api-key"'}
                label={c('复制环境变量', 'Copy environment variable')}
              />
              <HighlightedCode
                value={'export LINKINFRA_API_KEY="sk-your-api-key"'}
              />
            </div>
            <SectionTitle id="base-url">
              {c('2. 设置请求地址', '2. Set the base URL')}
            </SectionTitle>
            <p className={s.paragraph}>
              {c(
                '直接发送 HTTP 请求时，将接口路径拼接在 API 根地址后。使用 OpenAI SDK 时，base_url 需要以 /v1 结尾。',
                'For HTTP requests, append the endpoint path to the API root. With the OpenAI SDK, base_url must end in /v1.'
              )}
            </p>
            <div className={s.addressCard}>
              <span>OpenAI SDK Base URL</span>
              <code>{root}/v1</code>
              <CopyButton
                compact
                value={`${root}/v1`}
                label={c('复制 Base URL', 'Copy base URL')}
              />
            </div>
            <SectionTitle id="first-request">
              {c('3. 发送第一个请求', '3. Make your first request')}
            </SectionTitle>
            <p className={s.paragraph}>
              {c(
                '从模型广场选择账户可用的模型 ID，替换下面示例的 model 后运行。',
                'Choose an available model ID from the model catalog, replace model in the example below, and run the request.'
              )}
            </p>
            <div className={s.standaloneCode}>
              <CopyButton
                compact
                value={requestExample(apiDocs[0], root, 'cURL')}
                label={c('复制请求', 'Copy request')}
              />
              <HighlightedCode
                value={requestExample(apiDocs[0], root, 'cURL')}
              />
            </div>
            <p className={s.paragraph}>
              {c(
                '成功后，可在 choices[0].message.content 读取模型回复，在控制台查看用量记录。',
                'On success, read the reply from choices[0].message.content and view usage logs in the console.'
              )}
            </p>
            <div className={s.nextCards}>
              <Link href="/docs/api/chat-completions">
                <MessageSquare size={19} />
                <strong>{c('对话 API', 'Chat API')}</strong>
                <span>
                  {c('查看参数与多语言示例', 'Parameters and code examples')}
                </span>
                <ArrowRight size={17} />
              </Link>
              <Link href="/getting-started">
                <Terminal size={19} />
                <strong>{c('配置客户端', 'Connect your client')}</strong>
                <span>
                  {c('接入 Claude Code 等工具', 'Set up Claude Code and more')}
                </span>
                <ArrowRight size={17} />
              </Link>
            </div>
          </>
        ) : authentication ? (
          <>
            <SectionTitle id="api-keys">API Key</SectionTitle>
            <p className={s.paragraph}>
              {c(
                '统一使用平台生成的 API Key 调用模型接口。相同密钥可访问所属账户分组支持的不同模型，无需为每个模型单独创建密钥。',
                'Use a platform API key to call model endpoints. The same key can access different models supported by your account group; you do not need a separate key for each model.'
              )}
            </p>
            <div className={s.inlineCode}>
              <code>Authorization: Bearer sk-your-api-key</code>
              <CopyButton
                compact
                value="Authorization: Bearer sk-your-api-key"
                label={c('复制鉴权格式', 'Copy authorization format')}
              />
            </div>
            <p className={s.paragraph}>
              {c(
                'Anthropic 原生接口也接受 x-api-key；Gemini 原生接口也接受 x-goog-api-key。两者填写的都是本平台密钥。',
                'Native Anthropic endpoints also accept x-api-key; native Gemini endpoints also accept x-goog-api-key. In both cases, use your platform API key.'
              )}
            </p>
            <SectionTitle id="protocols">
              {c('协议与地址', 'Protocols & base URLs')}
            </SectionTitle>
            <div className={s.tableWrapper}>
              <table>
                <thead>
                  <tr>
                    <th>{c('客户端', 'Client')}</th>
                    <th>Base URL</th>
                    <th>{c('接口', 'Endpoint')}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>OpenAI SDK</td>
                    <td>
                      <code>{root}/v1</code>
                    </td>
                    <td>
                      <code>/chat/completions</code>
                    </td>
                  </tr>
                  <tr>
                    <td>Anthropic SDK</td>
                    <td>
                      <code>{root}</code>
                    </td>
                    <td>
                      <code>/v1/messages</code>
                    </td>
                  </tr>
                  <tr>
                    <td>Gemini HTTP</td>
                    <td>
                      <code>{root}</code>
                    </td>
                    <td>
                      <code>/v1beta/models/…</code>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className={s.callout}>
              <Info size={17} />
              <p>
                {c(
                  'API 根地址和控制台地址可能不同。请使用平台提供的 API 地址，避免重复拼接 /v1。',
                  'The API and console may use different hosts. Use the API address provided by the platform and avoid duplicating /v1.'
                )}
              </p>
            </div>
            <SectionTitle id="key-security">
              {c('密钥管理', 'Key management')}
            </SectionTitle>
            <ul className={s.guideList}>
              <li>
                {c(
                  '在服务端环境变量中保存密钥，不要提交到代码仓库或打包进浏览器代码。',
                  'Store keys in server-side environment variables. Do not commit them to source control or bundle them into browser code.'
                )}
              </li>
              <li>
                {c(
                  '为不同应用创建独立密钥，设置合适的额度和有效期。',
                  'Create separate keys for different applications, with suitable spending limits and expiration dates.'
                )}
              </li>
              <li>
                {c(
                  '发现密钥泄露时，在控制台停用旧密钥并创建新密钥。',
                  'If a key is exposed, disable it in the console and create a replacement.'
                )}
              </li>
            </ul>
            <a href={keyHref} className={s.primaryLink}>
              {c('管理 API Key', 'Manage API keys')}
              <ArrowUpRight size={14} />
            </a>
          </>
        ) : (
          <>
            <SectionTitle id="status-codes">
              {c('HTTP 状态码', 'HTTP status codes')}
            </SectionTitle>
            <p className={s.paragraph}>
              {c(
                '先检查 HTTP 状态码，再读取响应中的 error.message 或 message。错误格式可能因接口协议和上游渠道而不同。',
                'Check the HTTP status first, then read error.message or message in the response. Error formats may differ by protocol and upstream channel.'
              )}
            </p>
            <div className={s.tableWrapper}>
              <table>
                <thead>
                  <tr>
                    <th>{c('状态码', 'Status')}</th>
                    <th>{c('含义', 'Meaning')}</th>
                    <th>{c('处理建议', 'What to do')}</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    [
                      '400',
                      c('请求参数不正确', 'Invalid request'),
                      c(
                        '检查模型、必填字段及参数类型。',
                        'Check the model, required fields, and parameter types.'
                      )
                    ],
                    [
                      '401',
                      c('身份验证失败', 'Authentication failed'),
                      c(
                        '检查 API Key、有效期、额度和鉴权请求头。',
                        'Check the API key, expiration, quota, and authentication header.'
                      )
                    ],
                    [
                      '403',
                      c('访问被拒绝', 'Access denied'),
                      c(
                        '检查账户状态及访问权限。',
                        'Check account status and access permissions.'
                      )
                    ],
                    [
                      '404',
                      c('路径或资源不存在', 'Not found'),
                      c(
                        '核对 API 地址、接口路径和模型 ID。',
                        'Verify the API host, endpoint path, and model ID.'
                      )
                    ],
                    [
                      '429',
                      c('限流或额度不足', 'Rate limit or quota exceeded'),
                      c(
                        '读取具体错误，降低并发或检查余额、额度。',
                        'Read the error, reduce concurrency, or check balance and quota.'
                      )
                    ],
                    [
                      '500 / 502 / 503',
                      c(
                        '服务或上游暂不可用',
                        'Service or upstream unavailable'
                      ),
                      c(
                        '稍后重试；持续失败时提供请求信息联系支持。',
                        'Retry later. If failures persist, contact support with request details.'
                      )
                    ]
                  ].map(([status, meaning, advice]) => (
                    <tr key={status}>
                      <td>
                        <code>{status}</code>
                      </td>
                      <td>{meaning}</td>
                      <td>{advice}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <SectionTitle id="retry">
              {c('重试策略', 'Retry strategy')}
            </SectionTitle>
            <p className={s.paragraph}>
              {c(
                '对临时网络错误、限流或服务不可用采用有上限的指数退避，并加入随机延迟。若响应包含 Retry-After，请优先遵循。参数错误或无效密钥应先修复再重试。',
                'Use bounded exponential backoff with jitter for temporary network errors, rate limits, and service unavailability. Honor Retry-After when present. Fix invalid parameters or credentials before retrying.'
              )}
            </p>
            <div className={s.callout}>
              <Info size={17} />
              <p>
                {c(
                  '超时不代表上游未执行。图像、音频等生成任务重试可能再次产生费用，请先检查用量记录。',
                  'A timeout does not guarantee that the upstream did not execute the request. Retrying image or audio generation may incur additional charges; check usage logs first.'
                )}
              </p>
            </div>
            <SectionTitle id="debugging">
              {c('排查请求', 'Debugging requests')}
            </SectionTitle>
            <ul className={s.guideList}>
              <li>
                {c(
                  '记录请求时间、模型 ID、HTTP 状态码和完整错误消息。',
                  'Record the request time, model ID, HTTP status, and full error message.'
                )}
              </li>
              <li>
                {c(
                  '在控制台核对账户余额、密钥额度和请求日志。',
                  'Review account balance, key limits, and request logs in the console.'
                )}
              </li>
              <li>
                {c(
                  '提供请求示例时，移除 API Key 和敏感输入。',
                  'Remove API keys and sensitive input before sharing a request example.'
                )}
              </li>
              <li>
                {c(
                  '流式请求在 HTTP 200 后仍可能出现错误，需要同时处理流内错误事件。',
                  'Streaming requests may fail after HTTP 200. Handle error events inside the stream as well.'
                )}
              </li>
            </ul>
          </>
        )}
      </article>
      <aside className={s.tableOfContents}>
        <div>
          <span>{c('本页内容', 'ON THIS PAGE')}</span>
          {sections.map(([id, label]) => (
            <a key={id} href={`#${id}`}>
              {label}
            </a>
          ))}
          <Link href="/docs/api/chat-completions">
            {c('浏览 API 参考', 'Explore the API reference')}
            <ArrowUpRight size={13} />
          </Link>
        </div>
      </aside>
    </div>
  );
}
