# Kumo 试点实施计划（仪表盘概览页）

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在平行路由 `/dashboard/overview-kumo` 上用 Cloudflare Kumo 重建仪表盘概览页，测出全量迁移的真实代价。

**Architecture:** 新增 `app/dashboard/overview-kumo/`（嵌套 layout 引入 Kumo standalone CSS 并桥接 next-themes），新增 `sections/overview-kumo/`（4 个表现层组件）。原 `/dashboard` 与 `sections/overview/` 完全不动，可左右对比。数据获取逻辑原样复用。

**Tech Stack:** Next.js 14 App Router、React 18、Tailwind 3（保留）、`@cloudflare/kumo` v2.9.0、`echarts` ^6、`@phosphor-icons/react`

**依据规格：** `docs/superpowers/specs/2026-08-03-kumo-pilot-design.md`

---

## 关于验证方式的说明

本项目**没有测试框架**——`package.json` 无 jest/vitest/playwright，scripts 仅 dev/build/start/lint/format。因此本计划不含单元测试步骤，改用：

1. `npx tsc --noEmit` — 类型检查（捕获 API 误用，这是本次最主要的自动化保障）
2. `pnpm build` — 构建（捕获 ESM/SSR 问题）
3. `pnpm lint`
4. 浏览器实测 — 视觉对比是本试点的核心验收手段，无法自动化

引入测试框架属于独立决策，不在本计划范围。

---

## Task 1: 装依赖并验证 Kumo 能否在 Next 14 中跑通

这是**最高风险项**，必须第一个做完。Kumo 是 ESM-only（`exports` 只有 `import`，无 `require`），若 Next 14 无法消费，整个方案要重估。

**Files:**

- Modify: `package.json`
- Modify: `next.config.js`
- Create: `app/dashboard/kumo-smoke/page.tsx`（临时冒烟页，Task 9 删除）

- [ ] **Step 1: 安装三个 peer dependency**

```bash
pnpm add @cloudflare/kumo @phosphor-icons/react echarts
```

- [ ] **Step 2: 确认装上的版本**

```bash
pnpm ls @cloudflare/kumo @phosphor-icons/react echarts
```

预期：`@cloudflare/kumo 2.9.0`、`echarts` 主版本为 6、`@phosphor-icons/react` 主版本为 2。
若 echarts 装成 5.x，改用 `pnpm add echarts@^6`。

- [ ] **Step 3: 写最小冒烟页**

创建 `app/dashboard/kumo-smoke/page.tsx`：

```tsx
'use client';

import '@cloudflare/kumo/styles/standalone';
import { Button } from '@cloudflare/kumo/components/button';
import { Surface } from '@cloudflare/kumo';
import { Text } from '@cloudflare/kumo';

export default function KumoSmokePage() {
  return (
    <div data-theme="kumo" data-mode="light" className="p-8">
      <Surface className="rounded-lg p-6">
        <Text variant="heading2" as="h2">
          Kumo smoke test
        </Text>
        <Text variant="secondary">
          若这段文字与下方按钮带有 Kumo 样式，则打通。
        </Text>
        <div className="mt-4">
          <Button>Kumo Button</Button>
        </div>
      </Surface>
    </div>
  );
}
```

- [ ] **Step 4: 跑类型检查**

```bash
npx tsc --noEmit
```

预期：通过。若报 `Cannot find module '@cloudflare/kumo'` 或 ESM 相关错误，进入 Step 5。

- [ ] **Step 5: 若 Step 4 或 Step 6 失败，加 transpilePackages**

修改 `next.config.js`，在 `nextConfig` 对象内加一行：

```js
const nextConfig = {
  transpilePackages: ['@cloudflare/kumo'],
  images: {
    domains: ['utfs.io', 'api.slingacademy.com']
  }
  // ...其余保持不变
};
```

- [ ] **Step 6: 起开发服务器，浏览器访问冒烟页**

```bash
pnpm dev
```

访问 `http://localhost:3001/dashboard/kumo-smoke`（需先登录）。

预期：按钮和 Surface 带 Kumo 样式（不是浏览器默认样式）。

**这一步要记录三件事，写入 Task 9 的结论：**

1. 是否需要 `transpilePackages`
2. 继承的侧边栏是否被 standalone CSS 的 preflight 破坏（**风险 2 的首次观测**）
3. 控制台是否有 hydration 或 ESM 报错

- [ ] **Step 7: 构建验证**

```bash
pnpm build
```

预期：成功。这是 ESM 兼容性的最终判据——`tsc` 过了但 build 挂掉是常见情况。

- [ ] **Step 8: 提交**

```bash
git add package.json pnpm-lock.yaml next.config.js app/dashboard/kumo-smoke/
git commit -m "feat(kumo): 装 Kumo 依赖并加冒烟页验证 Next 14 ESM 兼容性"
```

**⚠️ 门禁：若 Step 6 或 Step 7 无法通过，停止后续所有任务，回报结论。**

---

## Task 2: 用 Kumo CLI 查证组件 API

Kumo 自带文档 CLI。**不要凭记忆写 props**——本任务把后续要用的组件 API 全部落到纸面。

