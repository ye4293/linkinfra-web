# Key 客户端快捷配置

用户要求参考 New API Key 页面，添加 CC Switch、Cherry Studio 等主流客户端配置。沿用当前前端组件实现交互，不复制参考项目代码。

## 实现

- Keys 桌面行和移动卡片增加 Set up client，打开同一个弹窗。
- CC Switch：Claude Code / Codex / Gemini CLI；默认模型必填，可从当前账户模型中搜索，也可手填。Claude 可选填写 Haiku/Sonnet/Opus 映射。按客户端规范选择 root 或 `/v1` 地址。
- Cherry Studio：通过 `cherrystudio://providers/api-keys?v=1&data=...` 导入独立 LinkInfra OpenAI 兼容服务商，不占用 New API 内置服务商。
- Chatbox / 其他 OpenAI 兼容客户端：提供手动配置说明和 Base URL / Key / Model 的复制。
- 只在用户点击打开客户端时生成包含 Key 的链接；不缓存、不记录、不向第三方网页传 Key。客户端安装/协议弹窗由浏览器与操作系统处理，不宣称完成导入。
- 地址必须来自系统配置，不回退到前端页面地址；未配置和失效 Key 有明确提示。模型加载失败仍允许手动填写，不修改后端模型发现接口。

## 参考

- [New API CC Switch 入口](https://github.com/QuantumNous/new-api/blob/bdef117505247769268b209665fb3ad7554c3da7/web/src/features/keys/components/dialogs/cc-switch-dialog.tsx)
- [CC Switch 深链接协议](https://github.com/farion1231/cc-switch/blob/7726c83476f9ae1f8a5b812aa844cd166339aa55/docs/user-manual/zh/5-faq/5.3-deeplink.md)
- [Cherry Studio 导入解析](https://github.com/CherryHQ/cherry-studio/blob/fd91c91ef31469823c494e46e98df3cf0c06294e/src/main/services/protocol/handlers/providersImport.ts)

## 验证

导入链接解码验证（包含 Unicode / 特殊字符 / 路径规范化）、输入校验、TypeScript、定向 lint、浏览器桌面和手机弹窗与复制交互。使用虚构 Key，禁止测试时向实际客户端写入账户配置。

结果：4 项协议回归、定向 lint、TypeScript、隔离目录生产构建均通过。浏览器验证桌面、390px/320px 手机边界及复制、切换、失败重试和失效 Key 拦截，无页面错误。真实客户端导入留给用户在预览里操作确认。
