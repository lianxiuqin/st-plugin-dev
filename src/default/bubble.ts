// agent_plugin_dev/ui-chat-plugin/src/default/bubble.ts —— 默认气泡渲染器(AI 左/用户右,文本气泡)
import type { ChatMessage } from '../registry.ts'

export function renderDefaultBubble(el: HTMLElement, msg: ChatMessage): void {
  el.className = 'uchat-bubble'
  el.dataset.role = msg.role
  el.textContent = msg.content
}