**Files:** 无（只读操作，产出记录）

- [ ] **Step 1: 列出全部组件确认可用性**

```bash
npx @cloudflare/kumo ls
```

- [ ] **Step 2: 逐个导出后续要用的组件文档**

```bash
for c in Surface Text Tabs Table Meter Loader Chart Badge; do
  echo "===== $c ====="
  npx @cloudflare/kumo doc $c
done
```

- [ ] **Step 3: 记录以下待确认项的确切答案**

以下几点规格阶段未能完全确认，实现前必须查清：

| 待确认                                                           | 为什么重要                                 |
| ---------------------------------------------------------------- | ------------------------------------------ |
| `SkeletonLine` 的 props（是否接受 `className` / 宽高怎么控制）   | 4 个卡片的 loading 态都要用                |
| `Meter` 的 `customValue` 与 `showValue` 行为差异                 | 余额卡进度条要显示 `65%` 样式的文本        |
| `Tabs` 的 `variant` 可选值与 `size`                              | 要选一个接近 shadcn TabsList 的观感        |
| `ChartPalette` 的完整 API（`semantic()` 之外的按序号取色函数名） | 3 个图表要取 Kumo 的图表色，不该硬编码 hex |
| `Chart` 的 `options` 是否需要手动 `echarts.use()` 注册模块       | echarts/core 按需注册，漏注册会白屏        |

- [ ] **Step 4: 确认 Phosphor 图标名**

现有页面用 lucide 的 `Wallet` / `Zap` / `CalendarDays`。Phosphor 命名不同，确认对应名称：

```bash
node -e "const i=require('@phosphor-icons/react');['Wallet','Lightning','CalendarDots','CalendarBlank','Calendar'].forEach(n=>console.log(n, typeof i[n]))"
```

预期：`Wallet` 与 `Lightning` 存在（`Lightning` 对应 lucide 的 `Zap`）；日历图标取存在的那个。

**本任务不产生提交**，结论用于后续任务。

---

## Task 3: 删除死代码

`area-graph.tsx` 与 `pie-graph.tsx` 全项目零引用，是 shadcn 模板残留。

**Files:**

- Delete: `sections/overview/area-graph.tsx`
- Delete: `sections/overview/pie-graph.tsx`

- [ ] **Step 1: 删除前再次确认零引用**

```bash
grep -rn "area-graph\|pie-graph\|AreaGraph\|PieGraph" --include=*.tsx --include=*.ts . | grep -v node_modules
```

预期：只匹配到这两个文件自身的定义。若有其他引用，**停止并回报**。

- [ ] **Step 2: 删除**

```bash
git rm sections/overview/area-graph.tsx sections/overview/pie-graph.tsx
```

- [ ] **Step 3: 确认构建仍通过**

```bash
npx tsc --noEmit && pnpm build
```

预期：均通过。

- [ ] **Step 4: 提交**

```bash
git commit -m "chore: 删除 overview 下零引用的 area-graph 与 pie-graph

两者均为 shadcn 模板残留，含硬编码假数据，全项目无引用。"
```

---

## Task 4: 试点路由的 layout（样式隔离 + 主题桥接）

**Files:**

- Create: `app/dashboard/overview-kumo/layout.tsx`
- Create: `app/dashboard/overview-kumo/page.tsx`
- Create: `sections/overview-kumo/view/overview.tsx`（本任务只建占位，Task 8 填实）
- Create: `sections/overview-kumo/view/index.ts`（barrel，遵循现有约定）

- [ ] **Step 1: 写 layout**

创建 `app/dashboard/overview-kumo/layout.tsx`：

```tsx
'use client';

import '@cloudflare/kumo/styles/standalone';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

export default function OverviewKumoLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // next-themes 在服务端拿不到真实主题，挂载前统一按 light 渲染以避免 hydration 不一致
  useEffect(() => setMounted(true), []);

  const mode = mounted && resolvedTheme === 'dark' ? 'dark' : 'light';

  return (
    <div data-theme="kumo" data-mode={mode}>
      {children}
    </div>
  );
}
```

说明：Kumo 走 `data-mode` → `color-scheme` → 令牌内 `light-dark()`，与 shadcn 的 `class="dark"` 是两套机制，必须这样桥接。

- [ ] **Step 2: 写 page 与 barrel**

现有约定是 `sections/<x>/view/index.ts` 把 default 重导出为具名 `<X>PageView`，页面导出 `metadata` 加默认 `page()`（见 `app/dashboard/page.tsx` 与 `sections/overview/view/index.ts`）。照此办理。

创建 `sections/overview-kumo/view/index.ts`：

```ts
export { default as OverViewKumoPageView } from './overview';
```

创建 `app/dashboard/overview-kumo/page.tsx`：

```tsx
import { OverViewKumoPageView } from '@/sections/overview-kumo/view';

export const metadata = {
  title: 'Dashboard : Overview (Kumo)'
};

export default function page() {
  return <OverViewKumoPageView />;
}
```

注意此文件**不加** `'use client'`——`metadata` 只能由服务端组件导出。客户端逻辑都在 layout 与 view 里。

