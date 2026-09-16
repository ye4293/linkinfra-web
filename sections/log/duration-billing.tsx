'use client';

import { useLocale } from '@/components/providers/locale-provider';
import { parseAudioBilling } from '@/lib/audio-billing';
import { DurationPrice } from '@/components/duration-price';

export function DurationBilling({
  other,
  quota
}: {
  other: unknown;
  quota: number;
}) {
  const { lang } = useLocale();
  const data = parseAudioBilling(other);
  if (!data) return null;
  const zh = lang === 'zh';
  const known = data.source === 'upstream' && data.seconds !== null;
  return (
    <section className="mt-4 space-y-2 border-t pt-4 text-sm">
      <h3 className="font-medium">
        {zh ? '音频时长计费' : 'Audio duration billing'}
      </h3>
      <p>
        {zh ? '上游音频时长：' : 'Upstream audio duration: '}
        {known
          ? `${data.seconds} ${zh ? '秒' : 'seconds'}`
          : zh
          ? '未提供有效时长，未按 Token 估算费用。'
          : 'No valid duration reported; token counts were not used to estimate charges.'}
      </p>
      <p>
        {zh ? '分钟单价：' : 'Minute price: '}
        <DurationPrice value={data.price ?? undefined} />
      </p>
      {known && data.price !== null && data.ratio !== null && (
        <p className="break-words rounded bg-muted/50 p-2 font-mono text-xs">
          {data.seconds} / 60 × ${data.price} × {data.ratio}
        </p>
      )}
      <p>
        {zh ? '实际结算额度：' : 'Settled quota: '}
        {quota.toLocaleString()} quota
      </p>
      <p className="text-xs text-muted-foreground">
        {zh
          ? '按请求开始时的价格与组合倍率计算，最后按内部额度取整。'
          : 'Uses the price and combined multiplier at request start, rounded once to internal quota.'}
      </p>
    </section>
  );
}
