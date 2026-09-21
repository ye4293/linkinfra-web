# 渠道 Provider

渠道表单增加可选 Provider 输入框，例如 `openai` 或 `azure`。新建、编辑与批量创建时通过现有 config JSON 保存，编辑时回显；清空后删除该配置项。

需配合后端 Provider 功能使用：首次渠道有 Provider 时，失败只重试相同 Provider 的渠道。Responses 携带 thinking/compaction 时，后续请求首次选渠也绑定原 Provider；留空时带状态历史固定原渠道/key。纯明文请求仍按原规则首次选渠，不修改 thinking 或 compaction。

会话绑定依据后台记录的状态来源，不需额外配置会话 ID。未知历史来源会明确报错；详情见后端 `docs/channel-provider.md`。

验证：`tsc --noEmit --incremental false` 通过。未部署或修改线上渠道。
