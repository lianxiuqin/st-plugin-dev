// agent_plugin_dev/chat-stream-plugin/src/index.ts —— 后端:config.stream=false 时端点返回 stream_disabled(路由常挂,前端据此回退整回)
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
    ctx.effect(() => registerRoutes(ctx.webServer.register.bind(ctx.webServer), { streamer: ctx.chatStreamer, streamEnabled: config.stream }));
}
apply.inject = ['webServer', 'chatStreamer'];
apply.provide = [];
apply.Config = ConfigSchema;
export default apply;
