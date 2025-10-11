/**
 * React Hook 测试工具 - 专门用于测试自定义Hook
 */

import { renderHook, RenderHookOptions, RenderHookResult } from '@testing-library/react'
import { act } from '@testing-library/react'
import React from 'react'
import { BrowserRouter } from 'react-router-dom'
import { ConfigProvider } from 'antd'
import zhCN from 'antd/locale/zh_CN'

/**
 * Hook测试上下文选项
 */
interface HookTestContextOptions {
  initialRoute?: string
  mockLocalStorage?: Record<string, string>
  mockSessionStorage?: Record<string, string>
  theme?: any
  providers?: React.ComponentType<{ children: React.ReactNode }>[]
}

/**
 * Hook测试结果扩展
 */
interface ExtendedHookResult<TResult, TProps> extends RenderHookResult<TResult, TProps> {
  waitForNextUpdate: () => Promise<void>
  waitForValueToChange: (selector: (result: TResult) => any, timeout?: number) => Promise<void>
  expectError: (errorMatcher?: string | RegExp | Error) => void
  expectNoError: () => void
}

/**
 * React Hook 测试辅助类
 */
export class HookTestHelper {
  /**
   * 渲染Hook并提供测试上下文
   */
  static renderHook<TResult, TProps>(
    hook: (props: TProps) => TResult,
    options: RenderHookOptions<TProps> & HookTestContextOptions = {}
  ): ExtendedHookResult<TResult, TProps> {
    const {
      initialRoute = '/',
      mockLocalStorage = {},
      mockSessionStorage = {},
      theme,
      providers = [],
      ...renderOptions
    } = options

    // 设置存储Mock
    this.setupStorageMocks(mockLocalStorage, mockSessionStorage)

    // 创建包装器
    const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
      let wrappedChildren = (
        <BrowserRouter>
          <ConfigProvider locale={zhCN} theme={theme}>
            {children}
          </ConfigProvider>
        </BrowserRouter>
      )

      // 应用额外的Provider
      providers.forEach(Provider => {
        wrappedChildren = <Provider>{wrappedChildren}</Provider>
      })

      return wrappedChildren
    }

    const result = renderHook(hook, {
      wrapper: Wrapper,
      ...renderOptions
    })

    // 扩展结果对象
    const extendedResult = result as ExtendedHookResult<TResult, TProps>

