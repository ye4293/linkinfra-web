'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useLocale } from '@/components/providers/locale-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent
} from '@/components/ui/card';
import { ExternalLink, Mail } from 'lucide-react';
import { toast } from 'sonner';

type Status = {
  configured: boolean;
  segment_id: string;
  stats: {
    total: number;
    synced: number;
    suppressed: number;
    pending: number;
    failed: number;
  };
};

export function NewsletterSettings() {
  const { lang } = useLocale();
  const zh = lang === 'zh';
  const c = (cn: string, en: string) => (zh ? cn : en);
  const { data: session } = useSession();
  const isRoot = Number(session?.user?.role) === 100;
  const isAdmin = [10, 100].includes(Number(session?.user?.role));
  const [status, setStatus] = useState<Status | null>(null);
  const [segment, setSegment] = useState('');
  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const refresh = useCallback(async (signal?: AbortSignal) => {
    const controller = new AbortController();
    const abort = () => controller.abort();
    if (signal?.aborted) return;
    signal?.addEventListener('abort', abort, { once: true });
    const timeout = setTimeout(abort, 12000);
    try {
      const response = await fetch('/api/newsletter/status', {
        cache: 'no-store',
        signal: controller.signal
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error();
      if (!signal?.aborted) {
        setStatus(result.data);
        setLoadError(false);
      }
    } catch {
      if (!signal?.aborted) setLoadError(true);
    } finally {
      clearTimeout(timeout);
      signal?.removeEventListener('abort', abort);
    }
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    const controller = new AbortController();
    void refresh(controller.signal);
    const timer = setInterval(() => void refresh(controller.signal), 15000);
    return () => {
      controller.abort();
      clearInterval(timer);
    };
  }, [isAdmin, refresh]);

  async function action(path: 'config' | 'sync', body: object) {
    if (busy) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/newsletter/${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(20000)
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        const code = result.error?.message || result.message;
        if (
          code === 'resend_not_configured' ||
          code === 'resend_http_401' ||
          code === 'resend_http_403'
        ) {
          throw new Error(
            c(
              '请先在上方保存具备 Full access 权限的 Resend API Key。',
              'Save a Resend API key with Full access above first.'
            )
          );
        }
        if (code === 'invalid_segment' || code === 'resend_http_404') {
          throw new Error(
            c(
              '分组 ID 无效，请检查当前 Resend 账户中的分组。',
              'Invalid segment ID. Check the segment in your Resend account.'
            )
          );
        }
        throw new Error(
          c(
            '操作失败，请检查 Resend 配置并稍后重试。',
            'Operation failed. Check your Resend configuration and try again.'
          )
        );
      }
      if (path === 'config') setSegment('');
      toast.success(
        path === 'config'
          ? c(
              '订阅分组已保存，邮箱将自动同步。',
              'Segment saved. Contacts will sync automatically.'
            )
          : c(
              '已安排重试，请稍后刷新同步状态。',
              'Retry queued. Refresh shortly to check progress.'
            )
      );
      await refresh();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : c('操作失败', 'Operation failed')
      );
    } finally {
      setBusy(false);
    }
  }

  if (!isAdmin) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          {c('邮件订阅与群发', 'Newsletter & broadcasts')}
        </CardTitle>
        <CardDescription>
          {c(
            '首页订阅邮箱自动同步到 Resend 分组。在 Resend 中编辑、预览和定时群发，并管理退订。',
            'Homepage subscriptions sync to a Resend segment. Compose, preview, schedule broadcasts, and manage unsubscribes in Resend.'
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <p className="text-sm text-muted-foreground">
          {c(
            '使用上方的 Resend API Key（需 Full access 权限）和已验证的发件域名。只有主动订阅的邮箱会加入分组。',
            'Use the Resend API key above with Full access and a verified sender domain. Only explicit newsletter signups are added.'
          )}
        </p>
        {loadError && (
          <p role="alert" className="text-sm text-destructive">
            {c(
              '无法读取同步状态，请刷新重试。',
              'Unable to load sync status. Please refresh.'
            )}
          </p>
        )}
        {!status && !loadError && (
          <p role="status">{c('正在读取…', 'Loading…')}</p>
        )}
        {status && (
          <>
            <p className="break-all text-sm">
              {c('当前分组：', 'Current segment: ')}
              {status.segment_id || c('尚未配置', 'Not configured')}
            </p>
            {!status.configured && (
              <p className="text-sm text-amber-600">
                {c(
                  '订阅已保存在本站；配置完成后会自动补同步到 Resend。',
                  'Subscriptions are stored locally and will sync once configuration is complete.'
                )}
              </p>
            )}
            <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
              {[
                [c('订阅记录', 'Signups'), status.stats.total],
                [c('已同步', 'Synced'), status.stats.synced],
                [c('待同步', 'Pending'), status.stats.pending],
                [c('同步失败', 'Failed'), status.stats.failed]
              ].map(([label, count]) => (
                <div key={label}>
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd className="mt-1 text-xl font-semibold">{count}</dd>
                </div>
              ))}
            </dl>
            <p className="text-xs text-muted-foreground">
              {c(
                `同步时发现已退订：${status.stats.suppressed}。实际可发送人数和最新退订状态以 Resend 为准。`,
                `Opt-outs found during sync: ${status.stats.suppressed}. Resend determines current eligibility and unsubscribe status.`
              )}
            </p>
          </>
        )}
        {isRoot && (
          <div className="space-y-2">
            <Label htmlFor="newsletter-segment">
              {c(
                '使用已有 Resend Segment ID',
                'Use an existing Resend segment ID'
              )}
            </Label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                id="newsletter-segment"
                value={segment}
                onChange={(e) => setSegment(e.target.value)}
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                disabled={busy}
              />
              <Button
                disabled={busy || !segment.trim()}
                onClick={() => action('config', { segment_id: segment.trim() })}
              >
                {c('保存分组', 'Save segment')}
              </Button>
              <Button
                variant="outline"
                disabled={busy || !status || Boolean(status.segment_id)}
                onClick={() => action('config', { create: true })}
              >
                {c('创建订阅分组', 'Create segment')}
              </Button>
            </div>
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            disabled={busy || !status?.configured}
            onClick={() => action('sync', {})}
          >
            {c('重试待同步邮箱', 'Retry pending sync')}
          </Button>
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => void refresh()}
          >
            {c('刷新状态', 'Refresh')}
          </Button>
          <Button asChild>
            <a
              href="https://resend.com/broadcasts"
              target="_blank"
              rel="noopener noreferrer"
            >
              {c('前往 Resend 群发', 'Open Resend Broadcasts')}
              <ExternalLink className="ml-2 h-4 w-4" />
            </a>
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          {c(
            '群发时选择上方分组，填写主题和正文，添加退订链接，再预览并发送。同步邮箱不会自动发送邮件。',
            'Choose the segment above, compose your message, add the unsubscribe footer, then preview and send. Syncing contacts does not send email.'
          )}
        </p>
      </CardContent>
    </Card>
  );
}
