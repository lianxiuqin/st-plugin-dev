// agent_plugin_dev/ui-chat-flat-plugin/src/index.ts —— 空后端:仅声明 bundle;风格渲染注册在前端 web.tsx
import { Context } from 'cordis';
export const name = 'ui-chat-flat-plugin';
const EmptyConfigSchema = {
    '~standard': { version: 1, vendor: 'ui-chat-flat-plugin', validate: (value) => ({ value: value ?? {} }) },
};
export function apply(_ctx, _config) {
    // 无后端逻辑;经 window.__uiChat__ 注册扁平化气泡渲染
}
apply.Config = EmptyConfigSchema;
export default apply;
