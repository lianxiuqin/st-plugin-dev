// agent_plugin_dev/ui-chat-plugin/tests/registry.spec.ts
import { describe, expect, it, vi } from 'vitest'
import { ChatRegistry, type ChatMessage, type ChatPageCtx } from '../src/registry.ts'

const msg = (role: ChatMessage['role']): ChatMessage => ({ id: 1, role, content: 'hi', createdAt: 't' })
const page = (name: string, priority = 0) => ({ name, priority, render: vi.fn((_ctx: ChatPageCtx) => document.createElement('div')) })
const bubble = (name: string, opts: { role?: ChatMessage['role']; priority?: number } = {}) => ({
  name,
  priority: opts.priority ?? 0,
  match: vi.fn((role: ChatMessage['role']) => role === (opts.role ?? 'ai')),
  render: vi.fn((_el: HTMLElement, _m: ChatMessage) => {}),
})

describe('ChatRegistry', () => {
  it('同名 page 注册后到覆盖,旧项 unmount 被调', () => {
    const r = new ChatRegistry()
    const oldUn = vi.fn()
    r.registerPage({ ...page('p'), unmount: oldUn })
    const p2 = page('p')
    r.registerPage(p2)
    expect(r.counts().page).toBe(1)
    expect(oldUn).toHaveBeenCalledTimes(1)
    expect(r.pickPage()?.name).toBe('p')
  })

  it('pickPage 按 priority 高者生效;同 priority 先注册先生效', () => {
    const r = new ChatRegistry()
    r.registerPage(page('low', 1))
    r.registerPage(page('high', 5))
    expect(r.pickPage()?.name).toBe('high')
    const r2 = new ChatRegistry()
    r2.registerPage(page('a', 0))
    r2.registerPage(page('b', 0))
    expect(r2.pickPage()?.name).toBe('a')
  })

  it('pickBubble 按 priority + match 命中选择', () => {
    const r = new ChatRegistry()
    r.registerBubble(bubble('user-b', { role: 'user' }))
    r.registerBubble(bubble('ai-b', { role: 'ai', priority: 10 }))
    expect(r.pickBubble('ai', msg('ai'))?.name).toBe('ai-b')
    expect(r.pickBubble('user', msg('user'))?.name).toBe('user-b')
    expect(r.pickBubble('system', msg('system'))).toBeNull()
  })

  it('toolsOf/regionsOf 按 scope/slot 过滤且 priority 排序', () => {
    const r = new ChatRegistry()
    r.registerTool({ name: 't1', scope: 'bubble', render: vi.fn() })
    r.registerTool({ name: 't2', scope: 'session-head', priority: 3, render: vi.fn() })
    r.registerTool({ name: 't0', scope: 'bubble', priority: 5, render: vi.fn() })
    expect(r.toolsOf('bubble').map((t) => t.name)).toEqual(['t0', 't1'])
    expect(r.toolsOf('composer')).toEqual([])
    r.registerRegion({ name: 's1', slot: 'side', render: vi.fn() })
    expect(r.regionsOf('side').map((x) => x.name)).toEqual(['s1'])
    expect(r.regionsOf('page-head')).toEqual([])
  })

  it('subscribe 在注册/反注册/setDefault 时通知', () => {
    const r = new ChatRegistry()
    const fn = vi.fn()
    r.subscribe(fn)
    r.registerPage(page('p'))
    expect(fn).toHaveBeenCalledTimes(1)
    r.unregister('page', 'p')
    expect(fn).toHaveBeenCalledTimes(2)
    r.setDefault('bubble', false)
    expect(fn).toHaveBeenCalledTimes(3)
    expect(r.isDefaultEnabled('bubble')).toBe(false)
  })

  it('非法参数 throw', () => {
    const r = new ChatRegistry()
    expect(() => r.registerPage({ name: '', render: vi.fn() })).toThrow(/非法 page/)
    expect(() => r.registerTool({ name: 'x', scope: 'bad' as never, render: vi.fn() })).toThrow(/非法 tool/)
    expect(() => r.registerRegion({ name: 'x', slot: 'bad' as never, render: vi.fn() })).toThrow(/非法 region/)
  })

  it('unregister 调 unmount 并清空', () => {
    const r = new ChatRegistry()
    const un = vi.fn()
    r.registerBubble({ ...bubble('b'), unmount: un })
    r.unregister('bubble', 'b')
    expect(un).toHaveBeenCalledTimes(1)
    expect(r.counts().bubble).toBe(0)
  })
})

const transport = (name: string, priority = 0, match = () => true) => ({
  name, priority,
  match: vi.fn((_text: string) => match()),
  send: vi.fn((_text: string) => 'ok'),
})

describe('ChatRegistry transport', () => {
  it('registerTransport:同名覆盖 + priority/match 命中 + 反注册', () => {
    const r = new ChatRegistry()
    const oldUn = vi.fn()
    r.registerTransport({ ...transport('t'), unmount: oldUn })
    r.registerTransport(transport('t', 5))
    expect(r.counts().transport).toBe(1)
    expect(oldUn).toHaveBeenCalledTimes(1)
    expect(r.pickTransport('hi')?.name).toBe('t')
    r.registerTransport(transport('no', 10, () => false))
    expect(r.pickTransport('hi')?.name).toBe('t')
    r.unregister('transport', 't')
    expect(r.pickTransport('hi')).toBeNull()
    expect(r.counts().transport).toBe(1) // 剩 no(不 match)
  })
  it('非法 transport 注册 throw', () => {
    const r = new ChatRegistry()
    expect(() => r.registerTransport({ name: '', match: () => true, send: (_t: string) => 'x' })).toThrow('非法 transport')
    expect(() => r.registerTransport({ name: 'a', match: 1 as never, send: (_t: string) => 'x' })).toThrow('非法 transport')
  })
})
