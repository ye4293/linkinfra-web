import { Result } from '@/lib/types/common';

export interface Dashboard {
  current_quota: number;
  used_quota: number;
  topup_quota: number;
  gift_quota: number;
  tpm: number;
  rpm: number;
  quota_pm: number;
  request_pd: number;
  used_pd: number;
  model_stats?: ModelStat[];
  user_stats?: UserStat[];
  source_stats?: SourceStat[];
  recharge_amount?: number;
  hourly?: DashboardHourlyStat[];
  cached_until?: number;
}

export interface ModelStat {
  model_name: string;
  quota_sum: number;
}

export interface UserStat {
  user_id: number;
  username: string;
  quota_sum: number;
}

/**
 * 一个来源在统计窗口内的消耗（仅管理员）。
 * tag：打了计费标签的渠道，按标签归组；channel_type：没有标签的渠道，按渠道类型归组；
 * deleted：渠道已删除，合并为一项（name 为空）。
 */
export interface SourceStat {
  kind: 'tag' | 'channel_type' | 'deleted';
  tag?: string;
  channel_type?: number;
  name: string;
  quota_sum: number;
}

export interface DashboardHourlyStat {
  hour: string;
  timestamp: number;
  consumption: number;
  tokens: number;
  times: number;
}

export interface DashboardStatsResult extends Result {
  data: {
    start_timestamp: number;
    end_timestamp: number;
    cached_until: number;
    hourly: DashboardHourlyStat[];
    model_stats: ModelStat[];
    user_stats?: UserStat[];
    source_stats?: SourceStat[];
    recharge_amount?: number;
  };
}

export interface DashboardResult extends Result {
  data: Dashboard;
}

export interface UsageMetrics {
  rpm: number;
  tpm: number;
  today_spend: number;
  cached_until: number;
}

export interface UsageMetricsResult extends Result {
  data: UsageMetrics;
}

export interface GraphData {
  hour: string;
  timestamp?: number;
  amount: number;
}

export interface GraphResult extends Result {
  data: GraphData[];
}
