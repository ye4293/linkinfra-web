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

const CHANNEL_TYPE_KEY_PATTERN = /^\d+$/;
// 后端用 strconv.Atoi 识别渠道类型 key，带正负号的整数也会被接受
const BACKEND_INTEGER_KEY_PATTERN = /^[+-]?\d+$/;

// 后端 strings.TrimSpace 去掉的空白字符，按码点列出（另有 0x2000 到 0x200A 一段）。
// 与 JS 的 trim 差两个字符：0x85 在后端算空白，0xFEFF 不算。这里照后端的来，
// 两边对同一个 key 的判断才一致。用数值而不是字符，免得源码里出现看不见的字符。
const BACKEND_SPACE_CODES = new Set([
  0x09, 0x0a, 0x0b, 0x0c, 0x0d, 0x20, 0x85, 0xa0, 0x1680, 0x2028, 0x2029,
  0x202f, 0x205f, 0x3000
]);

function isBackendSpace(code: number): boolean {
  return BACKEND_SPACE_CODES.has(code) || (code >= 0x2000 && code <= 0x200a);
}

function trimLikeBackend(value: string): string {
  let start = 0;
  let end = value.length;
  while (start < end && isBackendSpace(value.charCodeAt(start))) start++;
  while (end > start && isBackendSpace(value.charCodeAt(end - 1))) end--;
  return value.slice(start, end);
}

/** 与后端 NormalizeBillingTag 一致：忽略大小写和首尾空格，为空、超长或含其他字符时返回空串。 */
export function normalizeBillingTag(raw: string): string {
  const tag = trimLikeBackend(raw);
  // 先按字符集检查再转小写：toLowerCase 会把个别非 ASCII 字符（如开尔文符号 U+212A）变成 ASCII 字母
  if (
    !tag ||
    tag.length > BILLING_TAG_MAX_LENGTH ||
    !BILLING_TAG_INPUT_PATTERN.test(tag)
  ) {
    return '';
  }
  return tag.toLowerCase();
}

export function billingTagKey(tag: string): string {
  return BILLING_TAG_KEY_PREFIX + tag;
}

/** key 是计费标签折扣时返回规范化后的标签，否则返回空串。 */
export function billingTagFromKey(key: string): string {
  const trimmed = trimLikeBackend(key);
  const prefix = trimmed.slice(0, BILLING_TAG_KEY_PREFIX.length);
  if (prefix.toLowerCase() !== BILLING_TAG_KEY_PREFIX) return '';
  return normalizeBillingTag(trimmed.slice(BILLING_TAG_KEY_PREFIX.length));
}

export function isChannelTypeKey(key: string): boolean {
  return CHANNEL_TYPE_KEY_PATTERN.test(key);
}

/**
 * 解析后端的 channel_ratios 字符串，只保留计费认得的项：正数，key 是渠道类型或合法的计费标签
 * （标签 key 统一成规范写法）。其余的 key 对计费没有作用，不带回表单：名字不合法的 tag: 项
 * 会让后端拒绝保存，名为 target 的 key 会被表单库当成事件对象、把整份折扣变成 undefined。
 */
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
    if (tag) {
      const canonical = billingTagKey(tag);
      if (out[canonical] === undefined || key === canonical) {
        out[canonical] = num;
      }
      continue;
    }
    // 渠道类型：后端按整数识别（"048"、"+48" 都是 48），同一类型有多种写法时排在后面的生效；
    // 不大于 0 的类型不会被用到
    if (BACKEND_INTEGER_KEY_PATTERN.test(key)) {
      const channelType = parseInt(key, 10);
      if (Number.isSafeInteger(channelType) && channelType > 0) {
        out[String(channelType)] = num;
      }
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

// 折扣输入框认的写法：普通的十进制数（"0.85"、".85"、"1."）。Number() 还接受 0x10、1e3 这类写法，
// 输错时会变成意料之外的折扣，所以先按这个格式检查。
const RATIO_INPUT_PATTERN = /^(?:\d+\.?\d*|\.\d+)$/;

// 把数字和小数点的其他写法换成半角的数字和 "."：
//   - 输入法在全角状态下打出的数字（码点 0xFF10 到 0xFF19）和句点（0xFF0E，以及中文句号 0x3002）；
//   - 逗号（0x2C）：小数点写作逗号的地区，手机的数字键盘上只有逗号。折扣不会用到千位分隔符，
//     格式检查也只允许出现一个小数点。
// 用码点而不是字符，免得源码里出现和半角长得差不多的字符。
function normalizeRatioText(text: string): string {
  let out = '';
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (code >= 0xff10 && code <= 0xff19) {
      out += String.fromCharCode(code - 0xff10 + 0x30);
    } else if (code === 0xff0e || code === 0x3002 || code === 0x2c) {
      out += '.';
    } else {
      out += text[i];
    }
  }
  return out;
}

/**
 * 解析输入框里的折扣：留空返回 undefined（不设置），大于 0 的十进制数返回该数，
 * 其余输入无效，返回 null。
 */
export function parseRatioInput(raw: string): number | undefined | null {
  const text = normalizeRatioText(raw.trim());
  if (text === '') return undefined;
  if (!RATIO_INPUT_PATTERN.test(text)) return null;
  const num = Number(text);
  return Number.isFinite(num) && num > 0 ? num : null;
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
  const parsed = parseRatioInput(raw);
  if (parsed === null) return null;
  const next: ChannelRatios = { ...ratios };
  if (parsed === undefined) {
    delete next[key];
  } else {
    next[key] = parsed;
  }
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
  // 用 Set 记录已列出的标签：标签可以叫 constructor、__proto__，这些名字在普通对象上本来就“存在”
  const listed = new Set<string>();
  for (const item of channelTags || []) {
    const tag = normalizeBillingTag(String(item.tag ?? ''));
    if (!tag || listed.has(tag)) continue;
    listed.add(tag);
    rows.push({
      tag,
      status: 'active',
      channelCount: Number(item.channel_count) || 0,
      ratio: ratios[billingTagKey(tag)]
    });
  }
  const saved = Object.keys(ratios)
    .map(billingTagFromKey)
    .filter((tag) => tag && !listed.has(tag))
    .sort();
  for (const tag of saved) {
    const ratio = ratios[billingTagKey(tag)];
    if (ratio === undefined || listed.has(tag)) continue;
    listed.add(tag);
    rows.push({
      tag,
      status: channelTags === null ? 'unknown' : 'unused',
      channelCount: 0,
      ratio
    });
  }
  return rows;
}
