// agent_plugin_dev/chat-plugin/src/index.ts —— 纯后端服务:注册 history/input 注入 + /api/chat/* 路由;前端对话页渲染已移交 ui-chat-plugin(v2:消费 multiSession)
import { Context } from 'cordis'
import { formatHistoryRows } from './history.ts'
import { sendMessage, type ChainingLike, type LlmLike, type ChatMessage } from './send.ts'
import { createSessionAdapter, type MultiSessionLike, type SessionLike } from './session.ts'
import { registerRoutes } from './routes.ts'

type WebServerRegister = (o: { kind: 'exact' | 'prefix'; path: string; handler: (req: import('node:http').IncomingMessage, res: import('node:http').ServerResponse) => void | Promise<void> }) => () => void

declare module 'cordis' {
  interface Context {
    webServer: { register: WebServerRegister }
    multiSession: MultiSessionLike
    promptChaining: ChainingLike
    promptRegister: { register(o: { id: string; name: string; fn: () => string | Promise<string> }): () => void }
    llmPrompt: { send(messages: ChatMessage[]): Promise<unknown> }
  }
}

export const name = 'chat-plugin'

const EmptyConfigSchema = {
  '~standard': { version: 1, vendor: 'chat-plugin', validate: (value: unknown) => ({ value: value ?? {} }) },
}

export function apply(ctx: Context, _config: Record<string, unknown>) {
  const disposers: Array<() => void> = []
  const session: SessionLike = createSessionAdapter(ctx.multiSession)
  let pending: string | null = null
  const pendingBox = {
    get: () => pending,
    set: (v: string | null) => { pending = v },
  }
  ctx.effect(() => {
    disposers.push(ctx.promptRegister.register({
      id: 'history',
      name: 'chat-history',
      fn: async () => {
        const rows = await session.getMessages()
        return formatHistoryRows(rows)
      },
    }))
    disposers.push(ctx.promptRegister.register({
      id: 'input',
      name: 'user-input',
      fn: () => {
        const v = pendingBox.get()
        if (!v) throw new Error('未在发送会话中,user-input 仅可在发送时注入')
        return v
      },
    }))
    disposers.push(registerRoutes(ctx.webServer.register.bind(ctx.webServer), {
      session,
      send: (text) => sendMessage({ session, chaining: ctx.promptChaining, llm: ctx.llmPrompt, pending: pendingBox }, text),
    }))
    return () => { for (const d of disposers) d() }
  })
}

apply.inject = ['webServer', 'multiSession', 'promptChaining', 'promptRegister', 'llmPrompt']
apply.provide = [] as string[]
apply.Config = EmptyConfigSchema

export default apply
