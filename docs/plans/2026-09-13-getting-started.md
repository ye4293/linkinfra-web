# 第三批 U7–U11

按用户意见：参考 New API 的分步接入引导，实现 LinkInfra 新手指引；Docs 使用后端 docs_address；等级介绍后置并隐藏公开等级展示；计费明确区分按 Token / 按次；修复进入模型广场的滚动位置。

方案：新增 `/getting-started`，覆盖充值、建 Key、配置客户端、首条调用、查看用量及排错；控制台和 Keys 提供入口。参考 New API overview-dashboard 的分步与可收起设计，独立实现，不复制源代码、不声称点击步骤就已完成接入。Docs 优先使用后端 URL，未配置时回退指引，不落入模型广场。公开等级选择/对比通过统一开关暂时隐藏，保留后台分组配置和现有默认展示价格，不变更计费。模型广场进入时回到顶部。

验证：浏览器检查指南、Docs 配置与缺省、等级隐藏、计费筛选、从首页中部进入广场回到顶部、桌面/手机布局；TypeScript、定向 lint、隔离生产构建。仅处理本批，不推进 U12–U14。

参考：https://github.com/QuantumNous/new-api/blob/bdef117505247769268b209665fb3ad7554c3da7/web/src/features/dashboard/components/overview/overview-dashboard.tsx

验证完成：TypeScript 和隔离生产构建通过，定向 lint 无错误（已有 console/未使用变量警告）。浏览器验证公开配置 Docs 与缺省指引、五步链接、等级隐藏、计费筛选/中文标签、首页中部到广场滚动复位及 1440px/390px/320px 布局，无页面错误。仅用模拟公开配置与目录数据，无业务写入。本批未提交/推送，预览继续使用 3001。
