// agent_plugin_dev/chat-stream-plugin/src/index.ts —— 后端:config.stream=false 时端点返回 stream_disabled(路由常挂,前端据此回退整回)
import { Context } from 'cordis'
import { registerRoutes, type StreamerLike } from './routes.ts'

declare module 'cordis' {
  interface Context {
    webServer: {
      register(o: { kind: 'exact' | 'prefix'; path: string; handler: (req: import('node:http').IncomingMessage, res: import('node:http').ServerResponse) => void | Promise<void> }): () => void
    }
    chatStreamer: StreamerLike
  }
}

export const name = 'chat-stream-plugin'

const ConfigSchema = {
  '~standard': {
    version: 1, vendor: 'chat-stream-plugin',
    validate: (value: unknown) => {
      const cfg = (value ?? {}) as Record<string, unknown>
      return { value: { stream: cfg.stream !== false } }
    },
  },
}

export function apply(ctx: Context, config: { stream: boolean }) {
  ctx.effect(() => registerRoutes(ctx.webServer.register.bind(ctx.webServer), { streamer: ctx.chatStreamer, streamEnabled: config.stream }))
}

apply.inject = ['webServer', 'chatStreamer']
apply.provide = [] as string[]
apply.Config = ConfigSchema

export default apply
