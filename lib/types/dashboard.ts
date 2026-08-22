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
    recharge_amount?: number;
  };
}

export interface DashboardResult extends Result {
  data: Dashboard;
}

export interface GraphData {
  hour: string;
  timestamp?: number;
  amount: number;
}

export interface GraphResult extends Result {
  data: GraphData[];
}
