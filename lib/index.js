// agent_plugin_dev/chat-plugin/src/index.ts —— 纯后端服务:注册 history/input 注入 + /api/chat/* 路由;前端对话页渲染已移交 ui-chat-plugin(v2:消费 multiSession)
import { Context } from 'cordis';
import { formatHistoryRows } from "./history.js";
import { sendMessage, streamMessage } from "./send.js";
import { createSessionAdapter } from "./session.js";
import { registerRoutes } from "./routes.js";
export const name = 'chat-plugin';
const EmptyConfigSchema = {
    '~standard': { version: 1, vendor: 'chat-plugin', validate: (value) => ({ value: value ?? {} }) },
};
export function apply(ctx, _config) {
    const disposers = [];
    const session = createSessionAdapter(ctx.multiSession);
    let pending = null;
    const pendingBox = {
        get: () => pending,
        set: (v) => { pending = v; },
    };
    ctx.effect(() => {
        disposers.push(ctx.promptRegister.register({
            id: 'history',
            name: 'chat-history',
            fn: async () => {
                const rows = await session.getMessages();
                return formatHistoryRows(rows);
            },
        }));
        disposers.push(ctx.promptRegister.register({
            id: 'input',
            name: 'user-input',
            fn: () => {
                const v = pendingBox.get();
                if (!v)
                    throw new Error('未在发送会话中,user-input 仅可在发送时注入');
                return v;
            },
        }));
        disposers.push(registerRoutes(ctx.webServer.register.bind(ctx.webServer), {
            session,
            send: (text) => sendMessage({ session, chaining: ctx.promptChaining, llm: ctx.llmPrompt, pending: pendingBox }, text),
        }));
        disposers.push(ctx.provide('chatStreamer', {
            stream: (text, opts) => streamMessage({ session, chaining: ctx.promptChaining, llm: ctx.llmPrompt, pending: pendingBox }, text, opts),
        }));
        return () => { for (const d of disposers)
            d(); };
    });
}
apply.inject = ['webServer', 'multiSession', 'promptChaining', 'promptRegister', 'llmPrompt'];
apply.provide = ['chatStreamer'];
apply.Config = EmptyConfigSchema;
export default apply;
