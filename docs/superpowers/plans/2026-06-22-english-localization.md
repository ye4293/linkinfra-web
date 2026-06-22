# English Localization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace all user-visible Chinese text with native-quality English across frontend (linkinfra-web) and backend (linkinfra). Code comments and server-side logs are out of scope.

**Architecture:** Inline string replacement — no i18n infrastructure. Five independent groups executed in parallel by separate agents. Each group ends with a verification step.

**Tech Stack:** Next.js 14 / TypeScript (frontend), Go (backend)

**Translation rules (apply everywhere):**

- Native English, not literal translation. Sentence case throughout.
- Success toasts: past tense (`Saved.` not `Save successful!`)
- Error messages: precise, end with period
- Keep Chinese AI brand names: `零一万物`, `百度文心千帆`, `阿里通义千问`, `讯飞星火认知`, `智谱 ChatGLM`, `腾讯混元`, `百川大模型`
- Do NOT touch code comments or server-side log messages

---

## Task 1: Group 1 — Frontend locales & constants

**Files:**

- Modify: `locales/zh.ts`
- Modify: `constants/data.ts`
- Modify: `constants/index.ts`
- Modify: `enums/user.ts`

- [ ] **Step 1: Replace `locales/zh.ts`**

Read the file first, then replace every Chinese string value with English. Key translations:

```ts
const zh = {
  nav: {
    home: 'Home',
    models: 'Models',
    docs: 'Docs',
    marketplace: 'Marketplace',
    signIn: 'Sign in',
    dashboard: 'Dashboard'
  },
  userMenu: {
    profile: 'Profile',
    billing: 'Billing',
    settings: 'Settings',
    logout: 'Sign out'
  },
  hero: {
    titlePrefix: 'Unified AI Model',
    titleHighlight: 'API Gateway',
    description:
      'Supports OpenAI, Claude, Gemini, DeepSeek, and all major LLMs. One API for every AI capability — unified auth, unified billing, effortless model switching.',
    getStarted: 'Get started',
    viewDocs: 'View docs'
  },
  stats: {
    models: 'Models supported',
    modelsValue: '100+',
    developers: 'Developers',
    developersValue: '10,000+',
    uptime: 'Uptime',
    uptimeValue: '99.9%',
    apiCalls: 'Daily requests',
    apiCallsValue: '10M+'
  },
  features: {
    title: 'Core capabilities',
    subtitle: 'The easiest way for developers to integrate AI models'
    // translate each feature name/description to natural English
  },
  cta: {
    title: 'Start building today',
    description: 'Sign up for free credits and try every AI model instantly.',
    button: 'Sign up free'
  },
  footer: { rights: 'All rights reserved.' },
  modelPlaza: {
    title: 'Model marketplace',
    searchPlaceholder: 'Search models...',
    provider: 'Provider',
    userLevel: 'User tier',
    billingType: 'Billing type',
    payPerUse: 'Pay per use',
    payPerCall: 'Pay per call'
  },
  modelDetail: {
    backToPlaza: 'Back to marketplace',
    performance: 'Performance',
    successRate: 'Success rate',
    avgLatency: 'Avg latency',
    statusNormal: 'Healthy',
    statusDegraded: 'Degraded',
    statusError: 'Error'
  },
  logDetail: {
    channelInfo: 'Channel',
    promptTokens: 'Prompt tokens',
    completionTokens: 'Completion tokens',
    cachedTokens: 'Cached tokens',
    cost: 'Cost',
    discountSplit: 'Discount split',
    tierDiscount: 'Tier discount',
    channelDiscount: 'Channel discount'
  },
  pricing: {
    title: 'Model pricing',
    ratioSettings: 'Model ratios',
    visualRatio: 'Visual ratio editor',
    saveSuccess: 'Saved.',
    fixedPrice: 'Fixed price'
  },
  channelForm: { channelDiscount: 'Channel discount multiplier' },
  channelRatios: {
    title: 'Channel type discounts',
    description: 'Multiplied with channel and tier discounts after being set.'
  },
  landing: {
    headline: 'One key. Every frontier model.',
    signupCta: 'Sign up free →',
    readDocs: 'Read the docs',
    enterprise: 'Enterprise',
    contactSales: 'Contact sales'
  },
  dashboard: {
    greeting: 'Hello',
    welcome: 'Welcome back',
    overview: 'Overview',
    analytics: 'Analytics',
    availableQuota: 'Available quota',
    throughput: 'Live throughput',
    todayUsage: "Today's usage",
    topModels: 'Top models'
  },
  userPage: {
    title: 'Users',
    subtitle: 'Manage system users',
    addUser: 'Add user',
    roleUser: 'User',
    roleAdmin: 'Admin',
    roleRoot: 'Super admin',
    statusActive: 'Active',
    statusDisabled: 'Disabled'
  },
  channelPage: {
    title: 'Channels',
    subtitle: 'Manage AI channels and load balancing',
    addChannel: 'Add channel',
    statusEnabled: 'Enabled',
    statusDisabled: 'Disabled',
    statusAutoDisabled: 'Auto-disabled',
    statusUntested: 'Untested',
    ratingExcellent: 'Excellent',
    ratingGood: 'Good'
  }
};
```

- [ ] **Step 2: Fix `constants/data.ts` sidebar nav titles**

Find and replace these lines:

```ts
// Before → After
title: '个人设置'     → title: 'Personal settings'
title: '系统设置'     → title: 'System settings'
title: '支付设置'     → title: 'Payment settings'
title: '分组与模型定价设置' → title: 'Groups & model pricing'
title: '折扣设置'     → title: 'Discount settings'
title: '模型设置'     → title: 'Model settings'
```

- [ ] **Step 3: Fix `constants/index.ts` channel type names**

Keep all Chinese AI brand names. Translate only generic non-brand entries:

