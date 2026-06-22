/** Token form */
export interface TokenForm {
  id?: number;
  /** Name */
  name: string;
  /** Expiry time */
  expired_time: number;
  /** Quota */
  remain_quota: number;
  /** Unlimited quota */
  unlimited_quota: boolean;
  /** Warning quota threshold */
  token_remind_threshold: number;
}

/** Token response */
export interface Token {
  id?: number;
  /** Status */
  status?: number;
  status_only?: boolean;
  /** Name */
  name?: string;
  /** Expiry time */
  expired_time?: number;
  /** Quota */
  remain_quota?: number;
  /** Unlimited quota */
  unlimited_quota?: boolean;
  /** Warning quota threshold */
  token_remind_threshold?: number;
  /** Used quota */
  used_quota?: number;
  /** Created time */
  created_time?: number;
  key: string;
}
