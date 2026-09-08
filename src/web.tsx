// agent_plugin_dev/ui-chat-flat-plugin/src/web.tsx —— 消息扁平化风格 demo(风格确认用):
// 气泡无边框无底色(裸文本)、消息列窄化居中陈列、仅靠左右对齐区分消息来源(AI 左 / user 右)
interface UiChatLike {
  registerBubble(o: {
    name: string
    priority?: number
    match(role: string, msg: { content: string }): boolean
    render(el: HTMLElement, msg: { content: string }): void
  }): void
  unregister(kind: string, name: string): void
}

let reg: UiChatLike | null = null
let timer: ReturnType<typeof setInterval> | undefined

const STYLE_ID = 'ui-chat-flat-style'
const BUBBLE_NAME = 'flat-bubble'

const flatStyle = (): void => {
  if (document.getElementById(STYLE_ID)) return
  const s = document.createElement('style')
  s.id = STYLE_ID
  // 注:本 style 由 flat 插件 mount 时注入,可能先于 ui-chat-plugin 默认样式;
  // 覆盖一律提高特异性(body 前缀)或加 !important,避免同特异度时被后注入的默认样式压过。
  s.textContent = `
/* 1) 中央对话列:占内容区 80% 居中(左右各留白 10%);标题/消息/输入同列 */
body .uchat-page { align-items: center; }
body .uchat-page > .uchat-head,
body .uchat-page > .uchat-body,
body .uchat-page > .uchat-composer { width: 80%; box-sizing: border-box; }
body .uchat-page .uchat-body .uchat-list { padding: 24px 20px; gap: 20px; }
/* 2) 默认气泡壳(发送中的即时行等)强制透明无框无底;宽度同样放开为占满框架 */
.uchat-page .uchat-list > .uchat-row .uchat-bubble { background: transparent !important; color: var(--ui-text, #444) !important; border-radius: 0 !important; padding: 0 !important; box-shadow: none !important; max-width: 100% !important; font-size: 15px; line-height: 1.7; }
.uchat-page .uchat-list > .uchat-row.user .uchat-bubble { text-align: right; }
/* 3) 扁平消息:宽度由内容撑开但可占满整个框架(max-width 100%);短文本自适应,
     长文本占满整行。无气泡壳,来源靠行位置 + 块内文本方向区分:AI 左对齐 / user 右对齐 */
.uchat-flat-msg { max-width: 100%; padding: 0; white-space: pre-wrap; word-break: break-word; font-size: 15px; line-height: 1.7; color: var(--ui-text, #444); }
.uchat-row.ai .uchat-flat-msg { text-align: left; }
.uchat-row.user .uchat-flat-msg { text-align: right; }
`
  document.head.appendChild(s)
}

function tryRegister(): boolean {
  const chat = (window as unknown as { __uiChat__?: UiChatLike }).__uiChat__
  if (!chat) return false
  reg = chat
  chat.registerBubble({
    name: BUBBLE_NAME,
    priority: 20, // 高于 ui-chat-demo-plugin 的卡片气泡(10),接管所有消息
    match: () => true, // ai / user / system 全部走扁平渲染
    render(box, msg) {
      box.className = 'uchat-flat-msg' // 不带任何背景/边框/阴影
      box.textContent = msg.content
    },
  })
  return true
}

export default {
  name: 'ui-chat-flat-plugin',
  mount() {
    flatStyle()
    if (tryRegister()) return
    timer = setInterval(() => {
      if (tryRegister()) {
        clearInterval(timer)
        timer = undefined
      }
    }, 200)
  },
  unmount() {
    if (timer) {
      clearInterval(timer)
      timer = undefined
    }
    reg?.unregister('bubble', BUBBLE_NAME)
    reg = null
    document.getElementById(STYLE_ID)?.remove()
  },
}
