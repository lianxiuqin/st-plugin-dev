// agent_plugin_dev/ui-chat-plugin/src/default/page.ts —— 页面入口:v1 始终默认面板;Task 7 升级为消费 pickPage
import type { ChatRegistry } from '../registry.ts'
import { injectChatStyle } from './style.ts'
import { createDefaultPanel, type PanelDeps, type PanelHandle } from '../assemble.ts'

export function createChatPage(reg: ChatRegistry, deps: PanelDeps): PanelHandle {
  injectChatStyle()
  return createDefaultPanel(reg, deps)
}
