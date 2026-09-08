// agent_plugin_dev/chat-plugin/src/routes.ts —— /api/chat/* HTTP 路由(v2:经 session 适配层)
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { SessionLike } from './session.ts'

type Handler = (req: IncomingMessage, res: ServerResponse) => void | Promise<void>
type Register = (o: { kind: 'exact' | 'prefix'; path: string; handler: Handler }) => () => void

const PREFIX = '/api/chat/'

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve) => {
    let raw = ''
    req.on('data', (c: Buffer | string) => { raw += c })
    req.on('end', () => resolve(raw))
  })
}
function ok(res: ServerResponse, data: unknown): void {
  res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' })
  res.end(JSON.stringify({ ok: true, data }))
}
function fail(res: ServerResponse, status: number, message: string): void {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' })
  res.end(JSON.stringify({ ok: false, message }))
}
function errStatus(e: unknown): number {
  const msg = (e as Error)?.message ?? ''
  if (/不能为空/.test(msg)) return 400
  if (/未选择使用表单|缺少动态注入条目|请先在右侧新建或选择会话/.test(msg)) return 409
  if (/请求失败|请求超时|无法解析模型回复/.test(msg)) return 502
  return 500
}
function parseBody<T>(req: IncomingMessage): Promise<T> {
  return readBody(req).then((raw) => JSON.parse(raw || '{}') as T)
}
function notAllowed(res: ServerResponse): void {
  fail(res, 405, '不支持的方法')
}

/**
 * 路由:
 *   GET  /api/chat/messages   当前会话全量消息(id 升序)
 *   POST /api/chat/send       发送一轮({text});失败整轮回滚,错误映射 400/409/502/500
 */
export function registerRoutes(register: Register, dep: { session: SessionLike; send: (text: string) => Promise<{ reply: string; reasoning: string | null }> }): () => void {
  const disposers: Array<() => void> = []
  const { session, send } = dep

  disposers.push(register({
    kind: 'prefix', path: PREFIX,
    handler: async (req, res) => {
      try {
        const url = (req.url ?? '/').split('?')[0]
        const rest = url.startsWith(PREFIX) ? url.slice(PREFIX.length) : ''
        const seg = rest.split('/').filter((s) => s !== '')
        const method = req.method ?? 'GET'
        if (seg.length === 0) return fail(res, 404, '接口不存在')
        if (seg[0] === 'messages' && seg.length === 1) {
          if (method !== 'GET') return notAllowed(res)
          return ok(res, await session.getMessages())
        }
        if (seg[0] === 'send' && seg.length === 1) {
          if (method !== 'POST') return notAllowed(res)
          const { text } = await parseBody<{ text?: unknown }>(req)
          const { reply, reasoning } = await send(String(text ?? ''))
          return ok(res, { reply, reasoning })
        }
        return fail(res, 404, '接口不存在')
      } catch (e) {
        fail(res, errStatus(e), (e as Error).message)
      }
    },
  }))
  return () => { disposers.forEach((d) => d()) }
}
