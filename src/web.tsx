// agent_plugin_dev/chat-stream-plugin/src/web.tsx —— 向 ui-chat-plugin 注册 stream transport(默认开启;config.stream=false 不注册)
import { parseSseLine } from './sse.ts'

interface UiChatLike {
  registerTransport(o: {
    name: string; priority?: number
    match(text: string): boolean
    send(text: string, hooks: { onDelta?(d: string): void }): string | Promise<string>
  }): void
  unregister(kind: string, name: string): void
}

function configStreamOn(): boolean {
  const cfg = (window as unknown as { __CLIENT_CONFIG__?: Record<string, { stream?: unknown }> }).__CLIENT_CONFIG__
  const mine = cfg?.['chat-stream-plugin']
  return mine ? mine.stream !== false : true // 未配置 → 默认开
}

async function sendWhole(text: string): Promise<string> {
  const res = await fetch('/api/chat/send', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ text }),
  })
  let body: { ok?: boolean; message?: string; data?: { reply?: string } } | null = null
  try { body = (await res.json()) as { ok?: boolean; message?: string; data?: { reply?: string } } } catch { /* 非 JSON */ }
  if (!res.ok || !body?.ok) throw new Error(body?.message || `HTTP ${res.status}`)
  return (body.data?.reply ?? '')
}

async function sendStreamText(text: string, hooks: { onDelta?(d: string): void }): Promise<string> {
  const res = await fetch('/api/chat-stream/send', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ text }),
  })
  if (!res.ok || !res.body) {
    let body: { code?: string; message?: string } | null = null
    try { body = (await res.json()) as { code?: string; message?: string } } catch { /* 非 JSON */ }
    // 流式被关闭(后端 stream:false)或后端无此路由(旧版/未生效):回退整回,不报 404
    if (body?.code === 'stream_disabled' || res.status === 404) return sendWhole(text)
    throw new Error(body?.message || `HTTP ${res.status}`)
  }
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buf = ''
  let reply = ''
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    buf += decoder.decode(value, { stream: true })
    let idx: number
    while ((idx = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, idx)
      buf = buf.slice(idx + 1)
      const ev = parseSseLine(line)
      if (!ev) continue
      if (ev.t === 'delta' && ev.d) { reply += ev.d; hooks.onDelta?.(ev.d) }
      else if (ev.t === 'error') throw new Error(ev.message ?? '流式请求失败')
      else if (ev.t === 'done') return reply
    }
  }
  return reply
}

let registered = false

const webPlugin = {
  name: 'chat-stream-plugin',
  mount() {
    if (!configStreamOn() || registered) return
    const tryReg = (): boolean => {
      const chat = (window as unknown as { __uiChat__?: UiChatLike }).__uiChat__
      if (!chat) return false
      chat.registerTransport({
        name: 'chat-stream', priority: 10,
        match: () => true,
        send: (text: string, hooks: { onDelta?(d: string): void }) => sendStreamText(text, hooks),
      })
      registered = true
      return true
    }
    if (!tryReg()) {
      const timer = setInterval(() => { if (tryReg()) clearInterval(timer) }, 200)
      setTimeout(() => clearInterval(timer), 60000) // 兜底 60s 不再重试
    }
  },
  unmount() {
    if (!registered) return
    ;(window as unknown as { __uiChat__?: UiChatLike }).__uiChat__?.unregister('transport', 'chat-stream')
    registered = false
  },
}

export default webPlugin
