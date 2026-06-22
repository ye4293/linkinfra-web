/** Channel form */
export interface ChannelForm {
  id?: number;
  /** Name */
  name: string;
  /** Type */
  type: number;
  /** API key */
  key: string;
  /** Proxy */
  base_url: string;
  /** Other */
  other: string;

  /** Model redirect */
  model_mapping: string;
  /** Custom request header override */
  header_override: string;
  /** Models */
  models: Array<string>;
  /** Group */
  groups: Array<string>;
  /** Channel discount multiplier (0-1, e.g. 0.7 = 30% off) */
  discount?: number;
}

/** Channel response */
export interface Channel {
  id?: number;
  /** Status */
  status?: number;
  /** Name */
  name?: string;
  /** Type */
  type?: number;
  /** API key */
  key?: string;
  /** Proxy */
  base_url?: string;
  /** Other */
  other?: string;
  /** Model redirect */
  model_mapping?: string;
  /** Custom request header override */
  header_override?: string;
  /** Models */
  models?: string;
  /** Group */
  group?: string;
  /** Priority */
  priority?: number;
  /** Weight */
  weight?: number;
  response_time?: number;
  test_time?: number;
  /** Used quota */
  used_quota?: number;
  /** Auto-disabled */
  auto_disabled?: boolean;
  /** Multi-key info */
  multi_key_info?: {
    is_multi_key: boolean;
    key_selection_mode?: number;
    batch_import_mode?: number;
    key_count?: number;
    key_status_list?: { [key: number]: number };
    key_metadata?: { [key: number]: any };
    enabled_key_count?: number;
    polling_index?: number;
    last_batch_import_time?: number;
  };
  /** Auto-disable reason */
  auto_disabled_reason?: string;
  /** Auto-disable time */
  auto_disabled_time?: number;
  /** Model that triggered the disable */
  auto_disabled_model?: string;
  /** Balance */
  balance?: number;
  /** Channel discount multiplier */
  discount?: number;
  /** Channel extended settings (JSON string), includes upstream model inspection config */
  other_settings?: string;
}

export type ModelResult = {
  // success: boolean;
  data?: Array<any>;
};

/** Test channel response */
export type TestResult = {
  success: boolean;
  message: string;
  time: number;
};

/** Update single channel response */
export type ChannelResult = {
  data?: number;
  message: string;
  success: boolean;
};
