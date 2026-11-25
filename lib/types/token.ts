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

/** Provider routing saved on an API key. Empty lists and `only: false` mean no routing. */
export interface TokenProviderRouting {
  /** Selected providers; requests try them in this order */
  order: string[];
  /** Use only the selected providers */
  only: boolean;
  /** Providers this key never uses */
  ignore: string[];
}

/** A provider the current account can route to (GET /api/token/sources) */
export interface TokenSource {
  /** Lowercase provider name, the value stored in the routing */
  name: string;
  display_name: string;
  /** Models this provider serves for the current account */
  models: string[];
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
  /** Provider routing */
  provider_routing?: TokenProviderRouting;
  key: string;
}
