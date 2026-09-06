// agent_plugin_dev/ui-chat-plugin/tests/plan.spec.ts
import { describe, expect, it, vi } from 'vitest'
import { ChatRegistry, type ChatMessage } from '../src/registry.ts'
import { planRow } from '../src/assemble.ts'

const msg: ChatMessage = { id: 1, role: 'ai', content: 'x', createdAt: 't' }

describe('planRow 装配决策', () => {
  it('无注册 → default', () => {
    expect(planRow(new ChatRegistry(), 'ai', msg)).toEqual({ kind: 'default' })
  })
  it('第三方 bubble 命中 → custom', () => {
    const r = new ChatRegistry()
    r.registerBubble({ name: 'b1', match: (role) => role === 'ai', render: vi.fn() })
    expect(planRow(r, 'ai', msg)).toEqual({ kind: 'custom', name: 'b1' })
  })
  it('默认停用且无命中 → skip', () => {
    const r = new ChatRegistry()
    r.setDefault('bubble', false)
    expect(planRow(r, 'user', { ...msg, role: 'user' })).toEqual({ kind: 'skip' })
  })
  it('match 抛错 → 跳过该渲染器', () => {
    const r = new ChatRegistry()
    r.registerBubble({ name: 'bad', match: () => { throw new Error('boom') }, render: vi.fn() })
    expect(planRow(r, 'ai', msg)).toEqual({ kind: 'default' })
  })
})
