// agent_plugin_dev/ui-chat-plugin/src/web.tsx —— 前端入口:注入 __uiChat__ + 注册 main 插槽对话页
import { mountChatPlugin } from "./boot.js";
let disposer = null;
const webPlugin = {
    name: 'ui-chat-plugin',
    mount() {
        if (disposer) {
            disposer.dispose();
            disposer = null;
        }
        disposer = mountChatPlugin();
    },
    unmount() {
        disposer?.dispose();
        disposer = null;
    },
};
export default webPlugin;