- [ ] **Step 3: 建占位 view，先只验证路由和主题通路**

创建 `sections/overview-kumo/view/overview.tsx`：

```tsx
'use client';

import { Surface, Text } from '@cloudflare/kumo';

export default function OverViewKumoPage() {
  return (
    <div className="p-6">
      <Surface className="rounded-lg p-6">
        <Text variant="heading2" as="h2">
          Kumo 概览页（施工中）
        </Text>
        <Text variant="secondary">切换明暗主题，这块应随之变色。</Text>
      </Surface>
    </div>
  );
}
```

- [ ] **Step 4: 类型检查**

```bash
npx tsc --noEmit
```

预期：通过。

- [ ] **Step 5: 浏览器验证主题桥接**

访问 `http://localhost:3001/dashboard/overview-kumo`，用应用自带的主题切换按钮切明暗。

预期：Surface 背景与文字颜色随之改变；控制台无 hydration 警告。

**若明暗不切换**：确认 `data-mode` 是否真的落到 DOM（开发者工具检查该 div），以及 `resolvedTheme` 是否返回 `'dark'`。

- [ ] **Step 6: 提交**

```bash
git add app/dashboard/overview-kumo/ sections/overview-kumo/
git commit -m "feat(kumo): 加试点路由 layout，隔离 standalone CSS 并桥接 next-themes"
```

**Files 补充：** 本任务新增 `sections/overview-kumo/view/index.ts` barrel。

---

## Task 5: recent-sales（列表 + 头像替代）

Kumo 无 `Avatar`。本试点用带 Kumo 令牌样式的字母圆形块替代，不引入 Radix，也不再用无意义的占位图。

**Files:**

- Create: `sections/overview-kumo/recent-sales.tsx`
- Reference: `sections/overview/recent-sales.tsx`（原实现，勿改）

- [ ] **Step 1: 写组件**

创建 `sections/overview-kumo/recent-sales.tsx`：

```tsx
import { Text } from '@cloudflare/kumo';
import { renderQuota } from '@/utils/render';
import { ModelStat } from '@/lib/types/dashboard';

interface RecentSalesProps {
  dataList: ModelStat[];
}

export const RecentSales: React.FC<RecentSalesProps> = ({ dataList }) => {
  return (
    <div className="space-y-6">
      {dataList.map((stat) => (
        <div className="flex items-center gap-4" key={stat.model_name}>
          <div className="bg-kumo-raised flex h-9 w-9 shrink-0 items-center justify-center rounded-full">
            <Text variant="mono-secondary" size="sm">
              {stat.model_name.slice(0, 3).toUpperCase()}
            </Text>
          </div>
          <Text variant="mono" truncate>
            {stat.model_name}
          </Text>
          <div className="ml-auto shrink-0">
            <Text bold>{renderQuota(stat.quota_sum)}</Text>
          </div>
        </div>
      ))}
    </div>
  );
};
```

相对原实现的三处修正（规格已记录）：

1. 去掉对每个模型都套 `/avatars/01.png` 的无意义占位图
2. 去掉硬编码的 `<p>Model Name</p>`（与下一行真实模型名重复）
3. `key` 从数组下标改为 `model_name`

- [ ] **Step 2: 确认 `bg-kumo-raised` 这个类真实存在**

```bash
grep -o "bg-kumo-[a-z-]*" node_modules/@cloudflare/kumo/dist/styles/kumo-standalone.css | sort -u
```

若 `bg-kumo-raised` 不在列表中，从输出里选一个语义相近的（如 `bg-kumo-base`）替换。**不要凭猜写 Kumo 类名。**

- [ ] **Step 3: 类型检查**

```bash
npx tsc --noEmit
```

预期：通过。若 `Text` 不接受 `size` 或 `truncate`，按 Task 2 Step 2 导出的文档修正。

- [ ] **Step 4: 提交**

```bash
git add sections/overview-kumo/recent-sales.tsx
git commit -m "feat(kumo): 迁移 recent-sales，用 Kumo 令牌字母块替代 Avatar"
```

---

## Task 6: bar-graph（recharts → Kumo Chart + echarts 类目轴）

**Files:**

- Create: `sections/overview-kumo/bar-graph.tsx`
- Reference: `sections/overview/bar-graph.tsx`（原实现，勿改）

数据形状：`GraphData { hour: string; amount: number }`。x 轴用**类目轴**（`type: 'category'`），保留现有语义，不合成时间戳。

- [ ] **Step 1: 写组件**

创建 `sections/overview-kumo/bar-graph.tsx`：

