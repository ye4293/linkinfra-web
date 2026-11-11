import { renderQuota } from '@/utils/render';
import { SourceStat } from '@/lib/types/dashboard';
import { cn } from '@/lib/utils';

interface SourceUsageProps {
  dataList: SourceStat[];
}

// 来源的分组方式；已删除渠道的名称本身已说明来源，不再重复标注
const KIND_LABELS: Record<SourceStat['kind'], string> = {
  tag: 'Billing tag',
  channel_type: 'Channel type',
  deleted: ''
};

function sourceKey(stat: SourceStat) {
  return `${stat.kind}:${stat.tag ?? stat.channel_type ?? ''}`;
}

function sourceName(stat: SourceStat) {
  if (stat.kind === 'deleted') return 'Deleted channels';
  return stat.name || stat.tag || `Channel type ${stat.channel_type ?? ''}`;
}

/**
 * 管理员总览：最近 24 小时按来源的消耗。
 * 打了计费标签的渠道按标签归组，其余按渠道类型归组（归组在后端完成，按消耗降序返回）。
 */
export const SourceUsage: React.FC<SourceUsageProps> = ({ dataList }) => {
  if (!dataList.length) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        No usage in the last 24 hours
      </p>
    );
  }

  const total = dataList.reduce((sum, item) => sum + item.quota_sum, 0);
  const maxQuota = Math.max(...dataList.map((item) => item.quota_sum), 0);

  return (
    <div className="grid gap-x-8 gap-y-4 md:grid-cols-2">
      {dataList.map((stat, index) => {
        const width = maxQuota > 0 ? (stat.quota_sum / maxQuota) * 100 : 0;
        const share = total > 0 ? (stat.quota_sum / total) * 100 : 0;
        const name = sourceName(stat);
        const kindLabel = KIND_LABELS[stat.kind];
        return (
          <div className="min-w-0 space-y-2" key={sourceKey(stat)}>
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                {index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p
                  className={cn(
                    'truncate text-sm font-medium',
                    stat.kind === 'tag' && 'font-mono'
                  )}
                  title={name}
                >
                  {name}
                </p>
                {kindLabel && (
                  <p className="text-xs text-muted-foreground">{kindLabel}</p>
                )}
              </div>
              <div className="shrink-0 text-right">
                <p className="text-sm font-medium tabular-nums">
                  {renderQuota(stat.quota_sum)}
                </p>
                <p className="text-xs tabular-nums text-muted-foreground">
                  {share.toFixed(1)}%
                </p>
              </div>
            </div>
            <div className="ml-10 h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary/70"
                style={{ width: `${Math.max(width, width > 0 ? 3 : 0)}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};
