'use client';

import { formatPrice } from '@/components/landing/catalog';
import { useLocale } from '@/components/providers/locale-provider';

export function DurationPrice({ value }: { value?: number }) {
  const { lang } = useLocale();
  return (
    <span>
      {formatPrice(value)}
      {lang === 'zh' ? ' / 分钟' : ' / min'}
    </span>
  );
}