```ts
// Keep as-is (brand names):
零一万物, 百度文心千帆, 阿里通义千问, 讯飞星火认知, 智谱 ChatGLM, 腾讯混元, 百川大模型

// Translate:
'自定义渠道'         → 'Custom channel'
'知识库：FastGPT'    → 'Knowledge base: FastGPT'
'知识库：AI Proxy'   → 'Knowledge base: AI Proxy'
'代理：OpenRouter'   → 'Proxy: OpenRouter'
'代理：API2D'        → 'Proxy: API2D'
'代理：OpenAI-SB'    → 'Proxy: OpenAI-SB'
'代理：OhMyGPT'      → 'Proxy: OhMyGPT'
'代理：AI Proxy'     → 'Proxy: AI Proxy'
'代理：CloseAI'      → 'Proxy: CloseAI'
'代理：OpenAI Max'   → 'Proxy: OpenAI Max'
'代理：AI.LS'        → 'Proxy: AI.LS'
'代理：API2GPT'      → 'Proxy: API2GPT'
'代理：AIGC2D'       → 'Proxy: AIGC2D'
'360 智脑'           → '360 AI'
'AMA 问天'           → 'AMA'
```

- [ ] **Step 4: Fix `enums/user.ts` display text**

```ts
// Before → After
'普通用户'   → 'User'
'管理员'     → 'Admin'
'超级管理员' → 'Super admin'
```

- [ ] **Step 5: Verify and commit**

```bash
cd /c/Users/brows/Desktop/linkinfra-web
grep -rn $'[一-鿿]' locales/ constants/ enums/ --include="*.ts"
# Expected: zero matches (except brand names kept intentionally)
git add locales/zh.ts constants/data.ts constants/index.ts enums/user.ts
git commit -m "i18n: English localize locales, constants, enums"
```

---

## Task 2: Group 2 — Frontend settings & forms

**Files:**

- Modify: `sections/setting/view/settingPage.tsx`
- Modify: `sections/setting/view/discountPage.tsx`
- Modify: `sections/setting/view/modelSettingPage.tsx`
- Modify: `sections/setting/view/paymentSettingPage.tsx`
- Modify: `sections/channel/channel-form.tsx`
- Modify: `sections/channel/affinity-modal.tsx`
- Modify: `sections/channel/multi-key-modal.tsx`
- Modify: `sections/channel/model-select-modal.tsx`
- Modify: `sections/token/token-form.tsx`
- Modify: `sections/user/user-form.tsx`
- Modify: `sections/setting/update-user-form.tsx`

- [ ] **Step 1: Read each file**, then replace all user-visible Chinese strings. Apply these translation patterns consistently:

**Common patterns across all form/settings files:**

| Chinese          | English                        |
| ---------------- | ------------------------------ |
| 保存 / 保存中... | Save / Saving...               |
| 取消             | Cancel                         |
| 确认             | Confirm                        |
| 加载中...        | Loading...                     |
| 加载失败         | Failed to load                 |
| 保存成功         | Saved.                         |
| 保存失败，请重试 | Save failed. Please try again. |
| 删除             | Delete                         |
| 禁用 / 启用      | Disable / Enable               |
| 测试 / 测试中... | Test / Testing...              |
| 编辑             | Edit                           |
| 请输入 X         | Enter X                        |
| X 不能为空       | X is required.                 |
| 获取 X 失败      | Failed to load X.              |
| 更新成功         | Updated.                       |
| 删除成功         | Deleted.                       |
| 操作成功         | Done.                          |

**`settingPage.tsx` key translations:**

```
系统设置         → System settings
基础设置         → General
SMTP 设置        → SMTP
飞书 Webhook     → Feishu Webhook
S3/R2 存储       → S3/R2 Storage
保存成功！        → Saved.
SMTP 设置保存成功！ → SMTP settings saved.
飞书 Webhook 设置保存成功！ → Feishu webhook settings saved.
S3/R2 存储设置保存成功！ → Storage settings saved.
保存失败，请重试  → Save failed. Please try again.
发送测试邮件      → Send test email
测试飞书 Webhook  → Test Feishu webhook
```

**`discountPage.tsx` key translations:**

```
折扣设置          → Discount settings
分组折扣          → Group discounts
获取分组列表失败   → Failed to load groups.
更新分组成功       → Group updated.
删除分组成功       → Group deleted.
请输入分组标识     → Group key is required.
折扣率必须在 0-100 之间 → Discount must be between 0 and 100.
添加分组           → Add group
分组标识           → Group key
显示名称           → Display name
折扣率             → Discount rate
```

**`modelSettingPage.tsx` key translations:**

```
模型设置           → Model settings
状态更新成功       → Status updated.
状态更新失败       → Failed to update status.
获取模型列表失败   → Failed to load models.
测试成功，耗时 X 秒 → Test passed in Xs.
测试失败           → Test failed.
```

**`paymentSettingPage.tsx` key translations:**

```
支付设置           → Payment settings
配置 Stripe 的接入参数 → Configure Stripe payment settings.
Stripe 开关        → Stripe toggle
启用 Stripe 支付   → Enable Stripe payments
当前状态：已启用   → Status: Enabled
当前状态：未启用   → Status: Disabled
已填写 Price ID    → Price ID configured
尚未配置 Price ID  → Price ID not configured
保存支付设置       → Save settings
支付设置保存成功   → Payment settings saved.
保存支付设置失败，请重试 → Failed to save payment settings. Please try again.
允许优惠码         → Allow promo codes
开启后，用户在 Stripe Checkout 页面可以输入 Promotion Code → When enabled, users can enter a promotion code at checkout.
充值单价（USD / 单位）  → Unit price (USD)
最低充值数量       → Minimum top-up
```

**`channel-form.tsx` key translations** (large file — translate all JSX string literals and toasts, keep structural comments untouched):

```
新建渠道           → New channel
编辑渠道           → Edit channel
渠道名称           → Channel name
渠道类型           → Channel type
渠道密钥           → API key
请输入渠道名称     → Enter a channel name
保存渠道成功       → Channel saved.
保存渠道失败       → Failed to save channel.
渠道测试模型       → Test model
渠道分组           → Channel group
优先级             → Priority
权重               → Weight
渠道折扣           → Channel discount
```

