/**
 * 邀请码（aff code）在注册流程中的传递。
 *
 * 后端有两条注册路径，读邀请码的方式不同：
 *   - 邮箱注册 POST /api/user/register —— 读 JSON body 的 `aff_code` 字段
 *   - OAuth   POST /api/{provider}/login —— 读 query 参数 `aff_code`
 *
 * URL 上对用户暴露的参数名是 `aff`（与后端注册页链接的历史约定一致），
 * 只在传给后端时才改叫 `aff_code`。
 *
 * OAuth 需要 cookie 中转：next-auth 接管了跳转，signIn 回调在服务端的
 * /api/auth/callback/{provider} 里执行，此时 URL 上的 ?aff= 已经丢了。
 * 所以落地页先把邀请码写进 cookie，回调再用 next/headers 的 cookies() 读回来。
 */

/** cookie 名。与后端的参数名一致，方便排查。 */
export const AFF_COOKIE_NAME = 'aff_code';

/** URL 参数名。邀请链接形如 /sign-in?aff=XXXX。 */
export const AFF_URL_PARAM = 'aff';

/** cookie 存活时间：足够走完一次 OAuth 跳转，又不会长期滞留。 */
const AFF_COOKIE_MAX_AGE_SECONDS = 30 * 60;

/**
 * 邀请码取值范围：后端 GenerateUniqueAffCode 生成 4-7 位 62 进制字母数字，
 * 列定义是 varchar(32)。这里额外放行 - 和 _ 以容纳可能的自定义码。
 *
 * 这个校验是必需的，不是防御性冗余：邀请码来自 URL，之后会被拼进
 * document.cookie，`?aff=x; path=/; domain=evil.com` 这样的值可以污染
 * cookie 的属性。同样它还会被拼进传给后端的 URL。
 */
const AFF_CODE_PATTERN = /^[A-Za-z0-9_-]{1,32}$/;

/** 校验并返回邀请码；不合法或为空时返回空串。 */
export function sanitizeAffCode(raw: string | null | undefined): string {
  if (!raw) return '';
  const trimmed = raw.trim();
  return AFF_CODE_PATTERN.test(trimmed) ? trimmed : '';
}

/**
 * 把邀请码写进 cookie，供随后的 OAuth 回调在服务端读取。
 *
 * SameSite 必须是 Lax：cookie 要在从 GitHub / Google 顶层导航回来的
 * 请求上被带回，Strict 会把它拦掉。不设 httpOnly（客户端要写），
 * 不设 Secure（本地 http 开发也要能用）。
 */
export function persistAffCode(code: string): void {
  if (typeof document === 'undefined') return;
  const safe = sanitizeAffCode(code);
  if (!safe) return;
  document.cookie = `${AFF_COOKIE_NAME}=${safe}; path=/; max-age=${AFF_COOKIE_MAX_AGE_SECONDS}; SameSite=Lax`;
}

/**
 * 匹配 cookie 里的邀请码。提到模块级避免每次调用重编译，也与上面的
 * AFF_CODE_PATTERN 保持同一种写法。
 */
const AFF_COOKIE_PATTERN = new RegExp(`(?:^|; )${AFF_COOKIE_NAME}=([^;]*)`);

/**
 * 客户端读回 cookie 里的邀请码；读不到或不合法时返回空串。
 *
 * 不做 decodeURIComponent：persistAffCode 写入时也没有 encode（邀请码
 * 限定在 [A-Za-z0-9_-]，encode 是恒等的）。而 decodeURIComponent 对畸形
 * 百分号编码会抛 URIError —— 一旦有别的东西往同域写了 `aff_code=100%off`
 * 这类值，异常会从 onSubmit 里冒出去，让注册请求根本发不出、用户点按钮
 * 毫无反应。读写两侧保持同一种表示，就没有这个失败模式。
 */
export function readAffCodeCookie(): string {
  if (typeof document === 'undefined') return '';
  const match = document.cookie.match(AFF_COOKIE_PATTERN);
  return match ? sanitizeAffCode(match[1]) : '';
}

/**
 * 清除邀请码 cookie。注册成功后必须调 —— 否则这个 30 分钟的 cookie 会
 * 把邀请归因粘在浏览器上：共享设备场景下，前一个人从邀请链接落地并注册后，
 * 后一个人直接访问 /sign-in 注册也会被计入同一个邀请人（邀请人白拿奖励，
 * 且该账号后续所有充值返现都归他）。
 *
 * 老后端的 clearAffCodeSession 就是干这件事的，session 通道下线后这个
 * 职责一度没人接。
 */
export function clearAffCode(): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${AFF_COOKIE_NAME}=; path=/; max-age=0; SameSite=Lax`;
}
