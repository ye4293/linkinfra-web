'use client';

import React, { useEffect, useState } from 'react';
import { Control, useController } from 'react-hook-form';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useLocale } from '@/components/providers/locale-provider';
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

/**
 * 管理员在"编辑用户"弹窗中为当前用户针对单个渠道类型设置折扣倍率。
 * 和等级折扣、渠道折扣一起相乘：final = model_price × channel_discount × tier_discount × user_channel_ratio。
 * 留空视为 1.0（不打折）。
 */
export default function ChannelRatiosEditor({ control }: Props) {
  const { t } = useLocale();
  const [channelTypes, setChannelTypes] = useState<ChannelTypeOption[]>([]);
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
    async function load() {
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
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const ratios: Record<string, number> = field.value || {};

  const handleChange = (channelValue: number, raw: string) => {
    const next: Record<string, number> = { ...ratios };
    const key = String(channelValue);
    const trimmed = raw.trim();
    if (trimmed === '') {
      delete next[key];
    } else {
      const num = Number(trimmed);
      if (Number.isFinite(num) && num > 0) {
        next[key] = num;
      } else {
        // 非法输入时保留原状，等 blur/提交时再校验
        return;
      }
    }
    field.onChange(next);
  };

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

  return (
    <div className="space-y-5">
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
          onClick={() => field.onChange({})}
          disabled={Object.keys(ratios).length === 0}
          className="h-10 justify-start lg:justify-center"
        >
          <RotateCcw className="mr-2 h-4 w-4" />
          Reset all
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
            const fieldKey = String(ct.value);
            const currentVal = ratios[fieldKey];
            return (
              <FormField
                key={ct.value}
                control={control}
                name={`channel_ratios.${fieldKey}` as const}
                render={() => (
                  <FormItem className="group flex min-h-14 items-center justify-between gap-3 rounded-lg border bg-card px-3 py-2 transition-colors hover:border-primary/40 hover:bg-muted/20">
                    <div className="min-w-0 flex-1">
                      <FormLabel className="m-0 block truncate text-sm font-medium">
                        {ct.text}
                      </FormLabel>
                      <span
                        className={
                          currentVal === undefined
                            ? 'text-xs text-muted-foreground'
                            : 'text-xs font-medium text-primary'
                        }
                      >
                        {currentVal === undefined
                          ? 'Default · 1.00'
                          : 'Custom override'}
                      </span>
                    </div>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="1.0"
                        className="h-9 w-24 text-right tabular-nums"
                        value={
                          currentVal === undefined ? '' : String(currentVal)
                        }
                        onChange={(e) => handleChange(ct.value, e.target.value)}
                      />
                    </FormControl>
                  </FormItem>
                )}
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
    </div>
  );
}
