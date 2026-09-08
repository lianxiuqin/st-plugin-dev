// agent_plugin_dev/llm-plugin/src/format.ts
export type ProviderFormat = 'openai_compatible' | 'anthropic' | 'google'

export const PROVIDER_BASE_URLS: Record<string, string> = {
  openai: 'api.openai.com/v1',
  deepseek: 'api.deepseek.com/v1',
  zhipu: 'open.bigmodel.cn/api/paas/v4',
  qwen: 'dashscope.aliyuncs.com/compatible-mode/v1',
  anthropic: 'api.anthropic.com/v1',
  google: 'generativelanguage.googleapis.com/v1beta',
}
export const PROVIDER_FORMATS: Record<string, string> = {
  openai: 'openai_compatible',
  deepseek: 'openai_compatible',
  zhipu: 'openai_compatible',
  qwen: 'openai_compatible',
  anthropic: 'anthropic',
  google: 'google',
}

export function normalizeBase(url: string): string {
  return url.replace(/\/+$/, '')
}

function withProtocol(base: string): string {
  return /^https?:\/\//i.test(base) ? base : `https://${base}`
}

interface ModelRequest { method: 'GET'; url: string; headers: Record<string, string> }
interface TestRequest { method: 'POST'; url: string; headers: Record<string, string>; body: string }

export function buildModelRequest(format: string, baseUrl: string, key: string): ModelRequest {
  const base = withProtocol(normalizeBase(baseUrl))
  if (format === 'anthropic') {
    return { method: 'GET', url: `${base}/models`, headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01' } }
  }
  if (format === 'google') {
    return { method: 'GET', url: `${base}/models?key=${encodeURIComponent(key)}`, headers: {} }
  }
  return { method: 'GET', url: `${base}/models`, headers: { Authorization: `Bearer ${key}` } }
}

export function parseModelList(format: string, json: unknown): string[] {
  const j = json as Record<string, unknown> | null
  if (!j) return []
  if (format === 'google') {
    const rows = (j.models ?? []) as { name?: string }[]
    return rows.map((m) => String(m.name ?? '').replace(/^models\//, '')).filter(Boolean)
  }
  const rows = (j.data ?? []) as { id?: string }[]
  return rows.map((m) => String(m.id ?? '')).filter(Boolean)
}

export function buildTestRequest(format: string, opts: { baseUrl: string; key: string; model: string }): TestRequest {
  const base = withProtocol(normalizeBase(opts.baseUrl))
  if (format === 'anthropic') {
    return {
      method: 'POST',
      url: `${base}/messages`,
      headers: { 'x-api-key': opts.key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model: opts.model, max_tokens: 8, messages: [{ role: 'user', content: 'ping' }] }),
    }
  }
  if (format === 'google') {
    const body = JSON.stringify({ contents: [{ parts: [{ text: 'ping' }] }] })
    return {
      method: 'POST',
      url: `${base}/models/${encodeURIComponent(opts.model)}:generateContent?key=${encodeURIComponent(opts.key)}`,
      headers: { 'content-type': 'application/json' },
      body,
    }
  }
  return {
    method: 'POST',
    url: `${base}/chat/completions`,
    headers: { Authorization: `Bearer ${opts.key}`, 'content-type': 'application/json' },
    body: JSON.stringify({ model: opts.model, messages: [{ role: 'user', content: 'ping' }] }),
  }
}

export interface FetchInit { method: string; url: string; headers: Record<string, string>; body?: string }

export async function sendJson(req: FetchInit, timeout: number, fetchImpl: typeof fetch = fetch): Promise<{ status: number; json: unknown }> {
  const res = await fetchImpl(req.url, {
    method: req.method,
    headers: req.headers,
    body: req.body,
    signal: AbortSignal.timeout(timeout * 1000),
  })
  const text = await res.text()
  let json: unknown = null
  try { json = text ? JSON.parse(text) : null } catch { json = null }
  return { status: res.status, json }
}

export function isOk(format: string, json: unknown): boolean {
  const j = json as Record<string, unknown> | null
  if (!j) return false
  if (format === 'google') return Array.isArray(j.candidates) && j.candidates.length > 0
  if (format === 'anthropic') return Array.isArray(j.content) && j.content.length > 0
  return Array.isArray(j.choices) && j.choices.length > 0
}

export interface ChatMessage { role: string; content: string }

export async function sendChat(
  format: string,
  opts: { baseUrl: string; key: string; model: string; messages: ChatMessage[] },
  timeout: number,
  fetchImpl: typeof fetch = fetch,
): Promise<{ status: number; json: unknown }> {
  const base = withProtocol(normalizeBase(opts.baseUrl))
  if (opts.messages.length === 0) throw new Error('messages 不能为空')
  if (format === 'anthropic') {
    return sendJson({
      method: 'POST',
      url: `${base}/messages`,
      headers: { 'x-api-key': opts.key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model: opts.model, max_tokens: 8, messages: opts.messages }),
    }, timeout, fetchImpl)
  }
  if (format === 'google') {
    const contents = opts.messages.map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }))
    return sendJson({
      method: 'POST',
      url: `${base}/models/${encodeURIComponent(opts.model)}:generateContent?key=${encodeURIComponent(opts.key)}`,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ contents }),
    }, timeout, fetchImpl)
  }
  return sendJson({
    method: 'POST',
    url: `${base}/chat/completions`,
    headers: { Authorization: `Bearer ${opts.key}`, 'content-type': 'application/json' },
    body: JSON.stringify({ model: opts.model, messages: opts.messages }),
  }, timeout, fetchImpl)
}