**`affinity-modal.tsx` key translations:**

```
亲和配置           → Affinity settings
加载亲和配置失败   → Failed to load affinity config.
保存成功           → Saved.
保存失败           → Save failed.
清空亲和缓存       → Clear affinity cache
```

**`multi-key-modal.tsx` key translations:**

```
多密钥管理         → Multi-key management
密钥列表           → Keys
已启用             → Enabled
手动禁用           → Disabled
导入密钥           → Import keys
覆盖模式           → Overwrite
追加模式           → Append
删除所有禁用密钥   → Delete all disabled keys
确定要删除所有被禁用的密钥吗？此操作不可恢复。 → Delete all disabled keys? This cannot be undone.
```

**`model-select-modal.tsx` key translations:**

```
选择模型           → Select models
已复制选中模型名称 → Model names copied.
获取模型列表失败   → Failed to load models.
搜索模型           → Search models
全选               → Select all
取消全选           → Deselect all
```

**`token-form.tsx`, `user-form.tsx`, `update-user-form.tsx` key translations:**

```
用户名             → Username
显示名称           → Display name
密码               → Password
留空则不修改密码   → Leave blank to keep current password
邮箱               → Email
未绑定             → Not linked
额外折扣           → Additional discount
基本信息           → Basic info
保存               → Save
保存成功           → Saved.
```

- [ ] **Step 2: Verify and commit**

```bash
grep -rn $'[一-鿿]' sections/setting/view/ sections/channel/channel-form.tsx sections/channel/affinity-modal.tsx sections/channel/multi-key-modal.tsx sections/channel/model-select-modal.tsx sections/token/token-form.tsx sections/user/user-form.tsx sections/setting/update-user-form.tsx --include="*.tsx"
# Expected: zero user-visible Chinese (comments are ok)
git add sections/setting/ sections/channel/channel-form.tsx sections/channel/affinity-modal.tsx sections/channel/multi-key-modal.tsx sections/channel/model-select-modal.tsx sections/token/ sections/user/
git commit -m "i18n: English localize settings pages and forms"
```

---

## Task 3: Group 3 — Frontend tables & shared components

**Files:**

- Modify: `sections/channel/tables/` (all `.tsx` files)
- Modify: `sections/log/tables/` (all `.tsx` files)
- Modify: `sections/image/tables/` (all `.tsx` files)
- Modify: `sections/video/tables/` (all `.tsx` files)
- Modify: `sections/topup/payment-section.tsx`
- Modify: `sections/topup/transaction-history.tsx`
- Modify: `components/datetime-range-picker.tsx`
- Modify: `components/json-editor.tsx`
- Modify: `lib/types/*.ts` (JSDoc labels only)
- Modify: `utils/render.ts`
- Modify: `app/lib/clientFetch.ts`
- Modify: `app/lib/serverFetch.ts`

- [ ] **Step 1: Read and translate each file**

**Channel tables (`sections/channel/tables/`):**

```
已启用              → Enabled
手动禁用            → Disabled
自动禁用            → Auto-disabled
未测试              → Untested
测试中...           → Testing...
测试                → Test
编辑                → Edit
删除渠道            → Delete channel
查看模型            → View models
多密钥管理          → Multi-key
复制渠道            → Duplicate
渠道名称            → Name
渠道类型            → Type
优先级              → Priority
权重                → Weight
余额                → Balance
渠道ID              → ID
操作                → Actions
状态更新成功        → Status updated.
状态更新失败        → Failed to update status.
测试成功，耗时 X 秒  → Test passed in Xs.
测试失败            → Test failed.
删除成功            → Deleted.
删除失败            → Delete failed.
渠道                → Channel
筛选                → Filter
重置                → Reset
搜索渠道名称        → Search channels
```

**Log tables (`sections/log/tables/`):**

```
请求日志            → Request logs
模型                → Model
用户                → User
渠道                → Channel
令牌                → Token
提示词              → Prompt
花费                → Cost
时间                → Time
类型                → Type
成功                → Success
失败                → Error
搜索                → Search
今天                → Today
昨天                → Yesterday
最近7天             → Last 7 days
最近30天            → Last 30 days
本周                → This week
本月                → This month
```

**Image / Video tables:** Translate column headers, status labels, action buttons using same patterns.

**`payment-section.tsx`:**

```
账户充值            → Top up
充值数量            → Amount
自定义数量:         → Custom amount:
输入充值数量        → Enter amount
应付金额：          → You pay:
提交中...           → Processing...
```

**`transaction-history.tsx`:**

```
充值记录            → Top-up history
时间                → Date
订单号              → Order ID
充值额度            → Credits
币种                → Currency
支付金额            → Amount paid
支付方式            → Method
状态                → Status
完成时间            → Completed
入账方式            → Entry type
成功                → Paid
待支付              → Pending
失败                → Failed
已过期              → Expired
搜索订单号...       → Search by order ID...
搜索                → Search
清除                → Clear
获取充值记录失败    → Failed to load top-up history.
未找到匹配的订单    → No matching orders found.
暂无充值记录        → No top-up history yet.
补单                → Complete
补单成功            → Order completed.
支付宝              → Alipay
微信                → WeChat Pay
QQ 钱包             → QQ Wallet
共 X 条记录         → X records total
上一页              → Previous
下一页              → Next
```

**`datetime-range-picker.tsx`:**

```
快捷选择            → Quick select
精确设置            → Custom range
开始时间            → Start
结束时间            → End
清除选择            → Clear
选择时间范围        → Select date range
今天                → Today
昨天                → Yesterday
最近7天             → Last 7 days
最近30天            → Last 30 days
本周                → This week
本月                → This month
```

**`json-editor.tsx`:**

```
填入模板            → Use template
键名（请求的模型）  → Key (requested model)
值（实际发送的模型）→ Value (forwarded model)
```

**`lib/types/*.ts`:** Translate JSDoc `/** ... */` field descriptions to English. E.g.:

