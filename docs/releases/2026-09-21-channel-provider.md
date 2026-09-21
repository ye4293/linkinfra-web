# 渠道 Provider

渠道表单增加可选 Provider 输入框，例如 `openai` 或 `azure`。新建、编辑与批量创建时通过现有 config JSON 保存，编辑时回显；清空后删除该配置项。

需配合后端 Provider 重试功能使用：首次渠道有 Provider 时，失败只重试相同 Provider 的渠道。留空保留原有行为。本次不增加会话绑定，不改变下一轮请求的首次选渠，不修改 thinking 或 compaction。

验证：`tsc --noEmit --incremental false` 通过。未部署或修改线上渠道。
