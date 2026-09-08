// agent_plugin_dev/chat-stream-plugin/tests/routes.spec.ts
import { describe, it, expect, vi } from 'vitest'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { registerRoutes } from '../src/routes.ts'

function capture(streamer: { stream(text: string, opts?: { signal?: AbortSignal }): AsyncIterable<string> }, streamEnabled = true) {
  const handlers = new Map<string, (req: IncomingMessage, res: ServerResponse) => void | Promise<void>>()
  const dispose = registerRoutes((o) => { handlers.set(o.path, o.handler); return () => handlers.delete(o.path) }, { streamer, streamEnabled })
  const call = async (path: string, body?: unknown) => {
    const h = handlers.get('/api/chat-stream/')!
    const req = {
      url: path, method: 'POST',
      on(type: string, cb: (c?: unknown) => void) {
        if (type === 'data') cb(Buffer.from(body === undefined ? '' : JSON.stringify(body)))
        if (type === 'end') cb()
      },
    } as unknown as IncomingMessage
    let status = 0
    const chunks: string[] = []
    const res = {
      writeHead(s: number) { status = s },
      write(c: string) { chunks.push(c) },
      end(c?: string) { if (c) chunks.push(c) },
    } as unknown as ServerResponse
    await h(req, res)
    return { status, text: chunks.join('') }
  }
  return { call, dispose }
}

describe('chat-stream routes', () => {
  it('POST send:delta 逐块 SSE + done 收尾', async () => {
    const c = capture({ stream: vi.fn(async function* () { yield '你'; yield '好' }) })
    const r = await c.call('/api/chat-stream/send', { text: 'hi' })
    expect(r.status).toBe(200)
    expect(r.text).toContain('data: {"t":"delta","d":"你"}')
    expect(r.text).toContain('data: {"t":"delta","d":"好"}')
    expect(r.text).toContain('data: {"t":"done"}')
    c.dispose()
  })
  it('stream 抛错 → error 事件', async () => {
    const c = capture({ stream: vi.fn(async function* () { throw new Error('请求超时') }) })
    const r = await c.call('/api/chat-stream/send', { text: 'hi' })
    expect(r.text).toContain('data: {"t":"error","message":"请求超时"}')
    c.dispose()
  })
  it('非 send 路径 → 404 JSON', async () => {
    const c = capture({ stream: vi.fn(async function* () {}) })
    const r = await c.call('/api/chat-stream/other', {})
    expect(r.status).toBe(404)
    expect(r.text).toContain('接口不存在')
    c.dispose()
  })
  it('streamEnabled=false → 409 stream_disabled,不调用 streamer', async () => {
    const s = vi.fn(async function* () { yield 'x' })
    const c = capture({ stream: s }, false)
    const r = await c.call('/api/chat-stream/send', { text: 'hi' })
    expect(r.status).toBe(409)
    expect(r.text).toContain('stream_disabled')
    expect(s).not.toHaveBeenCalled()
    c.dispose()
  })
})