```ts
/** 渠道表单 */  → /** Channel form */
/** 名称 */      → /** Name */
/** 密钥 */      → /** API key */
/** 状态 */      → /** Status */
/** 类型 */      → /** Type */
```

**`utils/render.ts`:** Translate any display strings (status labels, formatted output).

**`app/lib/clientFetch.ts` and `app/lib/serverFetch.ts`:**

```ts
// In response interceptor:
'请求失败'  →  'Request failed.'
```

- [ ] **Step 2: Verify and commit**

```bash
grep -rn $'[一-鿿]' sections/channel/tables/ sections/log/tables/ sections/image/tables/ sections/video/tables/ sections/topup/ components/datetime-range-picker.tsx components/json-editor.tsx lib/types/ utils/render.ts app/lib/ --include="*.ts" --include="*.tsx"
# Expected: zero user-visible matches
git add sections/channel/tables/ sections/log/tables/ sections/image/tables/ sections/video/tables/ sections/topup/ components/datetime-range-picker.tsx components/json-editor.tsx lib/types/ utils/render.ts app/lib/
git commit -m "i18n: English localize tables and shared components"
```

---

## Task 4: Group 4 — Frontend misc

**Files:**

- Modify: `sections/overview/analytics-content.tsx`
- Modify: `sections/profile/system-token-card.tsx`
- Modify: `sections/model-plaza/model-plaza-view.tsx`
- Modify: `auth.config.ts` (console.log strings only — not comments)
- Modify: `hooks/use-copy-to-clipboard.tsx`
- Modify: `hooks/use-optimized-pagination.tsx`
- Modify: `app/api/test-timeout/route.ts`

- [ ] **Step 1: Read and translate each file**

**`hooks/use-copy-to-clipboard.tsx`** — exact changes:

```ts
// Before:
toast.success(`${label || '内容'}已复制到剪贴板`, { duration: 2000 });
console.error('复制失败:', error);
toast.error('复制失败，请重试', { duration: 2000 });

// After:
toast.success(`${label || 'Content'} copied to clipboard.`, { duration: 2000 });
console.error('Copy failed:', error);
toast.error('Copy failed. Please try again.', { duration: 2000 });
```

**`sections/overview/analytics-content.tsx`:**

```
可用额度      → Available quota
今日用量      → Today's usage
实时吞吐      → Live throughput
热门模型      → Top models
概览          → Overview
```

**`sections/profile/system-token-card.tsx`:**

```
系统访问令牌  → System access token
令牌已重置    → Token reset.
复制          → Copy
重新生成      → Regenerate
生成令牌      → Generate token
```

**`sections/model-plaza/model-plaza-view.tsx`:**

```
模型广场      → Model marketplace
搜索模型名称... → Search models...
供应商        → Provider
用户等级      → User tier
计费类型      → Billing type
按量计费      → Pay per use
按次计费      → Pay per call
```

**`auth.config.ts`** — only translate console.log strings (not comments):

```ts
console.log('账号密码登录', ...)   → console.log('Credentials login', ...)
console.log('github登录', ...)     → console.log('GitHub login', ...)
console.log('google登录', ...)     → console.log('Google login', ...)
```

**`hooks/use-optimized-pagination.tsx`:** Translate any pagination display labels.

**`app/api/test-timeout/route.ts`:** Translate any Chinese strings in API response messages.

- [ ] **Step 2: Verify and commit**

```bash
grep -rn $'[一-鿿]' sections/overview/ sections/profile/ sections/model-plaza/ auth.config.ts hooks/ app/api/test-timeout/ --include="*.ts" --include="*.tsx"
git add sections/overview/ sections/profile/ sections/model-plaza/ auth.config.ts hooks/ app/api/test-timeout/
git commit -m "i18n: English localize misc frontend files"
```

---

## Task 5: Group 5 — Backend (Go)

**Files:**

- Modify: `controller/affinity.go`
- Modify: `controller/channel.go`
- Modify: `controller/user.go`
- Modify: `controller/group_config.go`
- Modify: `controller/topup_stripe.go`
- Modify: `controller/topup.go`
- Modify: `controller/token.go`
- Modify: `controller/notification.go`
- Modify: `model/user.go`
- Modify: `model/redemption.go`
- Modify: `relay/util/common.go`
- Modify: `relay/channel/flux/adaptor.go`
- Modify: `relay/channel/keling/util.go`
- Modify: `relay/channel/ali/video_adaptor.go`
- Modify: `common/helper/helper.go`
- Modify: `common/message/feishu.go`
- Modify: `monitor/channel.go`

**Rule:** Only translate strings inside `c.JSON(...)`, `errors.New(...)`, `fmt.Errorf(...)`, `gin.H{"message":...}`, notification subject/body strings. Do NOT touch `//` comments or `logger.*` / `log.Printf` calls.

- [ ] **Step 1: Translate `controller/affinity.go`**

```go
// Before → After (message values only)
"参数解析失败: " + err.Error()   → "Failed to parse request: " + err.Error()
"保存失败: " + err.Error()       → "Save failed: " + err.Error()
"保存成功"                       → "Saved."
"Redis 未启用，无需清理"         → "Redis is not enabled; nothing to clear."
"扫描失败: " + err.Error()       → "Scan failed: " + err.Error()
"删除失败: " + err.Error()       → "Delete failed: " + err.Error()
"已清空全部亲和缓存"             → "Affinity cache cleared."
```

- [ ] **Step 2: Translate `controller/channel.go`**

Only the `gin.H{"message": ...}` values (not comments):

