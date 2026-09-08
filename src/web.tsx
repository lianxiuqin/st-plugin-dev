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
  s.textContent = `
/* 1) 消息列窄化居中:整列在页面中央陈列 */
.uchat-page .uchat-body .uchat-list { align-items: center; padding: 32px 20px; gap: 22px; }
.uchat-page .uchat-list > .uchat-row { width: min(760px, 100%); }
/* 2) 默认气泡壳透明化(发送中的即时行仍走默认渲染器,一并去掉底/框/内边距) */
.uchat-page .uchat-list > .uchat-row .uchat-bubble { background: transparent; color: var(--ui-text, #444); border-radius: 0; padding: 0; box-shadow: none; font-size: 14px; line-height: 1.8; }
/* 3) 扁平气泡:纯文本无任何容器视觉,左右位置由 .uchat-row.ai/.user 对齐决定 */
.uchat-flat-msg { max-width: 78%; padding: 0; white-space: pre-wrap; word-break: break-word; font-size: 14px; line-height: 1.8; color: var(--ui-text, #444); }
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
