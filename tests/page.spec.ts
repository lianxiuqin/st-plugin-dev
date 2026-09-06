// agent_plugin_dev/ui-chat-plugin/tests/page.spec.ts
import { describe, expect, it, vi } from 'vitest'
import { ChatRegistry, type ChatPageCtx } from '../src/registry.ts'

// 注:createChatPage 依赖 document/style;此测试只验证 pickPage 仲裁与错误回退的纯决策。
// 引入 createChatPage 会触发 DOM;改为验证 registry 层 + 包装决策函数。
describe('page 仲裁', () => {
  it('无 page 注册时 isDefault 生效', () => {
    const r = new ChatRegistry()
    expect(r.isDefaultEnabled('page')).toBe(true)
  })
  it('注册第三方 page 后 pickPage 返回它', () => {
    const r = new ChatRegistry()
    r.registerPage({ name: 'custom-page', render: vi.fn((_c: ChatPageCtx) => document.createElement('div')) })
    expect(r.pickPage()?.name).toBe('custom-page')
  })
  it('setDefault(page,false) 不影响 pickPage 命中第三方', () => {
    const r = new ChatRegistry()
    r.setDefault('page', false)
    r.registerPage({ name: 'p', render: vi.fn((_c: ChatPageCtx) => document.createElement('div')) })
    expect(r.pickPage()?.name).toBe('p')
    expect(r.isDefaultEnabled('page')).toBe(false)
  })
})