```tsx
'use client';

import * as React from 'react';
import { getUnixTime } from 'date-fns';
import * as echarts from 'echarts/core';
import { BarChart } from 'echarts/charts';
import { GridComponent, TooltipComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { useTheme } from 'next-themes';
import { Chart } from '@cloudflare/kumo/components/chart';
import { Surface, Text } from '@cloudflare/kumo';
import request from '@/app/lib/clientFetch';
import { GraphData, GraphResult } from '@/lib/types/dashboard';

// echarts/core 按需注册；漏注册会导致图表区域空白
echarts.use([BarChart, GridComponent, TooltipComponent, CanvasRenderer]);

const METRICS = {
  quota: { label: 'Consumption' },
  token: { label: 'Tokens' },
  count: { label: 'Times' }
} as const;

type MetricKey = keyof typeof METRICS;

interface BarGraphProps {
  session: any;
}

export function BarGraph({ session }: BarGraphProps) {
  const [activeChart, setActiveChart] = React.useState<MetricKey>('quota');
  const [graphData, setGraphData] = React.useState<GraphData[]>([]);
  const { resolvedTheme } = useTheme();
  const isDarkMode = resolvedTheme === 'dark';

  const userRole = session?.user?.role;

  React.useEffect(() => {
    const fetchData = async () => {
      const graphApi = [10, 100].includes(Number(userRole))
        ? `/api/dashboard/graph`
        : `/api/dashboard/graph/self`;
      const params = new URLSearchParams({
        time: String(Math.trunc(getUnixTime(new Date()))),
        target: activeChart
      });
      const res: GraphResult = await request.get(`${graphApi}?${params}`);

      if (!res?.data || !Array.isArray(res.data)) {
        console.error('API 返回数据异常:', res);
        setGraphData([]);
        return;
      }

      if (activeChart === 'quota') {
        const quotaPerUnit = parseFloat(
          (typeof window !== 'undefined' &&
            localStorage?.getItem('quota_per_unit')) ||
            '500000'
        );
        res.data = res.data.map((item: GraphData) => ({
          ...item,
          amount: parseFloat((item.amount / quotaPerUnit).toFixed(3))
        }));
      }
      setGraphData(res.data);
    };
    fetchData();
  }, [userRole, activeChart]);

  const options = React.useMemo(
    () => ({
      grid: { left: 48, right: 16, top: 16, bottom: 32 },
      xAxis: {
        type: 'category' as const,
        data: graphData.map((d) => d.hour),
        axisTick: { show: false },
        axisLine: { show: false }
      },
      yAxis: { type: 'value' as const },
      tooltip: {
        trigger: 'axis' as const,
        // 保留原实现的 `${hour}:00` 标签格式
        formatter: (params: any) => {
          const p = Array.isArray(params) ? params[0] : params;
          return `${p.axisValue}:00<br/>${METRICS[activeChart].label}: ${p.data}`;
        }
      },
      series: [
        {
          type: 'bar' as const,
          data: graphData.map((d) => d.amount)
        }
      ]
    }),
    [graphData, activeChart]
  );

  return (
    <Surface className="rounded-lg">
      <div className="border-kumo-hairline flex flex-col items-stretch border-b sm:flex-row">
        <div className="flex flex-1 flex-col justify-center gap-1 px-6 py-5">
          <Text variant="heading3" as="h3">
            Data Analysis
          </Text>
          <Text variant="secondary">Showing usage for one day</Text>
        </div>
        <div className="flex">
          {(Object.keys(METRICS) as MetricKey[]).map((key) => (
            <button
              key={key}
              data-active={activeChart === key}
              onClick={() => setActiveChart(key)}
              className="data-[active=true]:bg-kumo-raised sm:border-kumo-hairline flex flex-1 flex-col justify-center px-6 py-4 text-left sm:border-l"
            >
              <Text variant="secondary" size="sm">
                {METRICS[key].label}
              </Text>
            </button>
          ))}
        </div>
      </div>
      <div className="p-2 sm:p-6">
        <Chart
          echarts={echarts}
          options={options}
          height={280}
          isDarkMode={isDarkMode}
        />
      </div>
    </Surface>
  );
}
```

- [ ] **Step 2: 确认用到的 Kumo 类名存在**

```bash
grep -o "border-kumo-hairline\|bg-kumo-raised" node_modules/@cloudflare/kumo/dist/styles/kumo-standalone.css | sort -u
```

两者都应出现。缺哪个就从 Task 5 Step 2 的类名清单里换一个。

- [ ] **Step 3: 类型检查**

```bash
npx tsc --noEmit
```

预期：通过。若 `Chart` 的 `options` 类型 `KumoChartOption` 拒绝上面的对象，按 Task 2 导出的 `Chart` 文档调整（可能需要 `satisfies KumoChartOption` 或补类型断言）。

- [ ] **Step 4: 提交**

```bash
git add sections/overview-kumo/bar-graph.tsx
git commit -m "feat(kumo): 迁移 bar-graph 到 Kumo Chart + echarts 类目轴"
```

**注意：此时图表还没接到页面上（Task 8 才接），暂时无法在浏览器验证。这是有意的——先让类型和构建先过。**

---

## Task 7: analytics-content（三小图 + 排行表）

**Files:**

- Create: `sections/overview-kumo/analytics-content.tsx`
- Reference: `sections/overview/analytics-content.tsx`（原实现，勿改）

- [ ] **Step 1: 写组件**

创建 `sections/overview-kumo/analytics-content.tsx`：