```go
"自定义请求头覆盖必须是合法的 JSON 格式"   → "Custom header override must be valid JSON."
"获取现有渠道信息失败: " + err.Error()      → "Failed to load channel: " + err.Error()
"无效的参数"                               → "Invalid parameters."
"渠道不存在"                               → "Channel not found."
"该渠道不是多密钥聚合渠道"                 → "This channel is not a multi-key channel."
"多密钥状态修复成功"                       → "Multi-key status repaired."
"该渠道不是多密钥渠道"                     → "This channel is not a multi-key channel."
"成功删除所有禁用密钥"                     → "All disabled keys deleted."
"渠道复制成功"                             → "Channel duplicated."
"密钥不能为空"                             → "API key is required."
"参数错误: " + err.Error()                 → "Invalid parameters: " + err.Error()
"获取模型列表失败: " + err.Error()          → "Failed to fetch models: " + err.Error()
"无效的渠道ID"                             → "Invalid channel ID."
"渠道不存在: " + err.Error()               → "Channel not found: " + err.Error()
"渠道密钥为空"                             → "Channel has no API keys."
"获取模型列表失败: " + err.Error()          → "Failed to fetch models: " + err.Error()
// status text strings:
"已启用"   → "Enabled"
"手动禁用" → "Disabled"
"自动禁用" → "Auto-disabled"
"未知状态" → "Unknown"
// channel name suffix on copy:
originChannel.Name + "_复制"  →  originChannel.Name + " (copy)"
```

- [ ] **Step 3: Translate `controller/user.go`**

```go
"请重试，系统生成的 UUID 竟然重复了！"                        → "Please retry. A UUID collision occurred."
"输入不合法 " + err.Error()                                   → "Invalid input: " + err.Error()
"无权更新同权限等级或更高权限等级的用户信息"                   → "Cannot update a user with equal or higher permissions."
"无权将其他用户权限等级提升到大于等于自己的权限等级"           → "Cannot promote a user to a role equal to or higher than your own."
"无权删除同权限等级或更高权限等级的用户"                       → "Cannot delete a user with equal or higher permissions."
"用户删除成功"                                                → "User deleted."
"不能删除超级管理员账户"                                       → "Cannot delete a super admin account."
"无法创建权限大于等于自己的用户"                               → "Cannot create a user with a role equal to or higher than your own."
"用户不存在"                                                  → "User not found."
"无法禁用超级管理员用户"                                       → "Cannot disable a super admin."
"无法删除超级管理员用户"                                       → "Cannot delete a super admin."
"普通管理员用户无法提升其他用户为管理员"                       → "Admins cannot promote other users to admin."
"该用户已经是管理员"                                           → "User is already an admin."
"无法降级超级管理员用户"                                       → "Cannot demote a super admin."
"该用户已经是普通用户"                                         → "User is already a regular user."
"验证码错误或已过期"                                           → "Invalid or expired verification code."
```

- [ ] **Step 4: Translate `controller/group_config.go`**

```go
"获取分组配置失败: " + err.Error()  → "Failed to load group configs: " + err.Error()
"无效的参数: " + err.Error()        → "Invalid parameters: " + err.Error()
"group_key 和 display_name 不能为空" → "group_key and display_name are required."
"discount 必须在 0-1 之间（乘数，1=无折扣；前端按百分比展示，UI 保存时会自动除以 100）"
  → "discount must be between 0 and 1 (multiplier; 1 = no discount)."
"创建分组配置失败: " + err.Error()   → "Failed to create group config: " + err.Error()
"创建成功"                           → "Created."
"缺少 id"                            → "id is required."
"更新分组配置失败: " + err.Error()   → "Failed to update group config: " + err.Error()
"更新成功"                           → "Updated."
"无效的 id"                          → "Invalid id."
"未找到该分组配置"                   → "Group config not found."
"删除分组配置失败: " + err.Error()   → "Failed to delete group config: " + err.Error()
"删除成功"                           → "Deleted."
```

- [ ] **Step 5: Translate `controller/topup_stripe.go`**

Only `c.JSON(...)` message values (not `log.Printf` lines):

```go
"管理员未开启 Stripe 支付"           → "Stripe payments are not enabled."
"当前管理员未配置 Stripe API Secret"  → "Stripe API Secret is not configured."
"当前管理员未配置 Stripe Webhook Secret" → "Stripe Webhook Secret is not configured."
"当前管理员未配置 Stripe Price ID"   → "Stripe Price ID is not configured."
"参数错误"                           → "Invalid parameters."
fmt.Sprintf("充值数量不能小于 %d", config.StripeMinTopUp) → fmt.Sprintf("Minimum top-up amount is %d.", config.StripeMinTopUp)
"充值金额过低"                       → "Top-up amount is too low."
"不支持的支付渠道"                   → "Unsupported payment method."
"充值数量不能大于 10000"             → "Top-up amount cannot exceed 10,000."
"拉起支付失败"                       → "Failed to initiate payment."
"创建订单失败"                       → "Failed to create order."
fmt.Errorf("无效的 Stripe API 密钥") → fmt.Errorf("invalid Stripe API key")
```

- [ ] **Step 6: Translate `controller/topup.go`**

```go
"无权操作，仅管理员可补单"  → "Only admins can manually complete orders."
"缺少订单号"                → "Order number is required."
"补单成功"                  → "Order completed."
```

- [ ] **Step 7: Translate `controller/token.go`**

```go
"令牌名称过长"  → "Token name is too long."
```

- [ ] **Step 8: Translate `controller/notification.go`**

Only `c.JSON(...)` message values and email/Feishu content strings (not `log.Printf`):

