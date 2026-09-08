// agent_plugin_dev/chat-stream-plugin/src/routes.ts —— POST /api/chat-stream/send:chatStreamer → SSE 转发壳
import type { IncomingMessage, ServerResponse } from 'node:http'

type Handler = (req: IncomingMessage, res: ServerResponse) => void | Promise<void>
type Register = (o: { kind: 'exact' | 'prefix'; path: string; handler: Handler }) => () => void

const PREFIX = '/api/chat-stream/'

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve) => {
    let raw = ''
    req.on('data', (c: Buffer | string) => { raw += c })
    req.on('end', () => resolve(raw))
  })
}

export interface StreamerLike { stream(text: string, opts?: { signal?: AbortSignal }): AsyncIterable<string> }

export function registerRoutes(register: Register, dep: { streamer: StreamerLike; streamEnabled: boolean }): () => void {
  const disposers: Array<() => void> = []
  disposers.push(register({
    kind: 'prefix', path: PREFIX,
    handler: async (req, res) => {
      try {
        const url = (req.url ?? '/').split('?')[0]
        const rest = url.startsWith(PREFIX) ? url.slice(PREFIX.length) : ''
        const seg = rest.split('/').filter((s) => s !== '')
        if (seg.length !== 1 || seg[0] !== 'send' || (req.method ?? 'GET') !== 'POST') {
          res.writeHead(404, { 'content-type': 'application/json; charset=utf-8' })
          res.end(JSON.stringify({ ok: false, message: '接口不存在' }))
          return
        }
        if (!dep.streamEnabled) {
          // stream:false:不流式;前端 transport 收到 code=stream_disabled 后回退整回 /api/chat/send
          res.writeHead(409, { 'content-type': 'application/json; charset=utf-8' })
          res.end(JSON.stringify({ ok: false, code: 'stream_disabled', message: '流式输出已关闭(stream:false),已回退整回' }))
          return
        }
        const raw = await readBody(req)
        let text = ''
        try { text = String((JSON.parse(raw || '{}') as { text?: unknown }).text ?? '') } catch { /* 走 stream 的 400 文案 */ }
        res.writeHead(200, { 'content-type': 'text/event-stream; charset=utf-8', 'cache-control': 'no-cache' })
        const ac = new AbortController()
        req.on('close', () => ac.abort())
        try {
          for await (const d of dep.streamer.stream(text, { signal: ac.signal })) {
            if (res.writableEnded) return
            res.write(`data: ${JSON.stringify({ t: 'delta', d })}\n\n`)
          }
          if (!res.writableEnded) res.write('data: {"t":"done"}\n\n')
        } catch (e) {
          if (res.writableEnded) return
          res.write(`data: ${JSON.stringify({ t: 'error', message: (e as Error)?.message || '流式请求失败' })}\n\n`)
        } finally {
          res.end()
        }
      } catch (e) {
        res.writeHead(500, { 'content-type': 'application/json; charset=utf-8' })
        res.end(JSON.stringify({ ok: false, message: (e as Error)?.message || '服务器错误' }))
      }
    },
  }))
  return () => { for (const d of disposers) d() }
}
