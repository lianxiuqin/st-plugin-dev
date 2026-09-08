// agent_plugin_dev/chat-stream-plugin/src/index.ts —— 后端:config.stream=true 时挂 SSE 转发路由
import { Context } from 'cordis';
import { registerRoutes } from "./routes.js";
export const name = 'chat-stream-plugin';
const ConfigSchema = {
    '~standard': {
        version: 1, vendor: 'chat-stream-plugin',
        validate: (value) => {
            const cfg = (value ?? {});
            return { value: { stream: cfg.stream !== false } };
        },
    },
};
export function apply(ctx, config) {
    if (!config.stream)
        return; // 关闭流式:不挂路由(前端也不注册 transport → 整回)
    ctx.effect(() => registerRoutes(ctx.webServer.register.bind(ctx.webServer), { streamer: ctx.chatStreamer }));
}
apply.inject = ['webServer', 'chatStreamer'];
apply.provide = [];
apply.Config = ConfigSchema;
export default apply;
