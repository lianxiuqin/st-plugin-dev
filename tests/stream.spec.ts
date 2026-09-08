import { describe, it, expect } from 'vitest'
import { parseDeltaLine, sendChatStream } from '../src/format.ts'

function sse(...lines: string[]): Response {
  const body = new ReadableStream<Uint8Array>({
    start(c) { c.enqueue(new TextEncoder().encode(lines.join('\n'))); c.close() },
  })
  return new Response(body, { status: 200 })
}
const opts = { baseUrl: 'api.deepseek.com/v1', key: 'k', model: 'm', messages: [{ role: 'user' as const, content: 'hi' }] }

describe('parseDeltaLine', () => {
  it('openai_compatible:取 choices[0].delta.content,空 delta/其它行返回 null', () => {
    expect(parseDeltaLine('openai_compatible', 'data: {"choices":[{"delta":{"content":"你"}}]}')).toBe('你')
    expect(parseDeltaLine('openai_compatible', 'data: {"choices":[{"delta":{},"finish_reason":"stop"}]}')).toBeNull()
    expect(parseDeltaLine('openai_compatible', 'data: [DONE]')).toBeNull()
    expect(parseDeltaLine('openai_compatible', '')).toBeNull()
    expect(parseDeltaLine('openai_compatible', 'event: x')).toBeNull()
  })
  it('anthropic:仅 content_block_delta + delta.type=text_delta 取 delta.text', () => {
    const line = 'data: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"好"}}'
    expect(parseDeltaLine('anthropic', line)).toBe('好')
    expect(parseDeltaLine('anthropic', 'data: {"type":"message_start","message":{}}')).toBeNull()
    expect(parseDeltaLine('anthropic', 'data: {"type":"content_block_delta","delta":{"type":"input_json_delta"}}')).toBeNull()
  })
  it('google:parts 逐段 join', () => {
    const line = 'data: {"candidates":[{"content":{"parts":[{"text":"前"},{"text":"后"}]}}]}'
    expect(parseDeltaLine('google', line)).toBe('前后')
    expect(parseDeltaLine('google', 'data: {"candidates":[]}')).toBeNull()
  })
})

describe('sendChatStream', () => {
  it('openai 流:逐块产出,空块跳过,[DONE] 后 EOF 自然结束', async () => {
    const res = sse(
      'data: {"choices":[{"delta":{"content":"你"}}]}',
      'data: {"choices":[{"delta":{},"finish_reason":"stop"}]}',
      'data: [DONE]',
    )
    const fetchImpl = (async () => res) as unknown as typeof fetch
    const got: string[] = []
    for await (const d of sendChatStream('openai_compatible', opts, 30, undefined, fetchImpl)) got.push(d)
    expect(got).toEqual(['你'])
  })
  it('google 流:streamGenerateContent url + parts join', async () => {
    const calls: Array<{ url: string; body: string }> = []
    const fetchImpl = (async (url: string, init: RequestInit) => {
      calls.push({ url: String(url), body: String(init.body) })
      return sse('data: {"candidates":[{"content":{"parts":[{"text":"前"},{"text":"后"}]}}]}')
    }) as unknown as typeof fetch
    const got: string[] = []
    for await (const d of sendChatStream('google', { ...opts, baseUrl: 'generativelanguage.googleapis.com/v1beta', model: 'gemini-pro' }, 30, undefined, fetchImpl)) got.push(d)
    expect(got).toEqual(['前后'])
    expect(calls[0].url).toContain(':streamGenerateContent?alt=sse&key=')
  })
  it('HTTP 非 2xx → 抛 HTTP <status>', async () => {
    const fetchImpl = (async () => new Response('err', { status: 502 })) as unknown as typeof fetch
    const it = sendChatStream('openai_compatible', opts, 30, undefined, fetchImpl)
    await expect(it.next()).rejects.toThrow('HTTP 502')
  })
  it('请求体带 stream:true', async () => {
    const calls: Array<{ url: string; body: string }> = []
    const fetchImpl = (async (url: string, init: RequestInit) => {
      calls.push({ url: String(url), body: String(init.body) })
      return sse('data: {"choices":[{"delta":{"content":"x"}}]}')
    }) as unknown as typeof fetch
    const it = sendChatStream('openai_compatible', opts, 30, undefined, fetchImpl)
    await it.next()
    expect(JSON.parse(calls[0].body).stream).toBe(true)
  })
})
