import { describe, it, expect, vi } from 'vitest'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { registerRoutes } from '../src/routes.ts'
import type { SessionLike } from '../src/session.ts'

function capture() {
  const rows: Array<{ role: 'user' | 'assistant'; content: string }> = []
  const session: SessionLike = {
    getActive: vi.fn(async () => 's_1'),
    getMessages: vi.fn(async () => rows.map((r) => ({ role: r.role, content: r.content }))),
    append: vi.fn(async (role, content) => { rows.push({ role, content }) }),
  }
  const send = vi.fn(async (text: string) => {
    if (!text.trim()) throw new Error('消息内容不能为空')
    if (text === 'boom') throw new Error('请求超时')
    await session.append('user', text)
    await session.append('assistant', '收到:' + text)
    return { reply: '收到:' + text, reasoning: null }
  })
  const handlers = new Map<string, (req: IncomingMessage, res: ServerResponse) => void | Promise<void>>()
  const dispose = registerRoutes((o) => { handlers.set(o.path, o.handler); return () => handlers.delete(o.path) }, { session, send })
  const call = async (path: string, body?: unknown, method = 'GET') => {
    const h = handlers.get('/api/chat/')!
    const req = {
      url: path, method,
      on(type: string, cb: (c?: unknown) => void) {
        if (type === 'data') cb(Buffer.from(body === undefined ? '' : JSON.stringify(body)))
        if (type === 'end') cb()
      },
    } as unknown as IncomingMessage
    let out = ''; let status = 0
    const res = { writeHead(s: number) { status = s }, end(b: string) { out = b } } as unknown as ServerResponse
    await h(req, res)
    return { status, json: JSON.parse(out || '{}') }
  }
  return { rows, send, call, dispose }
}

describe('chat routes v2', () => {
  it('POST /send 成功返回 reply 且 append 到会话;GET /messages 全量升序', async () => {
    const c = capture()
    const r1 = await c.call('/api/chat/send', { text: '你好' }, 'POST')
    expect(r1.status).toBe(200)
    expect(r1.json.data.reply).toBe('收到:你好')
    expect(r1.json.data.reasoning).toBeNull()
    const list = await c.call('/api/chat/messages')
    expect(list.status).toBe(200)
    expect(list.json.data.map((m: { role: string }) => m.role)).toEqual(['user', 'assistant'])
    expect(list.json.data[0].content).toBe('你好')
    expect(c.send).toHaveBeenCalledWith('你好')
    c.dispose()
  })

  it('send 返回带 reasoning 时响应透传', async () => {
    const c = capture()
    c.send.mockResolvedValueOnce({ reply: '答', reasoning: '链' })
    const r = await c.call('/api/chat/send', { text: 'hi' }, 'POST')
    expect(r.json.data).toEqual({ reply: '答', reasoning: '链' })
    c.dispose()
  })

  it('空 text → 400 中文', async () => {
    const c = capture()
    const r = await c.call('/api/chat/send', { text: '  ' }, 'POST')
    expect(r.status).toBe(400)
    expect(r.json.message).toBe('消息内容不能为空')
    c.dispose()
  })

  it('send 抛网络/超时类 → 502', async () => {
    const c = capture()
    const r = await c.call('/api/chat/send', { text: 'boom' }, 'POST')
    expect(r.status).toBe(502)
    expect(r.json.message).toBe('请求超时')
    c.dispose()
  })

  it('未知方法/路径 → 405/404', async () => {
    const c = capture()
    expect((await c.call('/api/chat/messages', undefined, 'POST')).status).toBe(405)
    expect((await c.call('/api/chat/nope')).status).toBe(404)
    c.dispose()
  })
})
