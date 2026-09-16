# API 文档维护

## 入口与结构

- `/docs` 默认跳转到 `/docs/api/chat-completions`，所有文档均可匿名访问。
- 首页、模型广场和控制台的文档入口固定指向站内 `/docs`；不再读取或编辑外部 DocsAddress 配置。
- `app/docs/[[...slug]]/page.tsx` 负责路由、页面元数据和 404。
- `lib/api-docs/catalog.ts` 维护接口目录、中英文说明、字段、请求体和响应示例。
- `lib/api-docs/examples.ts` 生成 cURL、Python、JavaScript、Go 示例以及 Markdown。
- `components/docs/docs-page.tsx` 和 `docs.module.css` 实现页面、导航、搜索和响应式样式。

## 增加接口

1. 先核对关联 Go 项目的 `router/relay-router.go`、鉴权中间件和对应控制器。不要把未实现路由写成可用接口。
2. 在 `apiDocs` 中添加条目，填写唯一 `slug`、分组、HTTP 方法和路径。
3. 补齐中英文说明、字段类型、必填标记及嵌套字段，提供可解析的请求体与示例响应。
4. 文件上传接口设置 `multipart: true`；直接返回音频文件的接口设置 `binary: true`。
5. 新条目自动出现在目录、搜索和翻页导航中。模型 ID 为示例，需说明实际可用性取决于平台配置。
6. 运行 `pnpm test:docs` 和 `pnpm build`，用浏览器检查新页面。

## API 地址与密钥

文档页品牌固定显示为 `Linkinfra API`，接口根地址固定为 `https://api.linkinfra.ai`。所有语言的代码示例、复制内容和接入指南都使用此地址，OpenAI SDK Base URL 为 `https://api.linkinfra.ai/v1`。

代码示例从 `LINKINFRA_API_KEY` 环境变量读取密钥。页面不会读取用户真实 API Key，也不会自动发送模型请求。

## 已完成验证

- 26 项文档测试通过，包含实际向本地测试服务器发送 cURL JSON 和 multipart 请求，以及 JavaScript 请求生成、音频保存、错误传播与地址规范化。
- 10 个 Go 示例编译通过，10 个 Python 示例通过语法与 JSON 内容检查。
- 现有首页 7 项回归测试通过，新增代码通过 TypeScript 与 ESLint 检查。
- 13 个公开文档路径均返回 200，根入口重定向正常，无效路径返回 404。
- 浏览器验证了中文和英文、深浅主题、快捷键搜索、空搜索结果、回车导航、复制、参数展开、锚点和移动端抽屉。
- 320、390、768、1024、1440px 视口未出现页面横向溢出。

验证未调用实际收费模型。模型可用性和上游响应差异需要在配置真实渠道后确认。
