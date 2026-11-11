'use client';

import React, { useEffect, useId, useState } from 'react';
import { Control, useController } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { useLocale } from '@/components/providers/locale-provider';
import { cn } from '@/lib/utils';
import {
  BillingTagRow,
  BillingTagUsage,
  ChannelRatios,
  billingTagKey,
  billingTagRows,
  hasChannelTypeRatios,
  withRatioInput,
  withoutChannelTypeRatios
} from '@/lib/channel-ratios';
import { RotateCcw, Search, SlidersHorizontal, X } from 'lucide-react';

interface ChannelTypeOption {
  key: number;
  value: number;
  text: string;
  color?: string;
}

interface Props {
  control: Control<any>;
}

interface RatioRowProps {
  label: string;
  /** 标签名是标识符，用等宽字体 */
  mono?: boolean;
  hint: string;
  hintClassName: string;
  placeholder: string;
  value: number | undefined;
  onChange: (raw: string) => void;
}

/**
 * 一行折扣输入。值直接读写整个 channel_ratios 对象，不为每一行单独注册表单字段：
 * 按行注册会把没填的 key 写成 undefined，使整个表单校验失败、无法保存；
 * 带点号的标签 key 还会被当成嵌套路径。
 */
function RatioRow({
  label,
  mono,
  hint,
  hintClassName,
  placeholder,
  value,
  onChange
}: RatioRowProps) {
  const inputId = useId();
  // 正在输入的文本。逐键输入 "0.7" 会先经过 "0" 这种还不是合法折扣的中间态，
  // 这时如果按已生效的值重绘输入框，选中旧值 0.85 再输入 0.7 会变成 0.857。
  // 所以聚焦期间显示用户输入的文本，失焦后再回到已生效的值。
  const [draft, setDraft] = useState<string | null>(null);
  const committed = value === undefined ? '' : String(value);
  return (
    <div className="group flex min-h-14 items-center justify-between gap-3 rounded-lg border bg-card px-3 py-2 transition-colors hover:border-primary/40 hover:bg-muted/20">
      <div className="min-w-0 flex-1">
        <Label
          htmlFor={inputId}
          title={label}
          className={cn(
            'm-0 block truncate text-sm font-medium',
            mono && 'font-mono'
          )}
        >
          {label}
        </Label>
        <span className={cn('block truncate text-xs', hintClassName)}>
          {hint}
        </span>
      </div>
      <Input
        id={inputId}
        type="number"
        step="0.01"
        min="0"
        placeholder={placeholder}
        className="h-9 w-24 text-right tabular-nums"
        value={draft ?? committed}
        onChange={(e) => {
          const raw = e.target.value;
          setDraft(raw);
          // "." 这类浏览器认不出的输入，value 是空串，但不代表用户清空了折扣
          if (raw === '' && e.target.validity.badInput) return;
          onChange(raw);
        }}
        onBlur={(e) => {
          setDraft(null);
          // 留下的是浏览器认不出的输入时 value 一直是空串，React 认为没有变化、不会重绘，手动恢复
          if (e.target.validity.badInput) e.target.value = committed;
        }}
      />
    </div>
  );
}

function channelCountText(count: number) {
  return `${count} channel${count === 1 ? '' : 's'}`;
}

/**
 * 管理员在"编辑用户"页为当前用户设置额外折扣，按渠道的计费标签或按渠道类型。
 * 渠道有计费标签且这里配置了该标签时用标签折扣，否则用渠道类型折扣，都没有则为 1.0；
 * 标签折扣覆盖类型折扣，两者不相乘。
 * final = model_price × channel_discount × tier_discount × user_channel_ratio。
 */
