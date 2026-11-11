// 用户渠道折扣（users.channel_ratios）的读写。
// key 为纯数字时是渠道类型，`tag:<标签>` 是渠道的计费标签；渠道有标签且用户配置了
// 该标签时用标签折扣，否则用渠道类型折扣（取值在后端 model/channel_billing_tag.go）。

export type ChannelRatios = Record<string, number>;

/** GET /api/channel/billing_tags 返回的一项。 */
export interface BillingTagUsage {
  tag: string;
  channel_count: number;
}

/**
 * 标签区的一行。
 * active：渠道上现有的标签；unused：用户配置过但已没有渠道使用；
 * unknown：标签列表加载失败，无法判断是否还在使用。
 */
export interface BillingTagRow {
  tag: string;
  status: 'active' | 'unused' | 'unknown';
  channelCount: number;
  ratio: number | undefined;
}

export const BILLING_TAG_KEY_PREFIX = 'tag:';
export const BILLING_TAG_MAX_LENGTH = 64;
/** 渠道表单校验用：允许大小写字母，保存时统一转为小写。 */
export const BILLING_TAG_INPUT_PATTERN = /^[A-Za-z0-9._-]*$/;

const NORMALIZED_TAG_PATTERN = /^[a-z0-9._-]+$/;
const CHANNEL_TYPE_KEY_PATTERN = /^\d+$/;

/** 与后端 NormalizeBillingTag 一致：忽略大小写和首尾空格，为空、超长或含其他字符时返回空串。 */
export function normalizeBillingTag(raw: string): string {
  const tag = raw.trim().toLowerCase();
  if (
    !tag ||
    tag.length > BILLING_TAG_MAX_LENGTH ||
    !NORMALIZED_TAG_PATTERN.test(tag)
  ) {
    return '';
  }
  return tag;
}

export function billingTagKey(tag: string): string {
  return BILLING_TAG_KEY_PREFIX + tag;
}

/** key 是计费标签折扣时返回规范化后的标签，否则返回空串。 */
export function billingTagFromKey(key: string): string {
  const normalized = key.trim().toLowerCase();
  if (!normalized.startsWith(BILLING_TAG_KEY_PREFIX)) return '';
  return normalizeBillingTag(normalized.slice(BILLING_TAG_KEY_PREFIX.length));
}

export function isChannelTypeKey(key: string): boolean {
  return CHANNEL_TYPE_KEY_PATTERN.test(key);
}

/** 解析后端的 channel_ratios 字符串，只保留正数；计费标签的 key 统一成规范写法。 */
export function parseChannelRatios(raw: unknown): ChannelRatios {
  if (!raw || typeof raw !== 'string') return {};
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return {};
  }
  if (!parsed || typeof parsed !== 'object') return {};
  const entries = parsed as Record<string, unknown>;
  const out: ChannelRatios = {};
  // 按 key 排序后处理，与后端一致：同一标签有多种写法时以规范写法为准，否则取排在最前的。
  for (const key of Object.keys(entries).sort()) {
    const num = Number(entries[key]);
    if (!Number.isFinite(num) || num <= 0) continue;
    const tag = billingTagFromKey(key);
    if (!tag) {
      out[key] = num;
      continue;
    }
    const canonical = billingTagKey(tag);
    if (out[canonical] === undefined || key === canonical) {
      out[canonical] = num;
    }
  }
  return out;
}

/** 序列化为后端的 channel_ratios 字符串，没有任何折扣时返回空串。 */
export function serializeChannelRatios(map: ChannelRatios | undefined): string {
  if (!map) return '';
  const cleaned: ChannelRatios = {};
  for (const [key, value] of Object.entries(map)) {
    if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
      cleaned[key] = value;
    }
  }
  if (Object.keys(cleaned).length === 0) return '';
  return JSON.stringify(cleaned);
}

/**
 * 把输入框的文本写入某个 key：留空删除该项，正数写入。
 * 其他输入无效，返回 null，调用方保持原值。
 */
export function withRatioInput(
  ratios: ChannelRatios,
  key: string,
  raw: string
): ChannelRatios | null {
  const next: ChannelRatios = { ...ratios };
  const trimmed = raw.trim();
  if (trimmed === '') {
    delete next[key];
    return next;
  }
  const num = Number(trimmed);
  if (!Number.isFinite(num) || num <= 0) return null;
  next[key] = num;
  return next;
}

export function hasChannelTypeRatios(ratios: ChannelRatios): boolean {
  return Object.keys(ratios).some(
    (key) => isChannelTypeKey(key) && ratios[key] !== undefined
  );
}

/** 清空渠道类型折扣，计费标签折扣和其他 key 原样保留。 */
export function withoutChannelTypeRatios(ratios: ChannelRatios): ChannelRatios {
  const next: ChannelRatios = {};
  for (const [key, value] of Object.entries(ratios)) {
    if (!isChannelTypeKey(key)) next[key] = value;
  }
  return next;
}

/**
 * 标签区要显示的行：渠道上现有的标签在前，其后是用户配置过但不在其中的标签。
 * channelTags 为 null 表示标签列表加载失败。
 */
export function billingTagRows(
  ratios: ChannelRatios,
  channelTags: BillingTagUsage[] | null
): BillingTagRow[] {
  const rows: BillingTagRow[] = [];
  const listed: Record<string, true> = {};
  for (const item of channelTags || []) {
    const tag = normalizeBillingTag(String(item.tag ?? ''));
    if (!tag || listed[tag]) continue;
    listed[tag] = true;
    rows.push({
      tag,
      status: 'active',
      channelCount: Number(item.channel_count) || 0,
      ratio: ratios[billingTagKey(tag)]
    });
  }
  const saved = Object.keys(ratios)
    .map(billingTagFromKey)
    .filter((tag) => tag && !listed[tag])
    .sort();
  for (const tag of saved) {
    const ratio = ratios[billingTagKey(tag)];
    if (ratio === undefined || listed[tag]) continue;
    listed[tag] = true;
    rows.push({
      tag,
      status: channelTags === null ? 'unknown' : 'unused',
      channelCount: 0,
      ratio
    });
  }
  return rows;
}