```tsx
'use client';

import * as React from 'react';
import { getUnixTime } from 'date-fns';
import * as echarts from 'echarts/core';
import { BarChart } from 'echarts/charts';
import { GridComponent, TooltipComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { useTheme } from 'next-themes';
import { Chart } from '@cloudflare/kumo/components/chart';
import { Surface, Table, Text, Meter, SkeletonLine } from '@cloudflare/kumo';
import request from '@/app/lib/clientFetch';
import { GraphData, GraphResult, ModelStat } from '@/lib/types/dashboard';
import { renderQuota } from '@/utils/render';

echarts.use([BarChart, GridComponent, TooltipComponent, CanvasRenderer]);

interface AnalyticsContentProps {
  session: any;
  modelStats: ModelStat[];
}

const METRICS: Record<string, { label: string; unit: string }> = {
  quota: { label: 'Consumption', unit: '$' },
  token: { label: 'Tokens', unit: '' },
  count: { label: 'Times', unit: '' }
};

function getQuotaPerUnit(): number {
  return parseFloat(
    (typeof window !== 'undefined' &&
      localStorage?.getItem('quota_per_unit')) ||
      '500000'
  );
}

function formatTotal(key: string, total: number): string {
  if (key === 'quota') return '$' + total.toFixed(2);
  if (total >= 1000000) return (total / 1000000).toFixed(1) + 'M';
  if (total >= 10000) return (total / 1000).toFixed(1) + 'k';
  return total.toLocaleString();
}

export function AnalyticsContent({
  session,
  modelStats
}: AnalyticsContentProps) {
  const userRole = session?.user?.role;
  const isAdmin = [10, 100].includes(Number(userRole));
  const { resolvedTheme } = useTheme();
  const isDarkMode = resolvedTheme === 'dark';

  const [chartsData, setChartsData] = React.useState<
    Record<string, GraphData[]>
  >({ quota: [], token: [], count: [] });
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchAllCharts = async () => {
      setLoading(true);
      const graphApi = isAdmin
        ? '/api/dashboard/graph'
        : '/api/dashboard/graph/self';
      const timestamp = String(Math.trunc(getUnixTime(new Date())));
      const quotaPerUnit = getQuotaPerUnit();

      const results: Record<string, GraphData[]> = {
        quota: [],
        token: [],
        count: []
      };

      await Promise.all(
        ['quota', 'token', 'count'].map(async (target) => {
          const params = new URLSearchParams({ time: timestamp, target });
          const res: GraphResult = await request.get(`${graphApi}?${params}`);
          if (res?.data && Array.isArray(res.data)) {
            results[target] =
              target === 'quota'
                ? res.data.map((item) => ({
                    ...item,
                    amount: parseFloat((item.amount / quotaPerUnit).toFixed(3))
                  }))
                : res.data;
          }
        })
      );

      setChartsData(results);
      setLoading(false);
    };

    fetchAllCharts();
  }, [isAdmin]);

  const totals = React.useMemo(() => {
    const result: Record<string, number> = {};
    for (const key of ['quota', 'token', 'count']) {
      result[key] =
        chartsData[key]?.reduce((sum, item) => sum + item.amount, 0) || 0;
    }
    return result;
  }, [chartsData]);

  const totalModelQuota = React.useMemo(
    () => modelStats?.reduce((sum, stat) => sum + stat.quota_sum, 0) || 0,
    [modelStats]
  );

  const buildOptions = (key: string) => ({
    grid: { left: 8, right: 8, top: 8, bottom: 24 },
    xAxis: {
      type: 'category' as const,
      data: chartsData[key]?.map((d) => d.hour) ?? [],
      axisTick: { show: false },
      axisLine: { show: false },
      axisLabel: { fontSize: 10 }
    },
    yAxis: { type: 'value' as const, show: false },
    tooltip: {
      trigger: 'axis' as const,
      formatter: (params: any) => {
        const p = Array.isArray(params) ? params[0] : params;
        return `${p.axisValue}:00<br/>${METRICS[key].label}: ${p.data}`;
      }
    },
    series: [
      {
        type: 'bar' as const,
        data: chartsData[key]?.map((d) => d.amount) ?? [],
        itemStyle: { borderRadius: [2, 2, 0, 0] }
      }
    ]
  });

  return (
    <div className="space-y-4">
      {/* 三图并排 */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {(['quota', 'token', 'count'] as const).map((key) => (
          <Surface key={key} className="rounded-lg p-4">
            <Text variant="secondary" size="sm">
              {METRICS[key].label}
            </Text>
            {loading ? (
              <SkeletonLine className="mt-1 h-7 w-24" />
            ) : (
              <Text variant="heading3" as="p">
                {formatTotal(key, totals[key])}
              </Text>
            )}
            <div className="mt-2">
              {loading ? (
                <SkeletonLine className="h-[160px] w-full" />
              ) : (
                <Chart
                  echarts={echarts}
                  options={buildOptions(key)}
                  height={160}
                  isDarkMode={isDarkMode}
                />
              )}
            </div>
          </Surface>
        ))}
      </div>

      {/* 模型消耗排行 */}
      <Surface className="rounded-lg p-4">
        <Text variant="secondary" size="sm">
          Model Consumption Ranking
        </Text>
        <div className="mt-3">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <SkeletonLine key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : !modelStats?.length ? (
            <Text variant="secondary">No model data today</Text>
          ) : (
            <Table>
              <Table.Header>
                <Table.Row>
                  <Table.Head>#</Table.Head>
                  <Table.Head>Model</Table.Head>
                  <Table.Head>Consumption</Table.Head>
                  <Table.Head>Share</Table.Head>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {modelStats.map((stat, index) => {
                  const percentage =
                    totalModelQuota > 0
                      ? (stat.quota_sum / totalModelQuota) * 100
                      : 0;
                  return (
                    <Table.Row key={stat.model_name}>
                      <Table.Cell>{index + 1}</Table.Cell>
                      <Table.Cell>
                        <Text variant="mono" truncate>
                          {stat.model_name}
                        </Text>
                      </Table.Cell>
                      <Table.Cell>{renderQuota(stat.quota_sum)}</Table.Cell>
                      <Table.Cell>
                        <Meter
                          value={Math.min(percentage, 100)}
                          max={100}
                          showValue
                        />
                      </Table.Cell>
                    </Table.Row>
                  );
                })}
              </Table.Body>
            </Table>
          )}
        </div>
      </Surface>
    </div>
  );
}
```

