// Request latency statistics types

export interface LogStatSummary {
  /** Total requests */
  total_requests: number;
  /** Average duration (seconds) */
  avg_duration: number;
  /** P50 duration (seconds) */
  p50_duration: number;
  /** P95 duration (seconds) */
  p95_duration: number;
  /** P99 duration (seconds) */
  p99_duration: number;
  /** Average first-word latency (seconds) */
  avg_first_word_latency: number;
  /** P95 first-word latency (seconds) */
  p95_first_word_latency: number;
  /** Average generation speed (tokens/second) */
  avg_speed: number;
  /** Successful requests */
  success_count: number;
  /** Failed requests */
  error_count: number;
}

export interface LogStatTimeSeriesPoint {
  /** Time bucket start timestamp (unix seconds) */
  timestamp: number;
  /** Requests in this time bucket */
  total_requests: number;
  /** Average duration (seconds) */
  avg_duration: number;
  /** Average first-word latency (seconds) */
  avg_first_word_latency: number;
  /** Average generation speed (tokens/second) */
  avg_speed: number;
  /** Success rate (0-1) */
  success_rate: number;
}

export interface LogStatData {
  summary: LogStatSummary;
  timeseries: LogStatTimeSeriesPoint[];
}

export interface LogStatResponse {
  success: boolean;
  data: LogStatData;
  message?: string;
}

export type TimeBucket = '5m' | '15m' | '1h';
