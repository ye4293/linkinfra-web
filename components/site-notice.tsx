'use client';

import { useEffect, useId, useState } from 'react';
import { Megaphone, ChevronDown } from 'lucide-react';
import { useLocale } from '@/components/providers/locale-provider';
import { NOTICE_UPDATED_EVENT, readSiteNotice } from '@/lib/site-notice';
import { cn } from '@/lib/utils';

export function NoticeContent({
  content,
  className
}: {
  content: string;
  className?: string;
}) {
  const { lang } = useLocale();
  const zh = lang === 'zh';
  const id = useId();
  const [expanded, setExpanded] = useState(false);
  if (!content.trim()) return null;
  return (
    <section
      aria-label={zh ? '网站公告' : 'Site announcement'}
      className={cn(
        'rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-violet-950 dark:border-violet-800 dark:bg-violet-950 dark:text-violet-100',
        className
      )}
    >
      <div className="flex items-start gap-3">
        <Megaphone
          className="mt-0.5 h-5 w-5 shrink-0 text-violet-600 dark:text-violet-300"
          aria-hidden="true"
        />
        <div className="min-w-0 flex-1">
          <p className="mb-1 text-xs font-semibold tracking-wide text-violet-700 dark:text-violet-300">
            {zh ? '网站公告' : 'Announcement'}
          </p>
          <p
            id={id}
            className={cn(
              'whitespace-pre-wrap break-words text-sm leading-6 [overflow-wrap:anywhere]',
              !expanded && 'line-clamp-2'
            )}
          >
            {content}
          </p>
        </div>
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls={id}
          onClick={() => setExpanded(!expanded)}
          className="flex shrink-0 items-center gap-1 rounded px-1 py-1 text-xs font-medium text-violet-700 hover:bg-violet-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600 dark:text-violet-200 dark:hover:bg-violet-900"
        >
          {expanded ? (zh ? '收起' : 'Less') : zh ? '展开' : 'Read more'}
          <ChevronDown
            className={cn(
              'h-3.5 w-3.5 transition-transform motion-reduce:transition-none',
              expanded && 'rotate-180'
            )}
            aria-hidden="true"
          />
        </button>
      </div>
    </section>
  );
}

export function SiteNotice({ className }: { className?: string }) {
  const [content, setContent] = useState('');
  useEffect(() => {
    let controller: AbortController | undefined;
    const reload = async () => {
      if (document.visibilityState === 'hidden') return;
      controller?.abort();
      const request = new AbortController();
      controller = request;
      const timeout = setTimeout(() => request.abort(), 10000);
      try {
        const text = await readSiteNotice(request.signal);
        if (!request.signal.aborted) setContent(text);
      } catch {
        /* 公告读取失败不阻断页面。 */
      } finally {
        clearTimeout(timeout);
      }
    };
    void reload();
    const timer = setInterval(reload, 60000);
    window.addEventListener(NOTICE_UPDATED_EVENT, reload);
    window.addEventListener('focus', reload);
    return () => {
      controller?.abort();
      clearInterval(timer);
      window.removeEventListener(NOTICE_UPDATED_EVENT, reload);
      window.removeEventListener('focus', reload);
    };
  }, []);
  return (
    <NoticeContent key={content} content={content} className={className} />
  );
}