```go
"请提供有效的邮箱地址"                 → "A valid email address is required."
"SMTP 服务器未配置，请先保存 SMTP 设置" → "SMTP server is not configured. Save your SMTP settings first."
// Email subject and body:
fmt.Sprintf("[%s] SMTP 配置测试", ...)  → fmt.Sprintf("[%s] SMTP configuration test", ...)
"🎉 SMTP 配置测试成功！"              → "✅ SMTP configuration test passed"
"恭喜！您的 SMTP 邮件服务已配置成功。" → "Your SMTP email service is configured correctly."
"服务器:" → "Server:"
"端口:"   → "Port:"
"发送时间:" → "Sent at:"
"此邮件由 %s 系统自动发送，用于测试 SMTP 配置。" → "This message was sent automatically by %s to verify your SMTP configuration."
fmt.Sprintf("发送测试邮件失败: %s", ...) → fmt.Sprintf("Failed to send test email: %s", ...)
"测试邮件发送成功"                     → "Test email sent."
"请提供有效的 Webhook URL 列表"        → "A valid list of webhook URLs is required."
"请提供至少一个 Webhook URL"           → "At least one webhook URL is required."
// Feishu test message:
fmt.Sprintf("🎉 %s 飞书通知测试", ...) → fmt.Sprintf("🎉 %s Feishu notification test", ...)
"恭喜！飞书 Webhook 配置测试成功！\n\n系统将通过此 Webhook 发送重要通知。"
  → "Your Feishu webhook is working correctly.\n\nThe system will use this webhook for important notifications."
fmt.Sprintf("发送时间: %s", ...)        → fmt.Sprintf("Sent at: %s", ...)
"构建消息失败"                         → "Failed to build message."
fmt.Sprintf("发送失败: %s", ...)        → fmt.Sprintf("Send failed: %s", ...)
"解析响应失败"                         → "Failed to parse response."
fmt.Sprintf("飞书返回错误: %s", ...)    → fmt.Sprintf("Feishu returned an error: %s", ...)
fmt.Sprintf("全部 %d 个 Webhook 测试消息发送成功", n) → fmt.Sprintf("All %d webhook(s) tested successfully.", n)
fmt.Sprintf("部分成功：%d/%d 个 Webhook 发送成功", s, t) → fmt.Sprintf("Partial success: %d of %d webhook(s) sent.", s, t)
fmt.Sprintf("所有 Webhook 发送失败，最后错误: %s", e) → fmt.Sprintf("All webhooks failed. Last error: %s", e)
```

- [ ] **Step 9: Translate `model/user.go`**

Only `errors.New(...)` strings (not comments or log lines):

```go
errors.New("id 为空！")             → errors.New("id is required")
errors.New("username 为空！")       → errors.New("username is required")
errors.New("email 为空！")          → errors.New("email is required")
errors.New("affCode 为空！")        → errors.New("affCode is required")
errors.New("并非所有指定的用户都被删除") → errors.New("not all specified users were deleted")
errors.New("用户名或密码为空")      → errors.New("username and password are required")
errors.New("用户名或密码错误，或用户已被封禁") → errors.New("invalid username or password, or account is suspended")
errors.New("WeChat id 为空！")      → errors.New("WeChat id is required")
errors.New("GitHub id 为空！")      → errors.New("GitHub id is required")
errors.New("Google id 为空！")      → errors.New("Google id is required")
errors.New("邮箱地址或密码为空！")  → errors.New("email and password are required")
errors.New("quota 不能为负数！")    → errors.New("quota cannot be negative")
```

- [ ] **Step 10: Translate `model/redemption.go`**

```go
errors.New("id 为空！")          → errors.New("id is required")
errors.New("未提供兑换码")       → errors.New("redemption code is required")
errors.New("无效的 user id")     → errors.New("invalid user id")
errors.New("无效的兑换码")       → errors.New("invalid redemption code")
errors.New("该兑换码已被使用")   → errors.New("redemption code has already been used")
errors.New("兑换失败，" + err.Error()) → errors.New("redemption failed: " + err.Error())
errors.New("ids列表为空")        → errors.New("ids list is empty")
```

- [ ] **Step 11: Translate `relay/util/common.go`**

Only the `ErrorWithStatusCode.Error.Message = fmt.Sprintf(...)` lines:

```go
// Before → After
"网关超时 (504): 上游服务器响应超时，请稍后重试或检查API服务状态"
  → "Gateway timeout (504): upstream server timed out. Please retry or check your API service."
"网关错误 (502): 上游服务器返回无效响应"
  → "Bad gateway (502): upstream server returned an invalid response."
"服务不可用 (503): 上游服务器暂时无法处理请求"
  → "Service unavailable (503): upstream server is temporarily unable to handle requests."
"请求过于频繁 (429): 已达到API调用限制，请稍后重试"
  → "Too many requests (429): API rate limit reached. Please retry after a moment."
"认证失败 (401): API密钥无效或已过期"
  → "Unauthorized (401): API key is invalid or expired."
"权限不足 (403): 无权访问此资源或模型"
  → "Forbidden (403): you do not have access to this resource or model."
"资源未找到 (404): 请求的端点或模型不存在"
  → "Not found (404): the requested endpoint or model does not exist."
fmt.Sprintf("上游服务错误 (状态码: %d)", resp.StatusCode)
  → fmt.Sprintf("Upstream error (status %d).", resp.StatusCode)
```

- [ ] **Step 12: Translate `relay/channel/flux/adaptor.go`**

Only the one user-visible string:

```go
PriceType: "按量计费"  →  PriceType: "Pay per use"
```

- [ ] **Step 13: Translate `relay/channel/keling/util.go`**

Only `fmt.Errorf(...)` strings (not `fmt.Printf` debug lines):

```go
fmt.Errorf("无法从Key字段或Config获取有效的可灵凭证")   → fmt.Errorf("no valid Kling credentials found in Key field or Config")
fmt.Errorf("凭证为空")                                  → fmt.Errorf("credentials are empty")
fmt.Errorf("AccessKey不能为空")                         → fmt.Errorf("AccessKey is required")
fmt.Errorf("SecretKey不能为空")                         → fmt.Errorf("SecretKey is required")
fmt.Errorf("AccessKey长度过短")                         → fmt.Errorf("AccessKey is too short")
fmt.Errorf("SecretKey长度过短")                         → fmt.Errorf("SecretKey is too short")
fmt.Errorf("生成 JWT token 失败: %w", err)              → fmt.Errorf("failed to generate JWT token: %w", err)
fmt.Errorf("加载渠道配置失败: %w", err)                 → fmt.Errorf("failed to load channel config: %w", err)
fmt.Errorf("无效的 Kling 密钥格式 (期望 AK|SK): %w", err) → fmt.Errorf("invalid Kling key format (expected AK|SK): %w", err)
fmt.Errorf("凭证验证失败: %w", err)                     → fmt.Errorf("credential validation failed: %w", err)
```

