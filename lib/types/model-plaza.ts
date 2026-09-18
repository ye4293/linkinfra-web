export interface GroupPrice {
  group_key: string;
  display_name: string;
  group_discount: number;
  combined_discount: number;
  final_input_price: number;
  final_output_price: number;
  final_fixed_price: number;
  final_duration_price_per_minute?: number;
}

export interface ModelPlazaItem {
  channel_id?: number;
  model_discount?: number;
  model_name: string;
  provider: string;
  price_type: 'ratio' | 'fixed' | 'duration';
  base_duration_price_per_minute?: number;
  base_input_price: number;
  base_output_price: number;
  base_fixed_price: number;
  channel_discount: number;
  group_prices: GroupPrice[];
}

export interface GroupConfigItem {
  id: number;
  group_key: string;
  display_name: string;
  discount: number;
  sort_order: number;
  description: string;
  /** Referral commission multiplier (0-1). */
  commission_rate: number;
  /** Cumulative real top-up quota required to reach this group. */
  upgrade_threshold: number;
}

export interface ProviderInfo {
  name: string;
  count: number;
}

export interface ModelPlazaResponse {
  models: ModelPlazaItem[];
  groups: GroupConfigItem[];
  providers: ProviderInfo[];
  total: number;
  page: number;
  page_size: number;
}
