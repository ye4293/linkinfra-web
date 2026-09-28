export interface DateTimeRange {
  from: Date | undefined;
  to: Date | undefined;
}

export type RangePreset =
  | 'today'
  | 'yesterday'
  | 'week'
  | 'month'
  | 'thisWeek'
  | 'thisMonth';

export function presetRange(
  preset: RangePreset,
  now = new Date()
): DateTimeRange {
  const from = new Date(now);
  const to = new Date(now);
  from.setHours(0, 0, 0, 0);
  to.setHours(23, 59, 59, 999);
  if (preset === 'yesterday') {
    from.setDate(from.getDate() - 1);
    to.setDate(to.getDate() - 1);
  } else if (preset === 'week' || preset === 'month') {
    from.setDate(from.getDate() - (preset === 'week' ? 6 : 29));
  } else if (preset === 'thisWeek') {
    from.setDate(from.getDate() - ((from.getDay() + 6) % 7));
  } else if (preset === 'thisMonth') {
    from.setDate(1);
  }
  return { from, to };
}

export function validDateRange(range: DateTimeRange): boolean {
  return Boolean(
    range.from &&
      range.to &&
      Number.isFinite(range.from.getTime()) &&
      Number.isFinite(range.to.getTime()) &&
      range.from.getTime() <= range.to.getTime()
  );
}

export function rangeFromTimestamps(from: string, to: string): DateTimeRange {
  const parse = (value: string) => {
    if (!value.trim()) return undefined;
    const timestamp = Number(value);
    if (!Number.isFinite(timestamp)) return undefined;
    const date = new Date(timestamp * 1000);
    return Number.isFinite(date.getTime()) ? date : undefined;
  };
  return { from: parse(from), to: parse(to) };
}
