# TypeSafe 渠道

配合后端 TypeSafe 原生渠道（类型 50）使用。渠道下拉菜单读取后端 `/api/channel/types`，选择 TypeSafe 时按返回的 `base_url` 自动填入 `https://api.typesafe.ai`，并使用后端默认的三个 Jev 模型和 `jev-latest` 测试模型。地址可修改，留空由后端回退官方地址。

实际调用入口为 `/v1/systemone`。已有自定义渠道配置继续兼容，无数据库迁移。

编辑已有渠道时保留已保存的地址和模型；只有手动选择 TypeSafe 类型时填入默认值。前后端需要同时部署。

验证：TypeScript 类型检查通过；隔离最终源码的 Next.js 生产构建通过，生成 95 个静态页面。保留既有图标未使用和 Browserslist 数据过期警告。
