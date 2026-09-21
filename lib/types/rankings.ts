export interface RankingEntry {
  model: string;
  author: string;
  tokens: number;
  share: number;
  change_percent: number | null;
}

export interface RankingBoard {
  entries: RankingEntry[];
  total_tokens: number;
  comparison_complete: boolean;
  window_complete: boolean;
}

export interface RankingsData {
  version: string;
  generated_at: number;
  data_through: string;
  coverage_start: string;
  timezone: string;
  leaderboards: Record<'day' | 'week' | 'month', RankingBoard>;
  trend: {
    dates: string[];
    series: { model: string; tokens: number[] }[];
  };
}
