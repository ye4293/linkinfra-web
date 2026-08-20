import { renderQuota } from '@/utils/render';
import { ModelStat } from '@/lib/types/dashboard';

interface RecentSalesProps {
  dataList: ModelStat[];
}

export const RecentSales: React.FC<RecentSalesProps> = ({ dataList }) => {
  const maxQuota = Math.max(...dataList.map((item) => item.quota_sum), 0);

  if (!dataList.length) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No model usage in the last 24 hours
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {dataList.map((stat, index) => {
        const width = maxQuota > 0 ? (stat.quota_sum / maxQuota) * 100 : 0;
        return (
          <div className="space-y-2" key={stat.model_name}>
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                {index + 1}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm font-medium">
                {stat.model_name}
              </span>
              <span className="shrink-0 text-sm font-medium tabular-nums">
                {renderQuota(stat.quota_sum)}
              </span>
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