// —— 流式:SSE 增量解析(三厂商)+ 增量请求 ——

/** 解析单行 SSE(data: {...});无增量(空/事件行/非目标结构)返回 null */
export function parseDeltaLine(format: string, line: string): string | null {
  const s = typeof line === 'string' ? line.trim() : ''
  if (!s.startsWith('data:')) return null
  const payload = s.slice(5).trim()
  if (!payload || payload === '[DONE]') return null
  let j: Record<string, unknown>
  try { j = JSON.parse(payload) as Record<string, unknown> } catch { return null }
  if (format === 'anthropic') {
    if (j.type !== 'content_block_delta') return null
    const delta = j.delta as { type?: string; text?: string } | undefined
    if (delta?.type !== 'text_delta' || typeof delta.text !== 'string' || delta.text === '') return null
    return delta.text
  }
  if (format === 'google') {
    const cands = j.candidates as Array<{ content?: { parts?: Array<{ text?: unknown }> } }> | undefined
    const parts = cands?.[0]?.content?.parts
    if (!Array.isArray(parts) || parts.length === 0) return null
    const text = parts.map((p) => (p && typeof p.text === 'string' ? p.text : '')).join('')
    return text === '' ? null : text
  }
  const choices = j.choices as Array<{ delta?: { content?: unknown } }> | undefined
  const content = choices?.[0]?.delta?.content
  return typeof content === 'string' && content !== '' ? content : null
}

/**
 * 流式聊天请求:async generator,逐块产出增量文本。
 * signal 由调用方传入(req close / 用户停止);abort 时 reader.read() 抛 AbortError 上抛。
 * 非 2xx 抛 `HTTP <status>`(由 service 包装成中文)。
 */
export async function* sendChatStream(
  format: string,
  opts: { baseUrl: string; key: string; model: string; messages: ChatMessage[] },
  _timeout: number,
  signal: AbortSignal | undefined,
  fetchImpl: typeof fetch = fetch,
): AsyncGenerator<string> {
  const base = withProtocol(normalizeBase(opts.baseUrl))
  if (opts.messages.length === 0) throw new Error('messages 不能为空')
  let url: string
  let headers: Record<string, string>
  let body: string
  if (format === 'anthropic') {
    url = `${base}/messages`
    headers = { 'x-api-key': opts.key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' }
    // max_tokens 与现有 sendChat 保持一致(历史值,非本次范围)
    body = JSON.stringify({ model: opts.model, max_tokens: 8, stream: true, messages: opts.messages })
  } else if (format === 'google') {
    const contents = opts.messages.map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }))
    url = `${base}/models/${encodeURIComponent(opts.model)}:streamGenerateContent?alt=sse&key=${encodeURIComponent(opts.key)}`
    headers = { 'content-type': 'application/json' }
    body = JSON.stringify({ contents })
  } else {
    url = `${base}/chat/completions`
    headers = { Authorization: `Bearer ${opts.key}`, 'content-type': 'application/json' }
    body = JSON.stringify({ model: opts.model, messages: opts.messages, stream: true })
  }
  const res = await fetchImpl(url, { method: 'POST', headers, body, signal })
  if (res.status < 200 || res.status >= 300) throw new Error(`HTTP ${res.status}`)
  const reader = res.body?.getReader()
  if (!reader) throw new Error('无响应流')
  const decoder = new TextDecoder()
  let buf = ''
  for (;;) {
    const { done, value } = await reader.read()
    if (done) {
      // EOF flush:末行可能无 \n 结尾(测试/部分实现边界)
      const delta = parseDeltaLine(format, buf)
      if (delta) yield delta
      break
    }
    buf += decoder.decode(value, { stream: true })
    let idx: number
    while ((idx = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, idx)
      buf = buf.slice(idx + 1)
      const delta = parseDeltaLine(format, line)
      if (delta) yield delta
    }
  }
}
