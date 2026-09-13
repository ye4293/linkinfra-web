// 等级介绍待运营内容补齐后再开放；不影响后台价格分组和实际计费。
export const SHOW_PUBLIC_USER_TIERS = false;

export function docsHref(address: string): string {
  const value = address.trim();
  if (value.startsWith('/') && !value.startsWith('//')) return value;
  try {
    const url = new URL(value);
    if (
      ['https:', 'http:'].includes(url.protocol) &&
      !url.username &&
      !url.password
    )
      return value;
  } catch {
    /* 未配置时提供站内指引。 */
  }
  return '/getting-started';
}
