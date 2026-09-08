// agent_plugin_dev/chat-plugin/tests/stream.spec.ts
import { describe, it, expect, vi } from 'vitest'
import { streamMessage, type ChainingLike, type PendingLike, type StreamLlmLike } from '../src/send.ts'
import type { SessionLike } from '../src/session.ts'

async function collect(g: AsyncIterable<string>): Promise<string[]> {
  const out: string[] = []
  for await (const d of g) out.push(d)
  return out
}
function makeDep(over: Partial<{ llm: Partial<StreamLlmLike>; session: Partial<SessionLike> }> = {}) {
  const rows: Array<{ role: 'user' | 'assistant'; content: string }> = []
  const session: SessionLike = {
    getActive: vi.fn(async () => 's_1'),
    getMessages: vi.fn(async () => rows.map((r) => ({ role: r.role as 'user' | 'assistant', content: r.content }))),
    append: vi.fn(async (role, content) => { rows.push({ role, content }) }),
    ...(over.session ?? {}),
  }
  const chaining: ChainingLike = {
    active: vi.fn(async () => 'f_chat'),
    hasRegistered: vi.fn(async () => true),
    build: vi.fn(async () => [{ role: 'system' as const, content: '你是助手' }]),
  }
  const llm: StreamLlmLike = {
    stream: vi.fn(async function* () { yield '你'; yield '好!' }),
    ...(over.llm ?? {}),
  }
  const pending: PendingLike = { get: () => null, set: vi.fn() }
  return { session, chaining, llm, pending, rows }
}

describe('chat streamMessage v0.1.2', () => {
  it('成功:校验会话/表单/注入同 send → 逐块 yield → 完整收流后 append user+assistant,全文=各块拼接', async () => {
    const d = makeDep()
    expect(await collect(streamMessage(d, '  嗨  '))).toEqual(['你', '好!'])
    expect(d.chaining.build).toHaveBeenCalledWith('f_chat')
    expect(d.session.append).toHaveBeenNthCalledWith(1, 'user', '嗨')
    expect(d.session.append).toHaveBeenNthCalledWith(2, 'assistant', '你好!')
    expect(d.pending.set).toHaveBeenNthCalledWith(1, '嗨')
    expect(d.pending.set).toHaveBeenLastCalledWith(null)
  })
  it('text 为空 → 400 语义,不触碰 session/pending', async () => {
    const d = makeDep()
    await expect(collect(streamMessage(d, '   '))).rejects.toThrow('消息内容不能为空')
    expect(d.session.append).not.toHaveBeenCalled()
    expect(d.pending.set).not.toHaveBeenCalled()
  })
  it('无 active 会话/表单/缺注入 → 409 语义,零 append,pending 清空', async () => {
    const noActive = makeDep({ session: { getActive: vi.fn(async () => null) } })
    await expect(collect(streamMessage(noActive, 'hi'))).rejects.toThrow('请先在右侧新建或选择会话')
    const noForm = makeDep({ llm: {} })
    ;(noForm.chaining.active as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null)
    await expect(collect(streamMessage(noForm, 'hi'))).rejects.toThrow('未选择使用表单')
    const d = makeDep()
    ;(d.chaining.hasRegistered as ReturnType<typeof vi.fn>).mockResolvedValueOnce(false)
    await expect(collect(streamMessage(d, 'hi'))).rejects.toThrow('缺少动态注入条目')
    expect(noActive.session.append).not.toHaveBeenCalled()
  })
  it('llm.stream 抛错 → 原样上抛,零 append,pending 清空', async () => {
    const d = makeDep({ llm: { stream: vi.fn(async function* () { throw new Error('请求超时') }) } })
    await expect(collect(streamMessage(d, 'hi'))).rejects.toThrow('请求超时')
    expect(d.session.append).not.toHaveBeenCalled()
    expect(d.pending.set).toHaveBeenLastCalledWith(null)
  })
  it('空回复(零增量)→ 502 语义,零 append,pending 清空', async () => {
    const d = makeDep({ llm: { stream: vi.fn(async function* () { /* no yield */ }) } })
    await expect(collect(streamMessage(d, 'hi'))).rejects.toThrow('无法解析模型回复')
    expect(d.session.append).not.toHaveBeenCalled()
    expect(d.pending.set).toHaveBeenLastCalledWith(null)
  })
  it('调用方中途 break → 不落库,pending 仍清空', async () => {
    const d = makeDep()
    const g = streamMessage(d, 'hi')
    const it = g[Symbol.asyncIterator]()
    expect((await it.next()).value).toBe('你')
    await it.return?.() // 模拟前端断开/提前退出
    expect(d.session.append).not.toHaveBeenCalled()
    expect(d.pending.set).toHaveBeenLastCalledWith(null)
  })
})
