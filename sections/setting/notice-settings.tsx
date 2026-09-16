'use client';

import { useEffect, useState } from 'react';
import { useLocale } from '@/components/providers/locale-provider';
import { NoticeContent } from '@/components/site-notice';
import { readSiteNotice, saveSiteNotice } from '@/lib/site-notice';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent
} from '@/components/ui/card';
import { Megaphone } from 'lucide-react';
import { toast } from 'sonner';

export function NoticeSettings() {
  const { lang } = useLocale();
  const zh = lang === 'zh';
  const [content, setContent] = useState('');
  const [saved, setSaved] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    let active = true;
    setLoading(true);
    readSiteNotice(controller.signal)
      .then((text) => {
        if (active) {
          setContent(text);
          setSaved(text);
          setFailed(false);
        }
      })
      .catch(() => {
        if (active) setFailed(true);
      })
      .finally(() => {
        clearTimeout(timeout);
        if (active) setLoading(false);
      });
    return () => {
      active = false;
      controller.abort();
      clearTimeout(timeout);
    };
  }, [retry]);

  const save = async () => {
    setSaving(true);
    try {
      await saveSiteNotice(content);
      setSaved(content.trim());
      toast.success(zh ? '公告已保存。' : 'Announcement saved.');
    } catch {
      toast.error(
        zh ? '公告保存失败，请重试。' : 'Unable to save. Please retry.'
      );
    } finally {
      setSaving(false);
    }
  };
  return (
    <Card id="site-announcement">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Megaphone className="h-5 w-5" />
          {zh ? '网站公告' : 'Site announcement'}
        </CardTitle>
        <CardDescription>
          {zh
            ? '在首页和控制台首页展示维护通知、使用提示等内容。清空内容并保存即可隐藏。'
            : 'Display maintenance notices and tips on the homepage and Console overview. Clear the text and save to hide the announcement.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {failed && (
          <div
            role="alert"
            className="flex flex-wrap items-center gap-3 text-sm text-destructive"
          >
            {zh ? '公告加载失败，请重试。' : 'Unable to load the announcement.'}
            <Button
              variant="outline"
              size="sm"
              disabled={loading}
              onClick={() => setRetry((v) => v + 1)}
            >
              {zh ? '重试' : 'Retry'}
            </Button>
          </div>
        )}
        <div className="space-y-2">
          <Label htmlFor="site-notice-text">
            {zh ? '公告内容' : 'Announcement text'}
          </Label>
          <Textarea
            id="site-notice-text"
            rows={5}
            value={content}
            disabled={loading || saving || failed}
            onChange={(event) => setContent(event.target.value)}
            placeholder={
              zh
                ? '例如：部分模型将于今晚进行维护，请提前安排调用。'
                : 'Example: Some models will undergo maintenance tonight. Please plan your requests accordingly.'
            }
          />
          <p className="text-xs text-muted-foreground">
            {zh
              ? '支持多行纯文本，可同时填写中文与英文。公告会公开展示。'
              : 'Plain text with line breaks. You can include both Chinese and English. Announcements are public.'}
          </p>
        </div>
        {content.trim() && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">
              {zh ? '公告预览' : 'Announcement preview'}
            </p>
            <NoticeContent content={content} />
          </div>
        )}
        <Button
          disabled={loading || saving || failed || content.trim() === saved}
          onClick={save}
        >
          {loading
            ? zh
              ? '加载中…'
              : 'Loading…'
            : saving
            ? zh
              ? '保存中…'
              : 'Saving…'
            : zh
            ? '保存公告'
            : 'Save announcement'}
        </Button>
      </CardContent>
    </Card>
  );
}
