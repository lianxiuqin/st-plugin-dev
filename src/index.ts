// agent_plugin_dev/ui-chat-thinking-plugin/src/index.ts —— 空后端:仅 bundle 声明,渲染在前端注入
import type { Context } from 'cordis'

export const name = 'ui-chat-thinking-plugin'

export function apply(_ctx: Context): void { /* 无后端逻辑 */ }

apply.inject = [] as string[]
apply.provide = [] as string[]

export default apply
