import { describe, it, expect } from 'vitest'

describe('简单测试', () => {
  it('应该能够运行基本测试', () => {
    expect(1 + 1).toBe(2)
  })

  it('应该能够测试字符串', () => {
    expect('hello').toBe('hello')
  })

  it('应该能够测试对象', () => {
    const obj = { name: 'test', value: 123 }
    expect(obj).toEqual({ name: 'test', value: 123 })
  })
})