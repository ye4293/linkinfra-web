'use client';

import type { ModelMetricsMini } from '@/lib/types/model-metrics';
import { useLocale } from '@/components/providers/locale-provider';
import s from './home.module.css';

export function ModelMetrics({ metrics }: { metrics?: ModelMetricsMini }) {
  const { lang } = useLocale();
  const zh = lang === 'zh';
  const hasData =
    metrics && metrics.status !== 'no_data' && metrics.total_requests_24h > 0;
  const value = (number: number | undefined, digits: number, suffix: string) =>
    hasData && typeof number === 'number' && Number.isFinite(number)
      ? `${number.toFixed(digits)}${suffix}`
      : '—';

  return (
    <div
      className={s.modelMetrics}
      title={
        hasData
          ? zh
            ? '近 24 小时采集的运行指标'
            : 'Observed metrics over the past 24 hours'
          : zh
          ? '暂无可用监控数据'
          : 'No monitoring data available'
      }
    >
      <div>
        <span>{zh ? '成功率 · 24h' : 'SUCCESS · 24H'}</span>
        <strong>
          {value(metrics ? metrics.success_rate * 100 : undefined, 1, '%')}
        </strong>
      </div>
      <div>
        <span>{zh ? '平均耗时' : 'AVG. LATENCY'}</span>
        <strong>{value(metrics?.avg_latency, 1, 's')}</strong>
      </div>
      <div>
        <span>{zh ? '输出速度' : 'OUTPUT SPEED'}</span>
        <strong>{value(metrics?.avg_speed, 0, ' t/s')}</strong>
      </div>
    </div>
  );
}