与原实现的一处简化：原表格用 `hidden sm:table-cell` / `sm:hidden` 两列分别处理桌面进度条与手机纯百分比。Kumo 的 `Meter` 自带 `showValue`，合并为一列，移动端由 `Meter` 自身处理。**这是有意的简化，需在浏览器窄屏下验证观感。**

- [ ] **Step 2: 类型检查**

```bash
npx tsc --noEmit
```

预期：通过。三处可能报错，按 Task 2 导出的文档修正：

- `SkeletonLine` 若不接受 `className`，改用外层 div 控制尺寸
- `Meter` 若 `showValue` 名称不同，按文档改
- `Table.Head` / `Table.Cell` 若不支持某些用法，按文档改

- [ ] **Step 3: 提交**

```bash
git add sections/overview-kumo/analytics-content.tsx
git commit -m "feat(kumo): 迁移 analytics-content 到 Kumo Surface/Table/Meter/Chart"
```

---

## Task 8: overview 主视图（卡片 + Tabs 手动内容切换）

**Files:**

- Modify: `sections/overview-kumo/view/overview.tsx`（替换 Task 4 的占位内容）
- Reference: `sections/overview/view/overview.tsx`（原实现，勿改）

**关键差异：Kumo 的 `Tabs` 没有 `TabsContent`**——它只渲染标签栏，内容切换要自己用 state 做条件渲染。

- [ ] **Step 1: 全量替换 view**

覆写 `sections/overview-kumo/view/overview.tsx`：