    // 等待下次更新
    extendedResult.waitForNextUpdate = async () => {
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0))
      })
    }

    // 等待值变化
    extendedResult.waitForValueToChange = async (selector, timeout = 5000) => {
      const initialValue = selector(result.result.current)
      const startTime = Date.now()

      while (Date.now() - startTime < timeout) {
        await act(async () => {
          await new Promise(resolve => setTimeout(resolve, 100))
        })

        const currentValue = selector(result.result.current)
        if (currentValue !== initialValue) {
          return
        }
      }

      throw new Error(`值在 ${timeout}ms 内未发生变化`)
    }

    // 验证错误
    extendedResult.expectError = (errorMatcher) => {
      const error = result.result.error
      expect(error).toBeDefined()

      if (errorMatcher) {
        if (typeof errorMatcher === 'string') {
          expect(error?.message).toContain(errorMatcher)
        } else if (errorMatcher instanceof RegExp) {
          expect(error?.message).toMatch(errorMatcher)
        } else if (errorMatcher instanceof Error) {
          expect(error).toEqual(errorMatcher)
        }
      }
    }

    // 验证无错误
    extendedResult.expectNoError = () => {
      expect(result.result.error).toBeUndefined()
    }

    return extendedResult
  }

  /**
   * 测试Hook的异步行为
   */
  static async testAsyncHook<TResult, TProps>(
    hook: (props: TProps) => TResult,
    testFn: (result: ExtendedHookResult<TResult, TProps>) => Promise<void>,
    options?: RenderHookOptions<TProps> & HookTestContextOptions
  ) {
    const result = this.renderHook(hook, options)

    try {
      await testFn(result)
    } finally {
      result.unmount()
    }
  }

  /**
   * 测试Hook的状态变化
   */
  static async testHookStateChanges<TResult, TProps>(
    hook: (props: TProps) => TResult,
    stateChanges: Array<{
      action: () => void | Promise<void>
      expectedState: (result: TResult) => boolean
      description: string
    }>,
    options?: RenderHookOptions<TProps> & HookTestContextOptions
  ) {
    const result = this.renderHook(hook, options)

    try {
      for (const { action, expectedState, description } of stateChanges) {
        await act(async () => {
          await action()
        })

        expect(expectedState(result.result.current)).toBe(true)
        console.log(`✓ ${description}`)
      }
    } finally {
      result.unmount()
    }
  }

  /**
   * 测试Hook的错误处理
   */
  static async testHookErrorHandling<TResult, TProps>(
    hook: (props: TProps) => TResult,
    errorScenarios: Array<{
      trigger: () => void | Promise<void>
      expectedError: string | RegExp | Error
      description: string
    }>,
    options?: RenderHookOptions<TProps> & HookTestContextOptions
  ) {
    for (const { trigger, expectedError, description } of errorScenarios) {
      const result = this.renderHook(hook, options)

      try {
        await act(async () => {
          await trigger()
        })

        result.expectError(expectedError)
        console.log(`✓ ${description}`)
      } finally {
        result.unmount()
      }
    }
  }

  /**
   * 测试Hook的副作用
   */
  static async testHookSideEffects<TResult, TProps>(
    hook: (props: TProps) => TResult,
    sideEffectTests: Array<{
      setup?: () => void | Promise<void>
      action: () => void | Promise<void>
      verify: () => void | Promise<void>
      cleanup?: () => void | Promise<void>
      description: string
    }>,
    options?: RenderHookOptions<TProps> & HookTestContextOptions
  ) {
    const result = this.renderHook(hook, options)

    try {
      for (const { setup, action, verify, cleanup, description } of sideEffectTests) {
        if (setup) {
          await setup()
        }

        await act(async () => {
          await action()
        })

        await verify()

        if (cleanup) {
          await cleanup()
        }

        console.log(`✓ ${description}`)
      }
    } finally {
      result.unmount()
    }
  }

  /**
   * 创建Hook性能测试
   */
  static async testHookPerformance<TResult, TProps>(
    hook: (props: TProps) => TResult,
    performanceTests: Array<{
      action: () => void | Promise<void>
      maxExecutionTime: number
      description: string
    }>,
    options?: RenderHookOptions<TProps> & HookTestContextOptions
  ) {
    const result = this.renderHook(hook, options)

    try {
      for (const { action, maxExecutionTime, description } of performanceTests) {
        const startTime = performance.now()

        await act(async () => {
          await action()
        })

        const executionTime = performance.now() - startTime
        expect(executionTime).toBeLessThan(maxExecutionTime)
        console.log(`✓ ${description} (${executionTime.toFixed(2)}ms)`)
      }
    } finally {
      result.unmount()
    }
  }

  /**
   * 设置存储Mock
   */
  private static setupStorageMocks(
    mockLocalStorage: Record<string, string>,
    mockSessionStorage: Record<string, string>
  ) {
    // Mock localStorage
    const localStorageMock = {
      getItem: vi.fn((key: string) => mockLocalStorage[key] || null),
      setItem: vi.fn((key: string, value: string) => {
        mockLocalStorage[key] = value
      }),
      removeItem: vi.fn((key: string) => {
        delete mockLocalStorage[key]
      }),
      clear: vi.fn(() => {
        Object.keys(mockLocalStorage).forEach(key => {
          delete mockLocalStorage[key]
        })
      }),
      length: Object.keys(mockLocalStorage).length,
      key: vi.fn((index: number) => Object.keys(mockLocalStorage)[index] || null)
    }

    // Mock sessionStorage
    const sessionStorageMock = {
      getItem: vi.fn((key: string) => mockSessionStorage[key] || null),
      setItem: vi.fn((key: string, value: string) => {
        mockSessionStorage[key] = value
      }),
      removeItem: vi.fn((key: string) => {
        delete mockSessionStorage[key]
      }),
      clear: vi.fn(() => {
        Object.keys(mockSessionStorage).forEach(key => {
          delete mockSessionStorage[key]
        })
      }),
      length: Object.keys(mockSessionStorage).length,
      key: vi.fn((index: number) => Object.keys(mockSessionStorage)[index] || null)
    }

    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true
    })

    Object.defineProperty(window, 'sessionStorage', {
      value: sessionStorageMock,
      writable: true
    })
  }

  /**
   * 创建Hook测试套件
   */
  static createHookTestSuite<TResult, TProps>(
    hookName: string,
    hook: (props: TProps) => TResult,
    testCases: Array<{
      name: string
      test: (helper: typeof HookTestHelper) => Promise<void>
    }>
  ) {
    describe(`Hook: ${hookName}`, () => {
      testCases.forEach(({ name, test }) => {
        it(name, async () => {
          await test(HookTestHelper)
        })
      })
    })
  }

  /**
   * 验证Hook返回值结构
   */
  static expectHookResult<T>(
    result: T,
    expectedStructure: Partial<T>
  ) {
    Object.keys(expectedStructure).forEach(key => {
      expect(result).toHaveProperty(key)
      
      const expectedValue = expectedStructure[key as keyof T]
      if (typeof expectedValue === 'function') {
        expect(typeof result[key as keyof T]).toBe('function')
      } else if (expectedValue !== undefined) {
        expect(result[key as keyof T]).toEqual(expectedValue)
      }
    })
  }

  /**
   * 验证Hook的依赖数组
   */
  static testHookDependencies<TResult, TProps>(
    hook: (props: TProps) => TResult,
    dependencyTests: Array<{
      initialProps: TProps
      updatedProps: TProps
      shouldRecompute: boolean
      description: string
    }>,
    options?: RenderHookOptions<TProps> & HookTestContextOptions
  ) {
    dependencyTests.forEach(({ initialProps, updatedProps, shouldRecompute, description }) => {
      it(description, async () => {
        const result = this.renderHook(hook, { 
          initialProps,
          ...options 
        })

        const initialResult = result.result.current

        await act(async () => {
          result.rerender(updatedProps)
        })

        const updatedResult = result.result.current

        if (shouldRecompute) {
          expect(updatedResult).not.toBe(initialResult)
        } else {
          expect(updatedResult).toBe(initialResult)
        }

        result.unmount()
      })
    })
  }
}

