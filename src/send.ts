// agent_plugin_dev/chat-plugin/src/send.ts —— 发送数据流(会话先行):active 探测 → 显式 build → llm → 整轮回滚
import type { SessionLike } from './session.ts'
import { extractAssistant, extractReasoning } from './extract.ts'

export interface ChatMessage { role: 'system' | 'user' | 'assistant'; content: string }
export interface ChainingLike {
  active(): Promise<string | null>
  hasRegistered(formId: string, regId: string): Promise<boolean>
  build(formId?: string): Promise<ChatMessage[]>
}
export interface LlmLike { send(messages: ChatMessage[]): Promise<unknown> }
export interface PendingLike { get(): string | null; set(v: string | null): void }
export interface SendDep { session: SessionLike; chaining: ChainingLike; llm: LlmLike; pending: PendingLike }

export async function sendMessage(dep: SendDep, text: string): Promise<{ reply: string; reasoning: string | null }> {
  const t = typeof text === 'string' ? text.trim() : ''
  if (t === '') throw new Error('消息内容不能为空')
  const { session, chaining, llm, pending } = dep
  pending.set(t)
  try {
    const sid = await session.getActive()
    if (!sid) throw new Error('请先在右侧新建或选择会话')
    const fid = await chaining.active()
    if (!fid) throw new Error('未选择使用表单,请先在 Prompt 面板停留选择一张表单')
    const hasH = await chaining.hasRegistered(fid, 'history')
    const hasI = await chaining.hasRegistered(fid, 'input')
    if (!hasH || !hasI) {
      throw new Error('使用表单缺少动态注入条目(history/input),请先在 Prompt 面板为表单添加注册条目')
    }
    const messages = await chaining.build(fid)
    const json = await llm.send(messages)
    const reply = extractAssistant(json)
    const reasoning = extractReasoning(json)
    await session.append('user', t)
    await session.append('assistant', reply)
    return { reply, reasoning }
  } finally {
    pending.set(null)
  }
}

export interface StreamLlmLike {
  stream(messages: ChatMessage[], opts?: { signal?: AbortSignal }): AsyncIterable<{ r: string } | { t: string }>
}
export type StreamDelta = { r: string } | { t: string }
export interface StreamSendDep {
  session: SessionLike
  chaining: ChainingLike
  llm: StreamLlmLike
  pending: PendingLike
}

/** 流式发送:编排同 sendMessage,逐块产出类型增量(r=思维链,t=正文);完整收流且正文非空才落库(整轮语义),提前退出/失败不落 */
export async function* streamMessage(dep: StreamSendDep, text: string, opts?: { signal?: AbortSignal }): AsyncGenerator<StreamDelta> {
  const t = typeof text === 'string' ? text.trim() : ''
  if (t === '') throw new Error('消息内容不能为空')
  const { session, chaining, llm, pending } = dep
  pending.set(t)
  try {
    const sid = await session.getActive()
    if (!sid) throw new Error('请先在右侧新建或选择会话')
    const fid = await chaining.active()
    if (!fid) throw new Error('未选择使用表单,请先在 Prompt 面板停留选择一张表单')
    const hasH = await chaining.hasRegistered(fid, 'history')
    const hasI = await chaining.hasRegistered(fid, 'input')
    if (!hasH || !hasI) {
      throw new Error('使用表单缺少动态注入条目(history/input),请先在 Prompt 面板为表单添加注册条目')
    }
    const messages = await chaining.build(fid)
    let full = ''
    for await (const delta of llm.stream(messages, opts)) {
      if ('r' in delta) { yield delta; continue } // 推理:透传不落库
      full += delta.t
      yield delta
    }
    if (full === '') throw new Error('无法解析模型回复')
    await session.append('user', t)
    await session.append('assistant', full)
  } finally {
    pending.set(null)
  }
}