```tsx
'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { Wallet, Lightning, CalendarDots } from '@phosphor-icons/react';
import { Surface, Text, Tabs, Meter, SkeletonLine } from '@cloudflare/kumo';
import { BarGraph } from '../bar-graph';
import { AnalyticsContent } from '../analytics-content';
import { RecentSales } from '../recent-sales';
import PageContainer from '@/components/layout/page-container';
import { renderQuota } from '@/utils/render';
import request from '@/app/lib/clientFetch';
import { Dashboard, DashboardResult } from '@/lib/types/dashboard';
import { useLocale } from '@/components/providers/locale-provider';

const isAdmin = (role: unknown) => [10, 100].includes(Number(role));

export default function OverViewKumoPage() {
  const { data: session, status } = useSession();
  const { t } = useLocale();
  const userRole = session?.user?.role;
  const userName = session?.user?.name || session?.user?.username || '';

  const [activeTab, setActiveTab] = useState('overview');
  const [dashboardData, setDashboardData] = useState<Dashboard>({
    current_quota: 0,
    used_quota: 0,
    tpm: 0,
    rpm: 0,
    quota_pm: 0,
    request_pd: 0,
    used_pd: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status !== 'authenticated') return;

    const fetchDashboard = async () => {
      try {
        setLoading(true);
        const userApi = isAdmin(userRole)
          ? '/api/dashboard'
          : '/api/dashboard/self';
        const res: DashboardResult = await request.get(userApi);
        if (res?.success && res?.data) {
          setDashboardData(res.data);
        }
      } catch (error) {
        console.error('Dashboard data fetch failed:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, [userRole, status]);

  const current = dashboardData.current_quota || 0;
  const used = dashboardData.used_quota || 0;
  const total = current + used;
  const usedRatio = total > 0 ? Math.round((used / total) * 100) : 0;
  const lowBalance = total > 0 && usedRatio >= 80;

  return (
    <PageContainer scrollable>
      <div className="space-y-4">
        <Text variant="heading1" as="h2">
          {t.dashboard.welcome}
          {userName ? `, ${userName}` : ''} 👋 <Text
            variant="secondary"
            as="span"
          >
            {t.dashboard.welcomeBack}
          </Text>
        </Text>

        <Tabs
          variant="underline"
          tabs={[
            { value: 'overview', label: t.dashboard.tabs.overview },
            { value: 'analytics', label: t.dashboard.tabs.analytics }
          ]}
          selectedValue={activeTab}
          onValueChange={setActiveTab}
        />

        {/* Kumo 的 Tabs 不含 TabsContent，内容切换在此手动处理 */}
        {activeTab === 'overview' && (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {/* 余额卡 */}
              <Surface className="rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <Text variant="secondary" size="sm">
                    {t.dashboard.cards.balance.title}
                  </Text>
                  <Wallet size={16} />
                </div>
                {loading ? (
                  <div className="mt-3 space-y-3">
                    <SkeletonLine className="h-9 w-32" />
                    <SkeletonLine className="h-3 w-40" />
                  </div>
                ) : (
                  <>
                    <Text
                      variant={lowBalance ? 'error' : 'body'}
                      className="mt-1 block text-3xl font-semibold tabular-nums"
                      as="div"
                    >
                      {renderQuota(current)}
                    </Text>
                    <Text variant="secondary" size="sm">
                      {t.dashboard.cards.balance.used} {renderQuota(used)}
                      {total > 0
                        ? ` · ${usedRatio}% ${t.dashboard.cards.balance.usedRatio}`
                        : ''}
                    </Text>
                    {total > 0 && (
                      <div className="mt-3">
                        <Meter value={Math.min(usedRatio, 100)} max={100} />
                      </div>
                    )}
                  </>
                )}
              </Surface>

              {/* 吞吐卡 */}
              <Surface className="rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <Text variant="secondary" size="sm">
                    {t.dashboard.cards.throughput.title}
                  </Text>
                  <Lightning size={16} />
                </div>
                {loading ? (
                  <div className="mt-3 space-y-3">
                    <SkeletonLine className="h-9 w-24" />
                    <SkeletonLine className="h-3 w-40" />
                  </div>
                ) : (
                  <>
                    <Text
                      className="mt-1 block text-3xl font-semibold tabular-nums"
                      as="div"
                    >
                      {(dashboardData.tpm || 0).toLocaleString()}
                    </Text>
                    <Text variant="secondary" size="sm">
                      {t.dashboard.cards.throughput.tpm}
                    </Text>
                    <div className="mt-3 flex items-center gap-4">
                      <Text variant="secondary" size="sm">
                        {t.dashboard.cards.throughput.rpm}{' '}
                        {(dashboardData.rpm || 0).toLocaleString()}
                      </Text>
                      <Text variant="secondary" size="sm">
                        {t.dashboard.cards.throughput.qpm}{' '}
                        {renderQuota(dashboardData.quota_pm || 0)}
                      </Text>
                    </div>
                  </>
                )}
              </Surface>

              {/* 今日用量卡 */}
              <Surface className="rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <Text variant="secondary" size="sm">
                    {t.dashboard.cards.today.title}
                  </Text>
                  <CalendarDots size={16} />
                </div>
                {loading ? (
                  <div className="mt-3 space-y-3">
                    <SkeletonLine className="h-9 w-24" />
                    <SkeletonLine className="h-3 w-40" />
                  </div>
                ) : (
                  <>
                    <Text
                      className="mt-1 block text-3xl font-semibold tabular-nums"
                      as="div"
                    >
                      {(dashboardData.request_pd || 0).toLocaleString()}
                    </Text>
                    <Text variant="secondary" size="sm">
                      {t.dashboard.cards.today.requests}
                    </Text>
                    <Text variant="secondary" size="sm" as="div">
                      {t.dashboard.cards.today.spend}{' '}
                      {renderQuota(dashboardData.used_pd || 0)}
                    </Text>
                  </>
                )}
              </Surface>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-7">
              <div className="lg:col-span-4">
                <BarGraph session={session} />
              </div>
              <Surface className="rounded-lg p-4 lg:col-span-3">
                <Text variant="heading3" as="h3">
                  {t.dashboard.popularModels.title}
                </Text>
                <Text variant="secondary" size="sm">
                  {t.dashboard.popularModels.description.replace(
                    '{count}',
                    String(dashboardData.model_stats?.length || 0)
                  )}
                </Text>
                <div className="mt-4">
                  {loading ? (
                    <div className="space-y-4">
                      {[1, 2, 3].map((i) => (
                        <SkeletonLine key={i} className="h-9 w-full" />
                      ))}
                    </div>
                  ) : (
                    <RecentSales dataList={dashboardData.model_stats || []} />
                  )}
                </div>
              </Surface>
            </div>
          </div>
        )}

        {activeTab === 'analytics' && (
          <AnalyticsContent
            session={session}
            modelStats={dashboardData.model_stats || []}
          />
        )}
      </div>
    </PageContainer>
  );
}
```

- [ ] **Step 2: 类型检查**

```bash
npx tsc --noEmit
```

预期：通过。两处高风险点：

- `Text` 是否接受 `className`（上面多处用它加 `text-3xl` 与 `tabular-nums`）。若不接受，改为外层 `<div className="...">` 包裹
- `Tabs` 的 `onValueChange` 签名是否为 `(value: string) => void`。若签名不同，按 Task 2 文档调整

