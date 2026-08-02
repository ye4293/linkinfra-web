# Kumo 设计体系迁移 — 试点设计（仪表盘概览页）

日期：2026-08-03
状态：待实施

## 背景与目标

把 LinkInfra 前端从 shadcn/ui（Radix + Tailwind 3）迁移到 Cloudflare 自研设计体系 **Kumo**（`@cloudflare/kumo` v2.9.0，MIT），使仪表盘获得 Cloudflare Dashboard 的观感。

由于 Kumo 与现有技术栈存在多处硬性不兼容（见「约束」），**本设计只覆盖单页试点**。试点的目的不是交付页面，而是**测出全面迁移的真实代价**，据此决定是否推进 Tailwind v4 全面升级。

### 已确定的决策

| 决策项               | 选择                                                    |
| -------------------- | ------------------------------------------------------- |
| Tailwind v4 处理方式 | 先做单页试点，不立即升级                                |
| 长期迁移范围         | 仅 dashboard（`app/dashboard/**` + 对应 `sections/**`） |
| 试点页面             | 仪表盘概览（`sections/overview`）                       |
| 视觉目标             | 沿用 Kumo 默认主题，还原 Cloudflare 风格                |
| 试点方式             | 平行路由，原页面不动，可左右对比                        |
| 图表                 | 用 Kumo Chart + echarts，提前验证最大风险               |

部署架构不在本设计范围内。

## 约束（调研确认）

### Kumo 只支持 Tailwind v4

默认样式导出 `@cloudflare/kumo/styles`（= `styles/tailwind`）内含 `@theme {}` 块与 `@source` 指令，均为 Tailwind v4 专属语法，Tailwind 3 的 PostCSS 无法处理。本项目当前是 **Tailwind 3.4 + JS 配置**。

**试点的绕行方案**：改用 `@cloudflare/kumo/styles/standalone`。经核实该文件是**纯编译后 CSS**（`@theme` 出现 0 次、`@source` 0 次），可作为普通 CSS 被 Tailwind 3 项目引入。代价：

- 体积 123KB
- 自带 Tailwind v4 的 preflight 重置，加载即全局生效 → 必须只在试点路由加载

### 主题与深色模式机制

Kumo 走 `data-theme="kumo"` + `data-mode="dark|light"`，其中 `[data-mode=dark] { color-scheme: dark }`，令牌内部用 98 处 `light-dark()` 自动翻转。

**这与现有 shadcn 的 `class="dark"`（`darkMode: ['class']`）不兼容**，需在试点 layout 里从 `next-themes` 桥接。

`light-dark()` 需 Chrome 123+ / Safari 17.5+ / Firefox 120+。

### 依赖差异

Kumo 的 peer dependencies 与现状对比：

| Kumo 要求               | 现状           | 全量迁移影响                           | 本试点是否涉及         |
| ----------------------- | -------------- | -------------------------------------- | ---------------------- |
| `@phosphor-icons/react` | `lucide-react` | 71 文件                                | 是，仅概览页 4 个图标  |
| `echarts` ^6            | `recharts`     | 6 文件（其中 2 个是死代码）            | 是                     |
| `zod` ^4                | `zod` ^3.24    | 9 文件 + `@hookform/resolvers` 需升 v5 | **否**（概览页无表单） |
| `react` 18/19           | 18.3.1         | 无                                     | 兼容                   |

### 组件覆盖

Kumo 导出 48 个组件。经核对 `ai/component-registry.json` 与 `dist/index.d.ts`，现有 shadcn 组件的对应关系：

有直接对应：`Tabs`、`Table`、`Meter`、`SkeletonLine`、`Textarea`/`InputArea`、`Dialog`、`Select`、`Switch`、`Checkbox`、`Popover`、`Tooltip`、`Badge`、`Label`、`Pagination`、`Empty`、`Loader`、`DropdownMenu`、`Collapsible`（覆盖 accordion）、`Field`（覆盖 form）、`Dialog` + `DeleteResource`（覆盖 alert-dialog）。

**确认缺失**：`Avatar`、`Separator`、`ScrollArea`。Kumo 另有 `@cloudflare/kumo/primitives/*` 全量再导出 Base UI 原语，缺失项可基于原语自建，无需额外引入 Radix。

**非 1:1 映射（需手工组合）**：shadcn 的 `Card` / `CardHeader` / `CardTitle` / `CardContent` 在 Kumo 无对应结构。`Surface` 只是带样式的容器（props 仅 `as`/`render`/`className` 等）；`LayerCard` 是 `.Primary` / `.Secondary` 双槽结构。卡片需用 `Surface` + `Text` 手工组合。

### 图表 API

`Chart` 与 `TimeseriesChart` **要求把 echarts 实例作为 `echarts` prop 传入**（Kumo 不自行 import，由使用方决定打包哪些模块）。

- `Chart`：低层 ECharts 包装，`options: KumoChartOption` 直通 `setOption()`，另有 `isDarkMode`、`height`（默认 350）、`aspectRatio`
- `TimeseriesChart`：`data: TimeseriesData[]`、`type: "line" | "bar"`、`xAxisTickFormat`、`yAxisTickFormat`、`markers`、`thresholds`

现有两处图表都是时序柱状图，`TimeseriesChart` 比通用 `Chart` 更贴合。

## 试点范围

### 死代码先删