- [ ] **Step 14: Translate `relay/channel/ali/video_adaptor.go`**

```go
// GetChannelName — this is a display string:
func (a *VideoAdaptor) GetChannelName() string { return "阿里云万相" }
// → return "Alibaba Wanxiang"
// (keep the brand Alibaba, translate the product name)
```

- [ ] **Step 15: Translate `common/helper/helper.go`**

```go
// Before:
time += strconv.Itoa(num/31104000) + " 年 "
time += strconv.Itoa(num/2592000) + " 个月 "
time += strconv.Itoa(num/86400) + " 天 "
time += strconv.Itoa(num/3600) + " 小时 "
time += strconv.Itoa(num/60) + " 分钟 "
time += strconv.Itoa(num) + " 秒"

// After:
time += strconv.Itoa(num/31104000) + "y "
time += strconv.Itoa(num/2592000) + "mo "
time += strconv.Itoa(num/86400) + "d "
time += strconv.Itoa(num/3600) + "h "
time += strconv.Itoa(num/60) + "m "
time += strconv.Itoa(num) + "s"
```

- [ ] **Step 16: Translate `common/message/feishu.go`**

Translate notification title and body format strings only (not comments or `fmt.Errorf` log strings):

```go
// Channel disable notification:
fmt.Sprintf("[%s] 🚨 渠道「%s」(#%d) 已被禁用", config.SystemName, channelName, channelId)
→ fmt.Sprintf("[%s] 🚨 Channel \"%s\" (#%d) has been disabled", config.SystemName, channelName, channelId)

// Body format string:
"**渠道ID：** %d\n**渠道名称：** %s\n**触发模型：** %s\n**状态码：** %d\n**错误详情：** %s\n**禁用时间：** %s"
→ "**Channel ID:** %d\n**Channel name:** %s\n**Model:** %s\n**Status code:** %d\n**Error:** %s\n**Disabled at:** %s"

// Key disable notification:
fmt.Sprintf("[%s] ⚠️ 渠道「%s」(#%d) 中的 Key 已被禁用", config.SystemName, channelName, channelId)
→ fmt.Sprintf("[%s] ⚠️ A key in channel \"%s\" (#%d) has been disabled", config.SystemName, channelName, channelId)

// Key body format string:
"**渠道ID：** %d\n**渠道名称：** %s\n**被禁用Key：** Key #%d (%s)\n**状态码：** %d\n**错误详情：** %s\n**禁用时间：** %s"
→ "**Channel ID:** %d\n**Channel name:** %s\n**Disabled key:** Key #%d (%s)\n**Status code:** %d\n**Error:** %s\n**Disabled at:** %s"

// Full channel disable (all keys gone):
fmt.Sprintf("[%s] 🔴 多Key渠道「%s」(#%d) 已被完全禁用", config.SystemName, channelName, channelId)
→ fmt.Sprintf("[%s] 🔴 Channel \"%s\" (#%d) fully disabled — all keys exhausted", config.SystemName, channelName, channelId)

// Full body:
"**渠道ID：** %d\n**渠道名称：** %s\n**禁用原因：** %s\n**禁用时间：** %s\n\n该渠道的所有Key都已被禁用，整个渠道已被系统自动禁用。"
→ "**Channel ID:** %d\n**Channel name:** %s\n**Reason:** %s\n**Disabled at:** %s\n\nAll keys in this channel have been disabled. The channel has been automatically disabled."

// Footer:
fmt.Sprintf("来自 %s 系统 | %s", config.SystemName, ...)
→ fmt.Sprintf("From %s | %s", config.SystemName, ...)

// Error strings (fmt.Errorf — these surface to callers):
fmt.Errorf("构建飞书消息失败: %s", err.Error())   → fmt.Errorf("failed to build Feishu message: %s", err.Error())
fmt.Errorf("所有飞书 Webhook 发送失败: %s", e)   → fmt.Errorf("all Feishu webhooks failed: %s", e)
fmt.Errorf("发送失败: %s", err.Error())           → fmt.Errorf("send failed: %s", err.Error())
fmt.Errorf("解析响应失败，HTTP状态码: %d", ...)   → fmt.Errorf("failed to parse response (HTTP %d)", ...)
fmt.Errorf("飞书返回错误: %s", feishuResp.Msg)   → fmt.Errorf("Feishu returned an error: %s", feishuResp.Msg)
```

- [ ] **Step 17: Translate `monitor/channel.go`**

Email subjects and HTML body content (not `logger.*` or `log.*` lines):