- [ ] **Step 3: 确认 Phosphor 图标名正确**

若 Step 2 报 `CalendarDots` 不存在，用 Task 2 Step 4 确认过的名称替换。

- [ ] **Step 4: 构建**

```bash
pnpm build
```

预期：成功。

- [ ] **Step 5: 提交**

```bash
git add sections/overview-kumo/view/overview.tsx
git commit -m "feat(kumo): 迁移 overview 主视图，手动实现 Tabs 内容切换"
```

---

## Task 9: 浏览器实测与结论

本任务是试点的**真正产出**。前面所有代码都只是为了得到这里的答案。

**Files:**

- Delete: `app/dashboard/kumo-smoke/`（Task 1 的临时冒烟页）
- Create: `docs/superpowers/specs/2026-08-03-kumo-pilot-findings.md`

- [ ] **Step 1: 删除临时冒烟页**

```bash
git rm -r app/dashboard/kumo-smoke/
```

- [ ] **Step 2: 起服务，两个标签页并排打开**

```bash
pnpm dev
```

- `http://localhost:3001/dashboard`（原版）
- `http://localhost:3001/dashboard/overview-kumo`（Kumo 版）

- [ ] **Step 3: 逐项核对验收标准**

对照规格中的验收标准，逐条记录通过与否：

- [ ] 3 个统计卡数值与原页面完全一致（余额、吞吐、今日用量）
- [ ] 热门模型卡列表内容与原页面一致
- [ ] overview / analytics 两个 tab 均可切换且内容正确
- [ ] 图表渲染正常、tooltip 可交互、数值与原图一致
- [ ] 明暗两种模式均正常，且跟随 next-themes 切换
- [ ] 继承的侧边栏未破损
- [ ] 窄屏（≤640px）下排行表的 `Meter` 合并列观感可接受
- [ ] `pnpm build` 通过

- [ ] **Step 4: 写结论文档**

创建 `docs/superpowers/specs/2026-08-03-kumo-pilot-findings.md`，必须回答：

1. **风险 1（ESM/Next 14）**：是否需要 `transpilePackages`？有无其他兼容问题？
2. **风险 2（preflight 冲突）**：standalone CSS 的 v4 preflight 对继承的侧边栏、`PageContainer` 造成了什么实际影响？是否可接受？
3. **风险 3（Chart 类目轴）**：`Chart` + 类目轴是否覆盖了需求？tooltip 的 `${hour}:00` 格式是否还原？
4. **风险 4（`light-dark()`）**：明暗切换是否正常？
5. **API 偏差清单**：Task 2 查证后，实际 props 与本计划的假设差了哪些？（这是外推全量工作量的关键依据）
6. **实际耗时** vs 预估
7. **外推**：dashboard 全量迁移的代价估算
8. **建议**：是否推进 Tailwind v4 全面升级？若推进，`Avatar`/`Separator`/`ScrollArea` 三个缺失组件怎么补？

- [ ] **Step 5: 提交**

```bash
git add -A docs/superpowers/specs/2026-08-03-kumo-pilot-findings.md
git commit -m "docs: Kumo 试点结论与全量迁移建议

删除临时冒烟页，记录四项风险的实测结果与 API 偏差清单。"
```

---

## 计划自查记录

**规格覆盖：**

| 规格要求                                   | 对应任务              |
| ------------------------------------------ | --------------------- |
| 装 3 个依赖                                | Task 1                |
| 验证 ESM/`transpilePackages`（风险 1）     | Task 1                |
| 删除 area-graph / pie-graph 死代码         | Task 3                |
| 平行路由 + standalone CSS 隔离             | Task 4                |
| next-themes → `data-mode` 桥接             | Task 4                |
| `recent-sales` 迁移 + 修正占位图与重复标题 | Task 5                |
| `bar-graph` → `Chart` 类目轴               | Task 6                |
| `analytics-content` 迁移                   | Task 7                |
| `overview` 主视图 + 4 个卡片               | Task 8                |
| `Tabs` 无 `TabsContent` 的处理             | Task 8                |
| preflight 冲突观测（风险 2）               | Task 1 Step 6、Task 9 |
| `light-dark()` 验证（风险 4）              | Task 4 Step 5、Task 9 |
| 验收标准逐条核对                           | Task 9                |
| 结论文档 4 项交付物                        | Task 9 Step 4         |

**未覆盖的规格内容：** 「遗留决策」一节（Tailwind v4 全面升级、zod 升级、剩余 67 个图标文件、缺失组件自建、Sidebar 替换）按设计明确留到全量迁移阶段，本计划不含。

**已知的不确定点及其处置：** 本计划对 `SkeletonLine`、`Meter`、`Tabs`、`Text`、`ChartPalette` 的部分 props 与 Phosphor 图标名无法在写计划阶段完全确认（Kumo 文档未公开发布，只能靠包内 registry）。处置方式是 **Task 2 用 `npx @cloudflare/kumo doc` 先查证**，并在各任务的类型检查步骤中列出最可能出错的具体位置与修正方向。执行者不应凭猜写 props。
