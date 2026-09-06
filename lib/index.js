// agent_plugin_dev/ui-chat-plugin/src/index.ts —— 空后端:仅声明 bundle;渲染与扩展注册表在前端
import { Context } from 'cordis';
export const name = 'ui-chat-plugin';
const EmptyConfigSchema = {
    '~standard': { version: 1, vendor: 'ui-chat-plugin', validate: (value) => ({ value: value ?? {} }) },
};
export function apply(_ctx, _config) {
    // 无后端逻辑;对话页经 st.client 声明由 web-module 加载
}
apply.Config = EmptyConfigSchema;
export default apply;
