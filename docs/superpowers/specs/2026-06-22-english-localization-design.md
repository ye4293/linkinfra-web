# English Localization Design

**Date:** 2026-06-22  
**Scope:** linkinfra-web (frontend) + linkinfra (backend)  
**Approach:** Inline string replacement — no i18n infrastructure added

---

## Goal

Replace all user-visible Chinese text with native-quality English. Code comments and server-side log messages are out of scope.

---

## Translation Principles

These rules apply to every file across both repos.

### Tone & style

- **Native English, not literal translation.** Prefer concise, idiomatic phrasing over word-for-word equivalents.
- **Consistent tense:** past tense for success toasts (`Saved.`, `Deleted.`), present/imperative for instructions (`Please enter a username.`).
- **No exclamation marks** unless the original emphasis genuinely warrants it.
- **Sentence case** for labels and messages (e.g. `Channel not found.`, not `Channel Not Found.`).

### Buttons / actions

| Chinese               | English                |
| --------------------- | ---------------------- |
| 保存                  | Save                   |
| 取消                  | Cancel                 |
| 删除                  | Delete                 |
| 禁用 / 启用           | Disable / Enable       |
| 测试                  | Test                   |
| 编辑                  | Edit                   |
| 复制                  | Copy                   |
| 确认                  | Confirm                |
| 测试中... / 保存中... | Testing... / Saving... |
| 加载中...             | Loading...             |

### Toast messages

| Chinese          | English                        |
| ---------------- | ------------------------------ |
| 保存成功         | Saved.                         |
| 删除成功         | Deleted.                       |
| 操作成功         | Done.                          |
| 复制失败，请重试 | Copy failed. Please try again. |
| 获取 X 失败      | Failed to load X.              |
| 请输入 X         | X is required.                 |

### Status labels

| Chinese  | English       |
| -------- | ------------- |
| 已启用   | Enabled       |
| 手动禁用 | Disabled      |
| 自动禁用 | Auto-disabled |
| 待支付   | Pending       |
| 已过期   | Expired       |

### Backend API error messages (returned to callers)

- Sentence case, end with a period.
- Developer-facing: precise, not customer-support-softened.
- E.g. `用户名或密码错误，或用户已被封禁` → `Invalid username or password, or account is suspended.`

### Time formatting (backend helper)

- `3 年 2 个月 5 天` → `3y 2mo 5d`

### Do NOT translate

- Chinese AI provider brand names: `零一万物`, `百度文心千帆`, `腾讯混元`, `讯飞星火认知`, `智谱 ChatGLM`, `百川大模型`, `腾讯混元` etc.
- Code comments and inline developer notes (out of scope).
- Server-side log messages (out of scope).

---

## File Groups

### Group 1 — Frontend: locales & constants

Low risk. Pure string/constant files with no logic.

| File                 | Content                                               |
| -------------------- | ----------------------------------------------------- |
| `locales/zh.ts`      | Landing page copy, nav labels (334 lines)             |
| `constants/data.ts`  | Sidebar nav titles                                    |
| `constants/index.ts` | Channel type display names (keep Chinese brand names) |
| `enums/user.ts`      | User role enum labels                                 |

### Group 2 — Frontend: settings & forms

Medium risk. Form pages and modals with many inline strings.

| File                                           | Content                    |
| ---------------------------------------------- | -------------------------- |
| `sections/setting/view/settingPage.tsx`        | System settings page       |
| `sections/setting/view/discountPage.tsx`       | Discount settings          |
| `sections/setting/view/modelSettingPage.tsx`   | Model settings             |
| `sections/setting/view/paymentSettingPage.tsx` | Payment settings           |
| `sections/channel/channel-form.tsx`            | Channel create/edit form   |
| `sections/channel/affinity-modal.tsx`          | Affinity config modal      |
| `sections/channel/multi-key-modal.tsx`         | Multi-key management modal |
| `sections/channel/model-select-modal.tsx`      | Model selector modal       |
| `sections/token/token-form.tsx`                | Token form                 |
| `sections/user/user-form.tsx`                  | User form                  |
| `sections/setting/update-user-form.tsx`        | Update user form           |

### Group 3 — Frontend: tables & shared components

Medium risk. Table columns, filters, shared UI components, type JSDoc labels.

| File                                     | Content                                 |
| ---------------------------------------- | --------------------------------------- |
| `sections/channel/tables/` (all files)   | Channel table columns, actions, filters |
| `sections/log/tables/` (all files)       | Log table                               |
| `sections/image/tables/` (all files)     | Image table                             |
| `sections/video/tables/` (all files)     | Video table                             |
| `sections/topup/payment-section.tsx`     | Top-up UI                               |
| `sections/topup/transaction-history.tsx` | Transaction history table               |
| `components/datetime-range-picker.tsx`   | Date range picker labels                |
| `components/json-editor.tsx`             | JSON editor labels                      |
| `lib/types/*.ts`                         | JSDoc field labels on type definitions  |
| `utils/render.ts`                        | Render utilities with display strings   |
| `app/lib/clientFetch.ts`                 | Client fetch error messages             |
| `app/lib/serverFetch.ts`                 | Server fetch error messages             |

### Group 4 — Frontend: misc

Low risk. Scattered single-file changes.

| File                                        | Content                      |
| ------------------------------------------- | ---------------------------- |
| `sections/overview/analytics-content.tsx`   | Analytics labels             |
| `sections/profile/system-token-card.tsx`    | Profile page                 |
| `sections/model-plaza/model-plaza-view.tsx` | Model plaza view             |
| `auth.config.ts`                            | Auth error/redirect messages |
| `hooks/use-copy-to-clipboard.tsx`           | Copy toast messages          |
| `hooks/use-optimized-pagination.tsx`        | Pagination labels            |
| `app/api/test-timeout/route.ts`             | Test endpoint messages       |

### Group 5 — Backend (Go)

Independent of frontend compilation. Validate with `go build ./...` after.

| File                                 | Content                                    |
| ------------------------------------ | ------------------------------------------ |
| `controller/affinity.go`             | Affinity API responses                     |
| `controller/channel.go`              | Channel management API responses           |
| `controller/user.go`                 | User auth/management responses             |
| `controller/group_config.go`         | Group config API responses                 |
| `controller/topup_stripe.go`         | Stripe top-up error messages               |
| `controller/topup.go`                | Top-up management responses                |
| `controller/token.go`                | Token validation messages                  |
| `controller/notification.go`         | Notification API responses                 |
| `model/user.go`                      | User auth error strings                    |
| `model/redemption.go`                | Redemption error strings                   |
| `relay/util/common.go`               | HTTP status error messages for API callers |
| `relay/channel/ali/video_adaptor.go` | Balance error                              |
| `relay/channel/keling/util.go`       | Credential validation errors               |
| `relay/channel/flux/adaptor.go`      | `按量计费` price type label                |
| `common/helper/helper.go`            | Time duration formatting                   |
| `common/message/feishu.go`           | Feishu webhook notification bodies         |
| `monitor/channel.go`                 | Email notification bodies                  |

---

## Execution Strategy

All 5 groups are independent and can be executed in parallel by separate agents.

**Completion criteria:**

- Zero Chinese characters remain in user-visible strings (UI, toasts, API responses, notifications)
- Code comments and log messages are untouched
- `go build ./...` passes on backend
- Frontend compiles without TypeScript errors

**Chinese brand names to verify are preserved:**
`零一万物`, `百度文心千帆`, `腾讯混元`, `讯飞星火认知`, `智谱 ChatGLM`, `百川大模型`
