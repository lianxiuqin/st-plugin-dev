// agent_plugin_dev/chat-stream-plugin/src/sse.ts —— 前端 SSE 行解析(纯函数)
export interface StreamEvent { t: 'r' | 'delta' | 'done' | 'error'; d?: string; message?: string }

export function parseSseLine(line: string): StreamEvent | null {
  const s = typeof line === 'string' ? line.trim() : ''
  if (!s.startsWith('data:')) return null
  const payload = s.slice(5).trim()
  if (!payload) return null
  let j: Record<string, unknown>
  try { j = JSON.parse(payload) as Record<string, unknown> } catch { return null }
  if (j.t === 'r' && typeof j.d === 'string') return { t: 'r', d: j.d }
  if (j.t === 'delta' && typeof j.d === 'string') return { t: 'delta', d: j.d }
  if (j.t === 'done') return { t: 'done' }
  if (j.t === 'error') return { t: 'error', message: typeof j.message === 'string' ? j.message : '流式请求失败' }
  return null
}