export default function ChannelRatiosEditor({ control }: Props) {
  const { t } = useLocale();
  const [channelTypes, setChannelTypes] = useState<ChannelTypeOption[]>([]);
  // null 表示标签列表加载失败，此时无法判断已配置的标签是否还在使用
  const [channelTags, setChannelTags] = useState<BillingTagUsage[] | null>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [onlyCustomized, setOnlyCustomized] = useState(false);
  const [bulkRatio, setBulkRatio] = useState('');

  const { field } = useController({
    control,
    name: 'channel_ratios',
    defaultValue: {}
  });

  useEffect(() => {
    let cancelled = false;
    async function loadTypes() {
      try {
        const res = await fetch('/api/channel/types', {
          credentials: 'include'
        });
        const json = await res.json();
        const list: ChannelTypeOption[] = (json.data || []).map(
          (item: any) => ({
            key: item.key ?? item.value,
            value: item.value,
            text: item.text ?? String(item.value),
            color: item.color
          })
        );
        if (!cancelled) {
          setChannelTypes(list);
        }
      } catch (err) {
        console.error('Failed to load channel types:', err);
      }
    }
    async function loadTags() {
      try {
        const res = await fetch('/api/channel/billing_tags', {
          credentials: 'include'
        });
        const json = await res.json();
        if (!res.ok || !json.success || !Array.isArray(json.data)) {
          throw new Error(json.message || `HTTP ${res.status}`);
        }
        if (!cancelled) setChannelTags(json.data);
      } catch {
        if (!cancelled) setChannelTags(null);
      }
    }
    Promise.all([loadTypes(), loadTags()]).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const ratios: ChannelRatios = field.value || {};

  const setRatio = (key: string, raw: string) => {
    const next = withRatioInput(ratios, key, raw);
    // 非法输入时保留原状
    if (next) field.onChange(next);
  };

  const tagRows = billingTagRows(ratios, channelTags);

  const filteredTypes = channelTypes.filter((ct) => {
    const matchesQuery = ct.text.toLowerCase().includes(query.toLowerCase());
    const matchesCustomized =
      !onlyCustomized || ratios[String(ct.value)] !== undefined;
    return matchesQuery && matchesCustomized;
  });

  const applyBulkRatio = () => {
    const value = Number(bulkRatio);
    if (!Number.isFinite(value) || value <= 0) return;
    const next = { ...ratios };
    filteredTypes.forEach((ct) => {
      next[String(ct.value)] = value;
    });
    field.onChange(next);
    setBulkRatio('');
  };

  const renderTagRow = (row: BillingTagRow) => {
    const key = billingTagKey(row.tag);
    if (row.status === 'active') {
      const customized = row.ratio !== undefined;
      return (
        <RatioRow
          key={row.tag}
          label={row.tag}
          mono
          hint={`${channelCountText(row.channelCount)} · ${
            customized ? 'Custom override' : 'Uses type discount'
          }`}
          hintClassName={
            customized ? 'font-medium text-primary' : 'text-muted-foreground'
          }
          placeholder="—"
          value={row.ratio}
          onChange={(raw) => setRatio(key, raw)}
        />
      );
    }
    // 不在渠道标签列表里的已保存折扣：只读，可以移除
    return (
      <div
        key={row.tag}
        className="flex min-h-14 items-center justify-between gap-3 rounded-lg border border-dashed bg-card px-3 py-2"
      >
        <div className="min-w-0 flex-1">
          <p className="truncate font-mono text-sm font-medium" title={row.tag}>
            {row.tag}
          </p>
          <span
            className={cn(
              'block truncate text-xs',
              row.status === 'unused'
                ? 'text-amber-700 dark:text-amber-400'
                : 'text-muted-foreground'
            )}
          >
            {row.status === 'unused'
              ? 'Not used by any channel'
              : 'Saved discount'}
          </span>
        </div>
        <span className="text-sm tabular-nums">{row.ratio}</span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          aria-label={`Remove discount for ${row.tag}`}
          onClick={() => setRatio(key, '')}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <div className="rounded-xl border bg-muted/35 p-4 sm:p-5">
          <h3 className="text-base font-semibold tracking-tight">
            {t.channelRatios.tagTitle}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {t.channelRatios.tagDescription}
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {[...Array(2)].map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : (
          <>
            {channelTags === null && (
              <p role="alert" className="text-sm text-destructive">
                {t.channelRatios.tagLoadFailed}
              </p>
            )}
            {tagRows.length > 0 ? (
              <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2 xl:grid-cols-3">
                {tagRows.map(renderTagRow)}
              </div>
            ) : (
              channelTags !== null && (
                <div className="rounded-lg border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
                  {t.channelRatios.tagEmpty}
                </div>
              )
            )}
          </>
        )}
      </section>

      <Separator />

      <section className="space-y-5">
        <div className="rounded-xl border bg-muted/35 p-4 sm:p-5">
          <h3 className="text-base font-semibold tracking-tight">
            {t.channelRatios.title}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {t.channelRatios.descriptionPrefix}
            <code className="mx-1 rounded bg-background px-1.5 py-0.5 text-xs text-foreground shadow-sm">
              {t.channelRatios.formulaCode}
            </code>
            {t.channelRatios.descriptionSuffix}
          </p>
        </div>

        <div className="grid gap-3 lg:grid-cols-[minmax(220px,1fr)_auto_auto]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search channel types"
              className="h-10 pl-9 pr-9"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <Button
            type="button"
            variant={onlyCustomized ? 'default' : 'outline'}
            onClick={() => setOnlyCustomized((value) => !value)}
            className="h-10 justify-start lg:justify-center"
          >
            <SlidersHorizontal className="mr-2 h-4 w-4" />
            Customized only
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => field.onChange(withoutChannelTypeRatios(ratios))}
            disabled={!hasChannelTypeRatios(ratios)}
            className="h-10 justify-start lg:justify-center"
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset channel types
          </Button>
        </div>

        <div className="flex flex-col gap-3 rounded-lg border border-dashed bg-muted/20 p-3 sm:flex-row sm:items-center">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">Bulk set visible channels</p>
            <p className="text-xs text-muted-foreground">
              Applies to {filteredTypes.length} matching channel type
              {filteredTypes.length === 1 ? '' : 's'}.
            </p>
          </div>
          <div className="flex gap-2">
            <Input
              type="number"
              step="0.01"
              min="0.01"
              value={bulkRatio}
              onChange={(e) => setBulkRatio(e.target.value)}
              placeholder="e.g. 0.85"
              className="h-9 min-w-0 flex-1 sm:w-32"
            />
            <Button
              type="button"
              size="sm"
              onClick={applyBulkRatio}
              disabled={!bulkRatio}
            >
              Apply
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {[...Array(8)].map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2 xl:grid-cols-3">
            {filteredTypes.map((ct) => {
              const key = String(ct.value);
              const currentVal = ratios[key];
              return (
                <RatioRow
                  key={ct.value}
                  label={ct.text}
                  hint={
                    currentVal === undefined
                      ? 'Default · 1.00'
                      : 'Custom override'
                  }
                  hintClassName={
                    currentVal === undefined
                      ? 'text-muted-foreground'
                      : 'font-medium text-primary'
                  }
                  placeholder="1.0"
                  value={currentVal}
                  onChange={(raw) => setRatio(key, raw)}
                />
              );
            })}
            {filteredTypes.length === 0 && (
              <div className="col-span-full rounded-lg border border-dashed py-12 text-center text-sm text-muted-foreground">
                No channel types match your filters.
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
