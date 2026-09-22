// 模型监控相关类型

export interface ModelMetricsMini {
  success_rate: number | null;
  avg_latency: number | null;
  avg_speed: number | null;
  total_requests_24h: number;
  status: 'healthy' | 'degraded' | 'down' | 'no_data' | 'insufficient_data';
}

export interface ModelMetricsCurrentStats {
  status?: ModelMetricsMini['status'];
  rpm: number;
  tpm: number;
  success_rate: number | null;
  avg_latency: number | null;
  avg_speed: number | null;
  avg_first_word: number | null;
  p50_latency: number | null;
  p95_latency: number | null;
  p99_latency: number | null;
  percentile_capped?: boolean;
}

export interface ModelMetricsPeriod24h {
  final_requests?: number;
  total_requests: number;
  success_rate: number | null;
  avg_latency: number | null;
  avg_speed: number | null;
  total_tokens: number;
}

export interface ChannelMetrics {
  channel_id: number;
  channel_name: string;
  success_rate: number;
  avg_latency: number;
  avg_speed: number;
  total_requests_24h: number;
}

export interface ModelMetricsDetail {
  source_key?: string;
  as_of?: number;
  stale?: boolean;
  partial?: boolean;
  model_name: string;
  provider: string;
  current: ModelMetricsCurrentStats | null;
  period_24h: ModelMetricsPeriod24h | null;
  pricing: import('./model-plaza').ModelPlazaItem | null;
  channels: ChannelMetrics[] | null; // 仅管理员
}

export interface MetricsTimeSeriesPoint {
  timestamp: number;
  total_requests: number;
  success_rate: number | null;
  avg_latency: number | null;
  avg_speed: number | null;
  avg_first_word: number | null;
  total_tokens: number;
  prompt_tokens: number;
  completion_tokens: number;
}

export interface MetricsTimeSeriesResponse {
  model_name: string;
  period: string;
  points: MetricsTimeSeriesPoint[];
}

export type MetricsPeriod = '1h' | '24h' | '7d' | '30d';