`sections/overview/` 下两个文件**全项目零引用**，是 shadcn 模板残留（硬编码 January–June / desktop-mobile 假数据）：

- `area-graph.tsx`（107 行）
- `pie-graph.tsx`（126 行）

删除它们同时消除 2 个 recharts 引用点。

### 实际迁移对象

删除死代码后为 **4 文件 / 818 行**：

| 文件                    | 行数              | 迁移内容                                                                                                                                                                             |
| ----------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `view/overview.tsx`     | 277               | 4 个卡片（3 个统计卡 + 热门模型卡）Card→Surface + Text 手工组合、`Tabs`、内联进度条 `<div>`→`Meter`、`Skeleton`→`SkeletonLine`、4 个 lucide 图标（Wallet/Zap/CalendarDays）→Phosphor |
| `analytics-content.tsx` | 266               | Card、`Table`、内联 recharts BarChart→`TimeseriesChart`、`SkeletonLine`                                                                                                              |
| `bar-graph.tsx`         | 192               | recharts BarChart→`TimeseriesChart`                                                                                                                                                  |
| `recent-sales.tsx`      | 83（有效仅约 35） | 列表 + 头像（**Kumo 无 Avatar**，本试点保留现有实现）                                                                                                                                |

`recent-sales.tsx` 的 83 行中有 46 行（第 35–80 行）是注释掉的 shadcn 模板残留（Jackson Lee、Sofia Davis 等假数据），迁移时不带过去。另外现有实现有两处应顺手修正：

- 每个模型都套用 `src="/avatars/01.png"` 占位图，对 AI 模型无意义 → Kumo 版只保留字母 fallback
- 第 27 行硬编码 `<p>Model Name</p>` 作为标题，与下一行的真实模型名重复 → 改为有意义的标签或删除

### 不改动的部分

数据获取逻辑（`request.get('/api/dashboard')`、`useSession`、`useLocale`）、`renderQuota` 等工具函数、类型定义全部原样复用。**试点只换表现层**，以便和原页面做同数据对比。

## 架构

### 目录

新代码放在与原目录并列的位置，回退等于删目录，将来正式切换只需改 import：

```
sections/overview-kumo/
├── view/overview.tsx
├── analytics-content.tsx
├── bar-graph.tsx
└── recent-sales.tsx
```

### 路由与样式隔离

```
app/dashboard/overview-kumo/
├── layout.tsx    # 'use client'
│                 #   import '@cloudflare/kumo/styles/standalone'
│                 #   <div data-theme="kumo" data-mode={resolvedTheme}>
└── page.tsx      # 渲染 sections/overview-kumo/view/overview.tsx
```

- 嵌套 layout 自动继承 `app/dashboard/layout.tsx` 的侧边栏 → 能测出与真实布局的集成问题
- standalone CSS 仅在此路由加载 → preflight 影响圈定在试点内
- 深色模式：`useTheme()` 的 `resolvedTheme` → `data-mode`
- 可能需要在此 layout 包 `KumoPortalProvider` / `TooltipProvider`（Dialog、Tooltip 的 portal 容器）

### 依赖安装

```
@cloudflare/kumo  @phosphor-icons/react  echarts@^6
```

三者均为 Kumo peer dependency。`zod` 与 `lucide-react` 本次不动。

## 待验证的风险

按优先级排列，前两项决定试点是否可行：

1. **Next 14 能否消费 ESM-only 的 Kumo** — `exports` 只提供 `import`、无 `require`，可能需要 `next.config.js` 加 `transpilePackages: ['@cloudflare/kumo']`。**第一步就要试通**，不通则整个方案需重估
2. **preflight 冲突的实际破坏范围** — 继承来的侧边栏、`PageContainer` 是否塌陷。这是试点的头号观测目标
3. **`TimeseriesChart` 是否覆盖现有图表需求** — 双系列、tooltip 数值格式化、i18n 轴标签
4. **`light-dark()` 浏览器支持** — 需确认目标用户浏览器分布

## 验收标准

`/dashboard/overview-kumo` 与 `/dashboard` 并排打开，在**同一份真实接口数据**下：

- [ ] 3 个统计卡数值与原页面完全一致（余额、吞吐、今日用量）
- [ ] 热门模型卡列表内容与原页面一致
- [ ] overview / analytics 两个 tab 均可切换且内容正确
- [ ] 图表渲染正常、tooltip 可交互、数值与原图一致
- [ ] 明暗两种模式均正常，且跟随 `next-themes` 切换
- [ ] 继承的侧边栏未破损
- [ ] `pnpm build` 通过

## 交付物

除代码外，试点结束需产出一份结论，回答：

1. 上述 4 项风险各自的实测结果
2. 单页迁移的实际耗时
3. 据此外推 dashboard 全量迁移的代价
4. **建议：是否推进 Tailwind v4 全面升级**

## 遗留决策

以下留到全量迁移阶段：

- Tailwind 3 → 4 全面升级（含 236 文件的工具类记法核查）
- `zod` 3 → 4 + `@hookform/resolvers` v3 → v5
- `lucide-react` → Phosphor 剩余 67 文件
- `Avatar` / `Separator` / `ScrollArea` 基于 Base UI 原语自建
- 是否用 Kumo 的 `Sidebar` 组件族替换 `components/dashboard-nav.tsx`
