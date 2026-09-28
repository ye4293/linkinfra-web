'use client';

import { useId, useState } from 'react';
import { format } from 'date-fns';
import { enUS, zhCN } from 'date-fns/locale';
import { CalendarIcon } from '@radix-ui/react-icons';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogTrigger
} from '@/components/ui/dialog';
import { useText } from '@/components/locale-text';
import { useLocale } from '@/components/providers/locale-provider';
import { cn } from '@/lib/utils';
import {
  DateTimeRange,
  RangePreset,
  presetRange,
  validDateRange
} from '@/lib/date-time-range';

const presets: { id: RangePreset; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'yesterday', label: 'Yesterday' },
  { id: 'week', label: 'Last 7 days' },
  { id: 'month', label: 'Last 30 days' },
  { id: 'thisWeek', label: 'This week' },
  { id: 'thisMonth', label: 'This month' }
];
const emptyRange: DateTimeRange = { from: undefined, to: undefined };

export function DateTimeRangePicker({
  value,
  onValueChange,
  className
}: {
  value?: DateTimeRange;
  onValueChange?: (value: DateTimeRange | undefined) => void;
  className?: string;
}) {
  const tr = useText();
  const { lang } = useLocale();
  const id = useId();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DateTimeRange>(value || emptyRange);
  const [active, setActive] = useState<'from' | 'to'>('from');
  const [month, setMonth] = useState(value?.from || new Date());
  const [timezone, setTimezone] = useState('');
  const locale = lang === 'zh' ? zhCN : enUS;
  const display = (date?: Date) =>
    date && Number.isFinite(date.getTime())
      ? format(date, 'yyyy-MM-dd HH:mm:ss')
      : tr('Not selected');
  const valid = validDateRange(draft);
  const reversed = draft.from && draft.to && draft.from > draft.to;

  const changeOpen = (next: boolean) => {
    if (next) {
      setDraft(value || emptyRange);
      setActive('from');
      setMonth(value?.from || new Date());
      setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone);
    }
    setOpen(next);
  };
  const selectDay = (day: Date) => {
    const date = new Date(day);
    const previous = draft[active];
    date.setHours(
      previous?.getHours() ?? (active === 'from' ? 0 : 23),
      previous?.getMinutes() ?? (active === 'from' ? 0 : 59),
      previous?.getSeconds() ?? (active === 'from' ? 0 : 59),
      0
    );
    setDraft({ ...draft, [active]: date });
    if (active === 'from') setActive('to');
  };
  const changeTime = (
    part: 'hours' | 'minutes' | 'seconds',
    amount: number
  ) => {
    if (!draft[active]) return;
    const date = new Date(draft[active]!);
    if (part === 'hours') date.setHours(amount);
    else if (part === 'minutes') date.setMinutes(amount);
    else date.setSeconds(amount);
    setDraft({ ...draft, [active]: date });
  };

  return (
    <div className={cn('grid min-w-0 gap-2', className)}>
      <Dialog open={open} onOpenChange={changeOpen}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            aria-label={tr('Select date range')}
            className="w-full min-w-0 justify-start text-left font-normal sm:max-w-[420px]"
          >
            <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
            <span className="truncate text-xs sm:text-sm">
              {value?.from || value?.to
                ? `${display(value.from)} → ${display(value.to)}`
                : tr('All time')}
            </span>
          </Button>
        </DialogTrigger>
        <DialogContent
          aria-label={tr('Select date range')}
          className="block max-h-[calc(100dvh-24px)] w-[560px] max-w-[calc(100vw-24px)] overflow-y-auto p-0"
        >
          <div className="space-y-4 p-3 sm:p-4">
            <div>
              <DialogTitle className="pr-6 font-semibold">
                {tr('Select date range')}
              </DialogTitle>
              <DialogDescription className="mt-1 text-xs text-muted-foreground">
                {tr('Times use your local timezone')}
                {timezone ? ` · ${timezone}` : ''}
              </DialogDescription>
            </div>
            <div
              className="flex flex-wrap gap-2"
              role="group"
              aria-label={tr('Quick select')}
            >
              {presets.map((preset) => (
                <Button
                  key={preset.id}
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const range = presetRange(preset.id);
                    setDraft(range);
                    setMonth(range.from!);
                    setActive('from');
                  }}
                >
                  {tr(preset.label)}
                </Button>
              ))}
            </div>
            <div
              className="grid grid-cols-1 gap-2 sm:grid-cols-2"
              role="group"
              aria-label={tr('Range endpoints')}
            >
              {(['from', 'to'] as const).map((endpoint) => (
                <button
                  key={endpoint}
                  type="button"
                  aria-pressed={active === endpoint}
                  aria-label={tr(
                    endpoint === 'from'
                      ? 'Start date and time'
                      : 'End date and time'
                  )}
                  className={cn(
                    'rounded-lg border p-3 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary',
                    active === endpoint && 'border-primary bg-primary/5'
                  )}
                  onClick={() => {
                    setActive(endpoint);
                    setMonth(draft[endpoint] || new Date());
                  }}
                >
                  <span className="block text-xs font-medium text-muted-foreground">
                    {tr(endpoint === 'from' ? 'Start' : 'End')}
                  </span>
                  <span className="mt-1 block text-sm tabular-nums">
                    {display(draft[endpoint])}
                  </span>
                </button>
              ))}
            </div>
            <p
              id={`${id}-hint`}
              className="text-sm font-medium"
              aria-live="polite"
            >
              {tr(
                active === 'from'
                  ? 'Choose the start date'
                  : 'Choose the end date'
              )}
            </p>
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
              <Calendar
                mode="range"
                locale={locale}
                month={month}
                onMonthChange={setMonth}
                selected={
                  reversed ? { from: draft[active], to: draft[active] } : draft
                }
                onDayClick={(day, modifiers) => {
                  if (!modifiers.disabled) selectDay(day);
                }}
                disabled={{ after: new Date(), before: new Date(1900, 0, 1) }}
                className="shrink-0 rounded-lg border p-2"
                aria-describedby={`${id}-hint`}
              />
              <div className="w-full min-w-0 space-y-3">
                <p className="text-xs font-medium">
                  {tr(active === 'from' ? 'Start time' : 'End time')}
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {(['hours', 'minutes', 'seconds'] as const).map((part) => (
                    <label
                      key={part}
                      className="min-w-0 space-y-1 text-xs text-muted-foreground"
                    >
                      <span>
                        {tr(
                          part === 'hours'
                            ? 'Hour'
                            : part === 'minutes'
                            ? 'Minute'
                            : 'Second'
                        )}
                      </span>
                      <select
                        className="h-10 w-full rounded-md border bg-background px-1 text-sm text-foreground"
                        aria-label={tr(
                          part === 'hours'
                            ? 'Hour'
                            : part === 'minutes'
                            ? 'Minute'
                            : 'Second'
                        )}
                        disabled={!draft[active]}
                        value={
                          draft[active]
                            ? part === 'hours'
                              ? draft[active]!.getHours()
                              : part === 'minutes'
                              ? draft[active]!.getMinutes()
                              : draft[active]!.getSeconds()
                            : 0
                        }
                        onChange={(event) =>
                          changeTime(part, Number(event.target.value))
                        }
                      >
                        {Array.from(
                          { length: part === 'hours' ? 24 : 60 },
                          (_, n) => (
                            <option key={n} value={n}>
                              {String(n).padStart(2, '0')}
                            </option>
                          )
                        )}
                      </select>
                    </label>
                  ))}
                </div>
                <p className="text-xs leading-5 text-muted-foreground">
                  {tr(
                    'Select Start or End above to adjust that date and time. Changes take effect when you apply.'
                  )}
                </p>
                {reversed && (
                  <p role="alert" className="text-sm text-destructive">
                    {tr('End must be on or after Start.')}
                  </p>
                )}
              </div>
            </div>
          </div>
          <div className="sticky bottom-0 flex flex-wrap items-center justify-between gap-2 border-t bg-popover p-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                onValueChange?.(undefined);
                setOpen(false);
              }}
            >
              {tr('All time')}
            </Button>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setOpen(false)}
              >
                {tr('Cancel')}
              </Button>
              <Button
                size="sm"
                disabled={!valid}
                onClick={() => {
                  if (valid) {
                    onValueChange?.(draft);
                    setOpen(false);
                  }
                }}
              >
                {tr('Apply range')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
