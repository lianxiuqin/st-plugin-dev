import { describe, it, expect } from 'vitest'
import { parseDeltaLine, sendChatStream } from '../src/format.ts'

function sse(...lines: string[]): Response {
  const body = new ReadableStream<Uint8Array>({
    start(c) { c.enqueue(new TextEncoder().encode(lines.join('\n'))); c.close() },
  })
  return new Response(body, { status: 200 })
}
const opts = { baseUrl: 'api.deepseek.com/v1', key: 'k', model: 'm', messages: [{ role: 'user' as const, content: 'hi' }] }

type Delta = { r: string } | { t: string }

describe('parseDeltaLine', () => {
  it('openai_compatible:content → {t};空 delta/[DONE]/事件行 → null', () => {
    expect(parseDeltaLine('openai_compatible', 'data: {"choices":[{"delta":{"content":"你"}}]}')).toEqual({ t: '你' })
    expect(parseDeltaLine('openai_compatible', 'data: {"choices":[{"delta":{},"finish_reason":"stop"}]}')).toBeNull()
    expect(parseDeltaLine('openai_compatible', 'data: [DONE]')).toBeNull()
    expect(parseDeltaLine('openai_compatible', '')).toBeNull()
    expect(parseDeltaLine('openai_compatible', 'event: x')).toBeNull()
  })
  it('openai_compatible:reasoning_content → {r}(deepseek);reasoning 兜底 → {r}', () => {
    expect(parseDeltaLine('openai_compatible', 'data: {"choices":[{"delta":{"reasoning_content":"先比较整数部分"}}]}')).toEqual({ r: '先比较整数部分' })
    expect(parseDeltaLine('openai_compatible', 'data: {"choices":[{"delta":{"reasoning":"let me think"}}]}')).toEqual({ r: 'let me think' })
  })
  it('anthropic:text_delta → {t};thinking_delta → {r};其它事件 → null', () => {
    expect(parseDeltaLine('anthropic', 'data: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"好"}}')).toEqual({ t: '好' })
    expect(parseDeltaLine('anthropic', 'data: {"type":"content_block_delta","delta":{"type":"thinking_delta","thinking":"推理中"}}')).toEqual({ r: '推理中' })
    expect(parseDeltaLine('anthropic', 'data: {"type":"message_start","message":{}}')).toBeNull()
    expect(parseDeltaLine('anthropic', 'data: {"type":"content_block_delta","delta":{"type":"input_json_delta"}}')).toBeNull()
    expect(parseDeltaLine('anthropic', 'data: {"type":"content_block_delta","delta":{"type":"signature_delta","signature":"s"}}')).toBeNull()
  })
  it('google:thought part → {r};非 thought parts join → {t};无 parts → null', () => {
    expect(parseDeltaLine('google', 'data: {"candidates":[{"content":{"parts":[{"text":"推理段","thought":true},{"text":"正文"}]}}]}')).toEqual({ r: '推理段' })
    expect(parseDeltaLine('google', 'data: {"candidates":[{"content":{"parts":[{"text":"前"},{"text":"后"}]}}]}')).toEqual({ t: '前后' })
    expect(parseDeltaLine('google', 'data: {"candidates":[]}')).toBeNull()
  })
})

describe('sendChatStream', () => {
  async function collect(fmt: string, res: Response): Promise<Array<Delta | string>> {
    const fetchImpl = (async () => res) as unknown as typeof fetch
    const got: Array<Delta | string> = []
    for await (const d of sendChatStream(fmt, opts, 30, undefined, fetchImpl)) got.push(d)
    return got
  }

  it('openai 流:逐块产出,空块跳过,[DONE] 后 EOF 自然结束', async () => {
    const got = await collect('openai_compatible', sse(
      'data: {"choices":[{"delta":{"content":"你"}}]}',
      'data: {"choices":[{"delta":{},"finish_reason":"stop"}]}',
      'data: [DONE]',
    ))
    expect(got).toEqual([{ t: '你' }])
  })
  it('openai 流:推理增量先行({r}),正文后行({t}),顺序保持', async () => {
    const got = await collect('openai_compatible', sse(
      'data: {"choices":[{"delta":{"reasoning_content":"想"}}]}',
      'data: {"choices":[{"delta":{"reasoning_content":"一想"}}]}',
      'data: {"choices":[{"delta":{"content":"答"}}]}',
      'data: {"choices":[{"delta":{"content":"案"}}]}',
      'data: [DONE]',
    ))
    expect(got).toEqual([{ r: '想' }, { r: '一想' }, { t: '答' }, { t: '案' }])
  })
  it('google 流:streamGenerateContent url + thought 拆分', async () => {
    const calls: Array<{ url: string; body: string }> = []
    const fetchImpl = (async (url: string, init: RequestInit) => {
      calls.push({ url: String(url), body: String(init.body) })
      return sse(
        'data: {"candidates":[{"content":{"parts":[{"text":"推理","thought":true}]}}]}',
        'data: {"candidates":[{"content":{"parts":[{"text":"前后"}]}}]}',
      )
    }) as unknown as typeof fetch
    const got: Array<Delta | string> = []
    for await (const d of sendChatStream('google', { ...opts, baseUrl: 'generativelanguage.googleapis.com/v1beta', model: 'gemini-pro' }, 30, undefined, fetchImpl)) got.push(d)
    expect(got).toEqual([{ r: '推理' }, { t: '前后' }])
    expect(calls[0].url).toContain(':streamGenerateContent?alt=sse&key=')
  })
  it('EOF 无换行末行仍解析(flush)', async () => {
    const res = new Response(new ReadableStream<Uint8Array>({
      start(c) { c.enqueue(new TextEncoder().encode('data: {"choices":[{"delta":{"content":"末行"}}]}')); c.close() },
    }), { status: 200 })
    expect(await collect('openai_compatible', res)).toEqual([{ t: '末行' }])
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