```go
// Email subject for channel disable:
fmt.Sprintf("渠道「%s」（#%d）已被禁用", channelName, channelId)
→ fmt.Sprintf("Channel \"%s\" (#%d) has been disabled", channelName, channelId)

// Email HTML body for channel disable:
`<h3>渠道自动禁用通知</h3>
<p><strong>渠道名称：</strong>%s</p>
<p><strong>渠道ID：</strong>#%d</p>
<p><strong>触发模型：</strong>%s</p>
<p><strong>状态码：</strong>%d</p>
<p><strong>禁用原因：</strong>%s</p>
<p><strong>禁用时间：</strong>%s</p>
<p>该渠道因出现错误已被系统自动禁用，请检查渠道配置和密钥的有效性。</p>`
→
`<h3>Channel Auto-Disabled</h3>
<p><strong>Channel name:</strong> %s</p>
<p><strong>Channel ID:</strong> #%d</p>
<p><strong>Model:</strong> %s</p>
<p><strong>Status code:</strong> %d</p>
<p><strong>Reason:</strong> %s</p>
<p><strong>Disabled at:</strong> %s</p>
<p>This channel was automatically disabled due to errors. Please verify the channel configuration and API key validity.</p>`

// Multi-key channel notification (no auto-disable):
fmt.Sprintf("多Key渠道 #%d 成功率过低", channelId)
→ fmt.Sprintf("Multi-key channel #%d has a low success rate", channelId)

fmt.Sprintf("多Key渠道（#%d）在最近 %d 次调用中成功率为 %.2f%%，低于阈值 %.2f%%。由于这是多Key渠道，系统未自动禁用，请手动检查各个Key的状态。", ...)
→ fmt.Sprintf("Multi-key channel #%d had a %.2f%% success rate over the last %d requests (threshold: %.2f%%). The channel was not auto-disabled because it has multiple keys — please check each key manually.", ...)

// Channel re-enabled:
fmt.Sprintf("渠道「%s」（#%d）已被启用", channelName, channelId)  [subject]
→ fmt.Sprintf("Channel \"%s\" (#%d) has been re-enabled", channelName, channelId)

fmt.Sprintf("渠道「%s」（#%d）已被启用", channelName, channelId)  [content]
→ fmt.Sprintf("Channel \"%s\" (#%d) has been re-enabled.", channelName, channelId)

// Key disable email subject:
fmt.Sprintf("多Key渠道「%s」（#%d）中的Key已被禁用", notification.ChannelName, notification.ChannelId)
→ fmt.Sprintf("Key disabled in channel \"%s\" (#%d)", notification.ChannelName, notification.ChannelId)

// Key disable email HTML body:
`<h3>多Key渠道Key自动禁用通知</h3>
<p><strong>渠道名称：</strong>%s</p>
<p><strong>渠道ID：</strong>#%d</p>
<p><strong>被禁用的Key：</strong>Key #%d (%s)</p>
<p><strong>禁用原因：</strong>%s</p>
<p><strong>状态码：</strong>%d</p>
<p><strong>禁用时间：</strong>%s</p>
<p>该Key因出现错误已被系统自动禁用，请检查Key的有效性。如果所有Key都被禁用，整个渠道也将被禁用。</p>`
→
`<h3>Key Auto-Disabled</h3>
<p><strong>Channel name:</strong> %s</p>
<p><strong>Channel ID:</strong> #%d</p>
<p><strong>Disabled key:</strong> Key #%d (%s)</p>
<p><strong>Reason:</strong> %s</p>
<p><strong>Status code:</strong> %d</p>
<p><strong>Disabled at:</strong> %s</p>
<p>This key was automatically disabled due to errors. If all keys are disabled, the channel will also be disabled.</p>`

// Full channel disable email subject:
fmt.Sprintf("多Key渠道「%s」（#%d）已被完全禁用", notification.ChannelName, notification.ChannelId)
→ fmt.Sprintf("Channel \"%s\" (#%d) fully disabled — all keys exhausted", notification.ChannelName, notification.ChannelId)

// Full channel disable HTML body:
`<h3>多Key渠道完全禁用通知</h3>
<p><strong>渠道名称：</strong>%s</p>
<p><strong>渠道ID：</strong>#%d</p>
<p><strong>禁用原因：</strong>%s</p>
<p><strong>禁用时间：</strong>%s</p>
<p>该渠道的所有Key都已被禁用，因此整个渠道已被系统自动禁用。请检查并修复所有Key的问题后重新启用。</p>`
→
`<h3>Channel Fully Disabled</h3>
<p><strong>Channel name:</strong> %s</p>
<p><strong>Channel ID:</strong> #%d</p>
<p><strong>Reason:</strong> %s</p>
<p><strong>Disabled at:</strong> %s</p>
<p>All keys in this channel have been disabled, so the channel has been automatically disabled. Please fix the key issues and re-enable the channel.</p>`
```

- [ ] **Step 18: Build and verify**

```bash
cd /c/Users/brows/Desktop/linkinfra
go build ./... 2>&1 | grep -v "sqlite3"
# Expected: no Go errors (sqlite3 C warnings are pre-existing and acceptable)

grep -rn $'[一-鿿]' --include="*.go" \
  controller/affinity.go controller/channel.go controller/user.go \
  controller/group_config.go controller/topup_stripe.go controller/topup.go \
  controller/token.go controller/notification.go \
  model/user.go model/redemption.go \
  relay/util/common.go relay/channel/flux/adaptor.go \
  relay/channel/keling/util.go relay/channel/ali/video_adaptor.go \
  common/helper/helper.go common/message/feishu.go monitor/channel.go \
  | grep -v "^\s*//"
# Expected: zero non-comment Chinese lines
```

- [ ] **Step 19: Commit**

```bash
git add controller/ model/user.go model/redemption.go relay/util/common.go \
        relay/channel/flux/adaptor.go relay/channel/keling/util.go \
        relay/channel/ali/video_adaptor.go \
        common/helper/helper.go common/message/feishu.go monitor/channel.go
git commit -m "i18n: English localize backend API messages and notifications"
```

---

## Task 6: Final verification

- [ ] **Step 1: Full frontend grep**

```bash
cd /c/Users/brows/Desktop/linkinfra-web
grep -rn $'[一-鿿]' --include="*.ts" --include="*.tsx" \
  --exclude-dir=node_modules --exclude-dir=.next \
  | grep -v "^\s*//" \
  | grep -v "零一万物\|百度文心千帆\|阿里通义千问\|讯飞星火认知\|智谱 ChatGLM\|腾讯混元\|百川大模型\|360 智脑\|AMA 问天\|阿里云万相"
# Expected: zero lines
```

- [ ] **Step 2: Full backend grep**

```bash
cd /c/Users/brows/Desktop/linkinfra
grep -rn $'[一-鿿]' --include="*.go" \
  | grep -v "^\s*//" \
  | grep -v "阿里云万相\|零一万物\|百度文心千帆\|阿里通义千问\|讯飞星火认知\|智谱 ChatGLM\|腾讯混元\|百川大模型"
# Expected: zero non-comment lines outside the intentionally kept brand names
```

- [ ] **Step 3: Backend build**

```bash
cd /c/Users/brows/Desktop/linkinfra
go build ./... 2>&1 | grep -v sqlite3
# Expected: clean
```

- [ ] **Step 4: Final commit**

```bash
cd /c/Users/brows/Desktop/linkinfra-web
git add -A
git commit -m "i18n: full English localization complete" --allow-empty
```
