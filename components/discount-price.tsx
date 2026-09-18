import { formatPrice } from '@/components/landing/catalog';

export function DiscountPrice({
  original,
  final,
  unit = ''
}: {
  original: number | undefined;
  final: number | undefined;
  unit?: string;
}) {
  const discounted =
    original != null && final != null && original > 0 && final < original;
  return (
    <span className="inline-flex flex-wrap items-baseline gap-x-2 gap-y-1">
      {discounted && (
        <span className="text-xs font-normal text-muted-foreground/70 line-through">
          {formatPrice(original)}
          {unit}
        </span>
      )}
      <span>
        {formatPrice(final)}
        {unit}
      </span>
      {discounted && (
        <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
          {Number(((1 - final! / original!) * 100).toFixed(2))}% OFF
        </span>
      )}
    </span>
  );
}
