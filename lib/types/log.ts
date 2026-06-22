export interface LogStat {
  id: number;
  /** Type */
  type: number;
  /** Username */
  username?: string;
  /** Token name */
  token_name: string;
  /** Model name */
  model_name: string;
  /** Start timestamp */
  start_timestamp: number;
  /** End timestamp */
  end_timestamp: number;
  /** Channel ID */
  channel?: number;
  /** Created at */
  created_at: number;
  /** Content */
  content: string;
  /** Prompt tokens */
  prompt_tokens: number;
  /** Completion tokens */
  completion_tokens: number;
  /** Quota */
  quota: number;
  /** Duration */
  duration: number;
  /** Is streaming request */
  is_stream: boolean | number; // supports 0/1 from database
  /** First word latency */
  first_word_latency: number;
  /** Speed */
  speed?: number;
  /** HTTP referer */
  http_referer?: string;
  /** Title */
  title?: string;
  /** Other info */
  other?: string;
  /** X-Request-ID */
  x_request_id?: string;
  /** X-Response-ID */
  x_response_id?: string;
}

export type LogDataResult = {
  quota: number;
};

export interface LogStatResult {
  data?: LogDataResult;
  success: boolean;
  message: string;
}
