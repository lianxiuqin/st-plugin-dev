// agent_plugin_dev/ui-chat-plugin/src/boot.ts —— window.__uiChat__ 桥 + main 插槽挂载
import { ChatRegistry } from './registry.ts'
import * as api from './ui/api.ts'
import { createChatPage } from './default/page.ts'
import type { PanelDeps, PanelHandle } from './assemble.ts'

export function mountChatPlugin(): { dispose(): void } {
  const reg = new ChatRegistry()
  const uiChat = {
    registerPage: (o: Parameters<ChatRegistry['registerPage']>[0]) => reg.registerPage(o),
    registerBubble: (o: Parameters<ChatRegistry['registerBubble']>[0]) => reg.registerBubble(o),
    registerTool: (o: Parameters<ChatRegistry['registerTool']>[0]) => reg.registerTool(o),
    registerRegion: (o: Parameters<ChatRegistry['registerRegion']>[0]) => reg.registerRegion(o),
    unregister: (kind: Parameters<ChatRegistry['unregister']>[0], name: string) => reg.unregister(kind, name),
    subscribe: (fn: () => void) => reg.subscribe(fn),
    setDefault: (kind: 'page' | 'bubble', enabled: boolean) => reg.setDefault(kind, enabled),
    isDefaultEnabled: (kind: 'page' | 'bubble') => reg.isDefaultEnabled(kind),
  }
  ;(window as unknown as { __uiChat__: unknown }).__uiChat__ = uiChat

  const deps: PanelDeps = {
    api,
    getActive: () => api.getActiveSession(),
    getMessages: () => api.listMessages(),
    send: (text) => api.sendText(text),
    onSessionChanged: (reason) => {
      window.dispatchEvent(new CustomEvent('st:session-changed', { detail: { reason } }))
    },
  }

  let handle: PanelHandle | null = null
  let timer: ReturnType<typeof setInterval> | undefined
  const tryMount = (): boolean => {
    const slots = (window as unknown as { __uiSlots__?: { register(slot: string, o: { name: string; render(el: HTMLElement): void }): void } }).__uiSlots__
    if (!slots) return false
    slots.register('main', {
      name: 'chat',
      render(el: HTMLElement) {
        handle?.dispose()
        handle = createChatPage(reg, deps)
        const node = handle.whenReady ?? Promise.resolve(handle.el)
        node.then((n: HTMLElement) => { if (handle && !handle.disposed) el.appendChild(n) })
      },
    })
    return true
  }
  if (!tryMount()) {
    timer = setInterval(() => { if (tryMount()) { clearInterval(timer); timer = undefined } }, 200)
  }
  return {
    dispose() {
      if (timer) { clearInterval(timer); timer = undefined }
      handle?.dispose()
      handle = null
      delete (window as unknown as { __uiChat__?: unknown }).__uiChat__
    },
  }
}
