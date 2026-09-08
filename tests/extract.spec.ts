import { describe, it, expect } from 'vitest'
import { extractAssistant, extractReasoning } from '../src/extract.ts'

describe('extractAssistant', () => {
  it('openai_compatible: choices[0].message.content', () => {
    const json = { choices: [{ message: { content: '回复A' } }] }
    expect(extractAssistant(json)).toBe('回复A')
  })
  it('anthropic: content[0].text', () => {
    const json = { content: [{ type: 'text', text: '回复B' }] }
    expect(extractAssistant(json)).toBe('回复B')
  })
  it('google: candidates[0].content.parts[].text 逐段 join,排除 thought part', () => {
    const json = { candidates: [{ content: { parts: [{ text: '前' }, { text: '后' }] } }] }
    expect(extractAssistant(json)).toBe('前后')
    const withThought = { candidates: [{ content: { parts: [{ text: '推理', thought: true }, { text: '正文' }] } }] }
    expect(extractAssistant(withThought)).toBe('正文')
  })
  it('结构不匹配 → throw 无法解析模型回复', () => {
    expect(() => extractAssistant({ foo: 1 })).toThrow('无法解析模型回复')
    expect(() => extractAssistant({ choices: [] })).toThrow('无法解析模型回复')
    expect(() => extractAssistant(null)).toThrow('无法解析模型回复')
  })
})

describe('extractReasoning', () => {
  it('openai message.reasoning_content', () => {
    expect(extractReasoning({ choices: [{ message: { reasoning_content: '链', content: '答' } }] })).toBe('链')
  })
  it('openai message.reasoning(兜底)', () => {
    expect(extractReasoning({ choices: [{ message: { reasoning: 'r' } }] })).toBe('r')
  })
  it('google thought parts 拼合,忽略正文', () => {
    const json = { candidates: [{ content: { parts: [{ text: 'a', thought: true }, { text: 'b', thought: true }, { text: '正文' }] } }] }
    expect(extractReasoning(json)).toBe('ab')
  })
  it('anthropic/无链 → null', () => {
    expect(extractReasoning({ content: [{ type: 'text', text: 'x' }] })).toBeNull()
    expect(extractReasoning({ choices: [{ message: { content: '只正文' } }] })).toBeNull()
  })
})
