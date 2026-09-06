// agent_plugin_dev/ui-chat-plugin/src/default/page.ts —— 页面入口:第三方 page(priority 最高)优先;渲染失败回退默认面板
import type { ChatRegistry } from '../registry.ts'
import { injectChatStyle } from './style.ts'
import { createDefaultPanel, type PanelDeps, type PanelHandle } from '../assemble.ts'

function isElement(v: unknown): v is HTMLElement {
  return typeof HTMLElement !== 'undefined' && v instanceof HTMLElement
}

export function createChatPage(reg: ChatRegistry, deps: PanelDeps): PanelHandle {
  injectChatStyle()
  const picked = reg.pickPage()
  if (!picked) return createDefaultPanel(reg, deps)
  try {
    const out = picked.render({ active: null, reload() { void deps.getActive().then(() => {}) } })
    if (isElement(out)) {
      return {
        el: out,
        reload: () => deps.getActive().then(() => {}),
        dispose() { picked.unmount?.() },
      }
    }
    // 异步 page:el 暂为占位,whenReady 就绪后由 boot 层替换 append
    const ready = Promise.resolve(out)
    const handle: PanelHandle = {
      el: document.createElement('div'),
      reload: () => deps.getActive().then(() => {}),
      dispose() { picked.unmount?.(); handle.disposed = true },
      whenReady: ready,
    }
    return handle
  } catch (e) {
    console.error(`[ui-chat] page ${picked.name} 渲染失败,回退默认页`, e)
    return createDefaultPanel(reg, deps)
  }
}
