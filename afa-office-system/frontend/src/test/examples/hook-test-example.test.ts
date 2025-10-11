/**
 * Hook测试工具使用示例
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { HookTestHelper, HookTestPatterns, withHookTestEnvironment } from '../utils/hook-test-helper'
import { useState, useEffect, useCallback } from 'react'

// 示例自定义Hook
function useCounter(initialValue = 0) {
  const [count, setCount] = useState(initialValue)
  
  const increment = useCallback(() => {
    setCount(prev => prev + 1)
  }, [])
  
  const decrement = useCallback(() => {
    setCount(prev => prev - 1)
  }, [])
  
  const reset = useCallback(() => {
    setCount(initialValue)
  }, [initialValue])
  
  return {
    count,
    increment,
    decrement,
    reset
  }
}

// 示例异步Hook
function useAsyncData(url: string) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  
  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch(url)
      const result = await response.json()
      setData(result)
    } catch (err) {
      setError(err)
    } finally {
      setLoading(false)
    }
  }, [url])
  
  useEffect(() => {
    fetchData()
  }, [fetchData])
  
  return {
    data,
    loading,
    error,
    refetch: fetchData
  }
}

describe('Hook测试工具示例', () => {
  describe('基础Hook测试', () => {
    it('应该正确测试状态Hook', withHookTestEnvironment(async (helper) => {
      const result = helper.renderHook(() => useCounter(5))
      
      // 验证初始状态
      expect(result.result.current.count).toBe(5)
      
      // 测试increment
      await helper.testHookStateChanges(
        () => useCounter(5),
        [
          {
            action: async () => {
              result.result.current.increment()
            },
            expectedState: (hookResult) => hookResult.count === 6,
            description: '计数器应该增加1'
          }
        ]
      )
    }))

    it('应该正确测试Hook返回值结构', withHookTestEnvironment(async (helper) => {
      const result = helper.renderHook(() => useCounter())
      
      helper.expectHookResult(result.result.current, {
        count: 0,
        increment: expect.any(Function),
        decrement: expect.any(Function),
        reset: expect.any(Function)
      })
    }))
  })

  describe('异步Hook测试', () => {
    beforeEach(() => {
      // 设置fetch mock
      global.fetch = vi.fn()
    })

    afterEach(() => {
      vi.resetAllMocks()
    })

    it('应该正确测试异步Hook', withHookTestEnvironment(async (helper) => {
      const mockData = { id: 1, name: 'Test' }
      
      // Mock成功响应
      global.fetch.mockResolvedValueOnce({
        json: () => Promise.resolve(mockData)
      })

      await helper.testAsyncHook(
        () => useAsyncData('/api/test'),
        async (result) => {
          // 验证初始状态
          expect(result.result.current.loading).toBe(true)
          expect(result.result.current.data).toBe(null)
          expect(result.result.current.error).toBe(null)

          // 等待数据加载完成
          await result.waitForValueToChange(
            (current) => current.loading,
            3000
          )

          // 验证最终状态
          expect(result.result.current.loading).toBe(false)
          expect(result.result.current.data).toEqual(mockData)
          expect(result.result.current.error).toBe(null)
        }
      )
    }))

    it('应该正确处理异步Hook错误', withHookTestEnvironment(async (helper) => {
      const mockError = new Error('网络错误')
      
      // Mock错误响应
      global.fetch.mockRejectedValueOnce(mockError)

      await helper.testHookErrorHandling(
        () => useAsyncData('/api/error'),
        [
          {
            trigger: async () => {
              // 等待错误发生
              await new Promise(resolve => setTimeout(resolve, 100))
            },
            expectedError: '网络错误',
            description: '应该正确处理网络错误'
          }
        ]
      )
    }))
  })

  describe('Hook性能测试', () => {
    it('应该测试Hook性能', withHookTestEnvironment(async (helper) => {
      await helper.testHookPerformance(
        () => useCounter(),
        [
          {
            action: async () => {
              const result = helper.renderHook(() => useCounter())
              for (let i = 0; i < 100; i++) {
                result.result.current.increment()
              }
              result.unmount()
            },
            maxExecutionTime: 100, // 100ms
            description: 'Hook操作应该在100ms内完成'
          }
        ]
      )
    }))
  })

  describe('Hook副作用测试', () => {
    it('应该测试Hook副作用', withHookTestEnvironment(async (helper) => {
      const mockCallback = vi.fn()
      
      function useEffectHook() {
        useEffect(() => {
          mockCallback()
          return () => {
            mockCallback('cleanup')
          }
        }, [])
      }

      await helper.testHookSideEffects(
        () => useEffectHook(),
        [
          {
            action: async () => {
              const result = helper.renderHook(() => useEffectHook())
              result.unmount()
            },
            verify: async () => {
              expect(mockCallback).toHaveBeenCalledWith()
              expect(mockCallback).toHaveBeenCalledWith('cleanup')
            },
            description: '应该正确执行副作用和清理'
          }
        ]
      )
    }))
  })

  describe('Hook依赖测试', () => {
    it('应该测试Hook依赖数组', () => {
      function useCounterWithDeps(initialValue: number, step: number) {
        const [count, setCount] = useState(initialValue)
        
        const increment = useCallback(() => {
          setCount(prev => prev + step)
        }, [step])
        
        return { count, increment }
      }

      HookTestHelper.testHookDependencies(
        ({ initialValue, step }) => useCounterWithDeps(initialValue, step),
        [
          {
            initialProps: { initialValue: 0, step: 1 },
            updatedProps: { initialValue: 0, step: 1 },
            shouldRecompute: false,
            description: '相同props不应该重新计算'
          },
          {
            initialProps: { initialValue: 0, step: 1 },
            updatedProps: { initialValue: 0, step: 2 },
            shouldRecompute: true,
            description: 'step变化应该重新计算'
          }
        ]
      )
    })
  })

  describe('Hook测试套件示例', () => {
    HookTestHelper.createHookTestSuite(
      'useCounter',
      (props) => useCounter(props?.initialValue),
      [
        {
          name: '应该正确初始化',
          test: async (helper) => {
            const result = helper.renderHook(() => useCounter(10))
            expect(result.result.current.count).toBe(10)
          }
        },
        {
          name: '应该正确增加计数',
          test: async (helper) => {
            const result = helper.renderHook(() => useCounter())
            
            await helper.testHookStateChanges(
              () => useCounter(),
              [
                {
                  action: () => result.result.current.increment(),
                  expectedState: (hookResult) => hookResult.count === 1,
                  description: '计数应该增加到1'
                }
              ]
            )
          }
        }
      ]
    )
  })

  describe('Hook测试模式示例', () => {
    it('应该使用状态Hook测试模式', async () => {
      await HookTestPatterns.testStateHook(
        () => {
          const [value, setValue] = useState('initial')
          return [value, setValue]
        },
        'initial',
        'updated'
      )
    })

    it('应该使用异步Hook测试模式', async () => {
      const mockAsyncOperation = vi.fn().mockResolvedValue({ data: 'test' })
      
      await HookTestPatterns.testAsyncHook(
        () => {
          const [data, setData] = useState(null)
          const [loading, setLoading] = useState(false)
          const [error, setError] = useState(null)
          
          return { data, loading, error }
        },
        mockAsyncOperation
      )
    })
  })
})