/**
 * Hook测试装饰器
 */
export function withHookTestEnvironment<TResult, TProps>(
  testFn: (helper: typeof HookTestHelper) => Promise<void>
) {
  return async () => {
    // 设置测试环境
    const originalConsoleError = console.error
    console.error = vi.fn()

    try {
      await testFn(HookTestHelper)
    } finally {
      // 恢复环境
      console.error = originalConsoleError
      vi.clearAllMocks()
    }
  }
}

/**
 * 常用Hook测试模式
 */
export const HookTestPatterns = {
  /**
   * 测试状态Hook模式
   */
  testStateHook: <T>(
    hook: () => [T, (value: T) => void],
    initialValue: T,
    newValue: T
  ) => {
    return HookTestHelper.testHookStateChanges(
      hook,
      [
        {
          action: () => {},
          expectedState: ([value]) => value === initialValue,
          description: '初始状态正确'
        },
        {
          action: async () => {
            const [, setValue] = hook()
            setValue(newValue)
          },
          expectedState: ([value]) => value === newValue,
          description: '状态更新正确'
        }
      ]
    )
  },

  /**
   * 测试异步Hook模式
   */
  testAsyncHook: <T>(
    hook: () => { data: T | null; loading: boolean; error: Error | null },
    mockAsyncOperation: () => Promise<T>
  ) => {
    return HookTestHelper.testHookStateChanges(
      hook,
      [
        {
          action: () => {},
          expectedState: ({ loading, data, error }) => 
            loading === false && data === null && error === null,
          description: '初始状态正确'
        },
        {
          action: async () => {
            await mockAsyncOperation()
          },
          expectedState: ({ loading }) => loading === true,
          description: '加载状态正确'
        }
      ]
    )
  }
}

export default HookTestHelper