export type Result = {
  data?: Object;
  success: boolean;
  message: string;
};

export type Result2 = {
  data?: string;
  success: boolean;
  message: string;
};

export type NoDataResult = {
  success: boolean;
  message: string;
};

export type ResultNumber = {
  data: number;
  success: boolean;
  message: string;
};

export type PayResult = {
  data?: {
    payment_uri: string;
    qr_code: string;
    status: string;
  };
  success: boolean;
  message: string;
};

export type ListResult = {
  data?: {
    /** Current page */
    currentPage: number;
    /** List data */
    list: Array<any>;
    // items per page
    pageSize: number;
    // total count
    total: number;
  };
  success: boolean;
  message: string;
};

export interface ListParams {
  /** Current page */
  page?: number;
  /** Items per page */
  pagesize?: number;
  /** Keyword */
  keyword?: string | number;
}

export type ListArrayResult = {
  data?: Array<any>;
  success: boolean;
  message: string;
};

export type SettingParams = {
  key: string;
  value: string;
};

export interface ChargeAmountResult {
  data: {
    /** Current page */
    app_order_id: string;
    /** List data */
    charge_url: string;
  };
  success: boolean;
  message: string;
}
