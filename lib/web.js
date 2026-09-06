// agent_plugin_dev/ui-chat-plugin/src/web.tsx —— 前端入口(骨架,Task 5 实现注册表与默认页)
export default {
    name: 'ui-chat-plugin',
    mount() {
        // Task 5:注入 window.__uiChat__ + 注册默认 page/bubble + __uiSlots__.register('main', …)
    },
    unmount() {
        // Task 5:反注册 + delete window.__uiChat__
    },
};
