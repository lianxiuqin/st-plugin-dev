import { describe, it, expect, vi } from 'vitest'
import { sendMessage, type ChainingLike, type LlmLike, type PendingLike } from '../src/send.ts'
import type { SessionLike } from '../src/session.ts'

function makeDep(over: Partial<{ chaining: ChainingLike; llm: LlmLike; session: Partial<SessionLike> }> = {}) {
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
    ...(over.chaining ?? {}),
  }
  const llm: LlmLike = {
    send: vi.fn(async () => ({ choices: [{ message: { content: '你好!' } }] })),
    ...(over.llm ?? {}),
  }
  const pending: PendingLike = { get: () => null, set: vi.fn() }
  return { session, chaining, llm, pending, rows }
}

describe('chat send v2', () => {
  it('成功:探测会话+active form+history/input → build → llm → append user+assistant,返回 {reply, reasoning:null},pending 清空', async () => {
    const d = makeDep()
    const { reply, reasoning } = await sendMessage(d, '  你好  ')
    expect(reply).toBe('你好!')
    expect(reasoning).toBeNull()
    expect(d.chaining.build).toHaveBeenCalledWith('f_chat')
    expect(d.session.append).toHaveBeenNthCalledWith(1, 'user', '你好')
    expect(d.session.append).toHaveBeenNthCalledWith(2, 'assistant', '你好!')
    expect(d.pending.set).toHaveBeenLastCalledWith(null)
  })

  it('成功且模型返回思维链:reasoning 取自 message.reasoning_content,assistant 仍只存正文', async () => {
    const d = makeDep({ llm: { send: vi.fn(async () => ({ choices: [{ message: { reasoning_content: '先想', content: '结论' } }] })) } })
    const { reply, reasoning } = await sendMessage(d, 'hi')
    expect(reply).toBe('结论')
    expect(reasoning).toBe('先想')
    expect(d.session.append).toHaveBeenNthCalledWith(2, 'assistant', '结论')
  })

  it('text 为空 → 400 语义,不触碰 session/pending', async () => {
    const d = makeDep()
    await expect(sendMessage(d, '   ')).rejects.toThrow('消息内容不能为空')
    expect(d.session.append).not.toHaveBeenCalled()
    expect(d.pending.set).not.toHaveBeenCalled()
  })

  it('无 active 会话 → 409「请先在右侧新建或选择会话」,零 append,pending 清空', async () => {
    const d = makeDep({ session: { getActive: vi.fn(async () => null) } })
    await expect(sendMessage(d, 'hi')).rejects.toThrow('请先在右侧新建或选择会话')
    expect(d.session.append).not.toHaveBeenCalled()
    expect(d.chaining.active).not.toHaveBeenCalled()
    expect(d.pending.set).toHaveBeenLastCalledWith(null)
  })

  it('无 active form → 409,零 append', async () => {
    const d = makeDep({ chaining: { active: vi.fn(async () => null) } })
    await expect(sendMessage(d, 'hi')).rejects.toThrow('未选择使用表单')
    expect(d.session.append).not.toHaveBeenCalled()
  })

  it('缺注册条目 → 409,零 append', async () => {
    const d = makeDep({ chaining: { hasRegistered: vi.fn(async () => false) } })
    await expect(sendMessage(d, 'hi')).rejects.toThrow('缺少动态注入条目')
    expect(d.session.append).not.toHaveBeenCalled()
  })

  it('llm 失败 → 原样上抛,零 append,pending 清空', async () => {
    const d = makeDep({ llm: { send: vi.fn(async () => { throw new Error('请求超时') }) } })
    await expect(sendMessage(d, 'hi')).rejects.toThrow('请求超时')
    expect(d.session.append).not.toHaveBeenCalled()
    expect(d.pending.set).toHaveBeenLastCalledWith(null)
  })

  it('回复无法解析 → 502 语义,零 append', async () => {
    const d = makeDep({ llm: { send: vi.fn(async () => ({ choices: [] })) } })
    await expect(sendMessage(d, 'hi')).rejects.toThrow('无法解析模型回复')
    expect(d.session.append).not.toHaveBeenCalled()
  })
})
