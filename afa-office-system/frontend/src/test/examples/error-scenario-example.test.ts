/**
 * 错误场景测试工具使用示例
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ErrorScenarioHelper, ErrorScenarioType, withErrorScenarioTesting } from '../utils/error-scenario-helper'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import React from 'react'

// 示例组件：登录表单
function LoginForm({ onSubmit }: { onSubmit: (data: any) => Promise<void> }) {
  const [formData, setFormData] = React.useState({
    email: '',
    password: ''
  })
  const [errors, setErrors] = React.useState<any>({})
  const [loading, setLoading] = React.useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // 表单验证
    const newErrors: any = {}
    if (!formData.email) {
      newErrors.email = '请输入邮箱地址'
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = '请输入有效的邮箱地址'
    }
    
    if (!formData.password) {
      newErrors.password = '请输入密码'
    } else if (formData.password.length < 6) {
      newErrors.password = '密码长度至少6位'
    }

    setErrors(newErrors)
    
    if (Object.keys(newErrors).length > 0) {
      return
    }

    setLoading(true)
    
    try {
      await onSubmit(formData)
    } catch (error: any) {
      setErrors({ submit: error.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <input
          type="email"
          name="email"
          placeholder="邮箱地址"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          data-testid="email"
        />
        {errors.email && (
          <span data-testid="email-error" className="error">
            {errors.email}
          </span>
        )}
      </div>
      
      <div>
        <input
          type="password"
          name="password"
          placeholder="密码"
          value={formData.password}
          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          data-testid="password"
        />
        {errors.password && (
          <span data-testid="password-error" className="error">
            {errors.password}
          </span>
        )}
      </div>
      
      {errors.submit && (
        <div data-testid="submit-error" className="error">
          {errors.submit}
        </div>
      )}
      
      <button type="submit" disabled={loading} data-testid="submit-button">
        {loading ? '登录中...' : '登录'}
      </button>
    </form>
  )
}

// 示例API服务
class AuthService {
  static async login(credentials: { email: string; password: string }) {
    const response = await fetch('/api/v1/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(credentials)
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || '登录失败')
    }

    return response.json()
  }
}

describe('错误场景测试工具示例', () => {
  beforeEach(() => {
    // 重置所有Mock
    vi.clearAllMocks()
    
    // 设置默认的fetch mock
    global.fetch = vi.fn()
  })

  describe('网络错误场景测试', () => {
    it('应该测试所有网络错误场景', withErrorScenarioTesting(async (helper) => {
      await helper.testNetworkErrorScenarios(
        async () => {
          return AuthService.login({
            email: 'test@example.com',
            password: 'password123'
          })
        },
        async (error) => {
          // 验证错误处理
          expect(error).toBeDefined()
          expect(error.message).toBeTruthy()
        }
      )
    }))

    it('应该正确处理特定网络错误', withErrorScenarioTesting(async (helper) => {
      // 模拟401未授权错误
      helper.mockAuthenticationError()
      
      try {
        await AuthService.login({
          email: 'test@example.com',
          password: 'wrongpassword'
        })
        expect(true).toBe(false) // 不应该到达这里
      } catch (error: any) {
        expect(error.message).toContain('未授权访问')
      }
    }))

    it('应该正确处理网络超时', withErrorScenarioTesting(async (helper) => {
      helper.mockNetworkTimeout(1000)
      
      try {
        await AuthService.login({
          email: 'test@example.com',
          password: 'password123'
        })
        expect(true).toBe(false)
      } catch (error: any) {
        expect(error.message).toContain('timeout')
      }
    }))
  })

  describe('表单验证错误场景测试', () => {
    it('应该测试表单验证错误', withErrorScenarioTesting(async (helper) => {
      const mockSubmit = vi.fn()
      const { container } = render(<LoginForm onSubmit={mockSubmit} />)
      
      await helper.testValidationErrorScenarios(container, [
        {
          fieldName: 'email',
          invalidValue: 'invalid-email',
          expectedErrorMessage: '请输入有效的邮箱地址',
          description: '邮箱格式验证'
        },
        {
          fieldName: 'password',
          invalidValue: '123',
          expectedErrorMessage: '密码长度至少6位',
          description: '密码长度验证'
        }
      ])
    }))

    it('应该正确显示必填字段错误', withErrorScenarioTesting(async (helper) => {
      const mockSubmit = vi.fn()
      render(<LoginForm onSubmit={mockSubmit} />)
      
      // 直接提交空表单
      const submitButton = screen.getByTestId('submit-button')
      fireEvent.click(submitButton)
      
      // 验证错误信息显示
      await waitFor(() => {
        expect(screen.getByTestId('email-error')).toHaveTextContent('请输入邮箱地址')
        expect(screen.getByTestId('password-error')).toHaveTextContent('请输入密码')
      })
    }))
  })

  describe('边界条件测试', () => {
    it('应该测试各种边界条件', withErrorScenarioTesting(async (helper) => {
      await helper.testBoundaryConditions(
        async (testData) => {
          // 测试数据处理函数
          const processData = (data: any) => {
            if (data === null || data === undefined) {
              return '默认值'
            }
            if (typeof data === 'string' && data.length === 0) {
              throw new Error('空字符串不允许')
            }
            if (Array.isArray(data) && data.length === 0) {
              return []
            }
            return data
          }
          
          return processData(testData)
        }
      )
    }))
  })

  describe('自定义错误场景测试', () => {
    it('应该执行自定义错误场景', withErrorScenarioTesting(async (helper) => {
      const errorScenario = helper.createErrorScenario(
        ErrorScenarioType.VALIDATION_ERROR,
        '测试自定义验证错误',
        async () => {
          // 设置场景
          console.log('设置错误场景')
        },
        async () => {
          // 触发错误
          throw new Error('自定义验证错误')
        },
        async () => {
          // 验证预期行为
          console.log('验证错误处理')
        }
      )
      
      await helper.executeErrorScenario(errorScenario)
    }))

    it('应该批量执行错误场景', withErrorScenarioTesting(async (helper) => {
      const scenarios = [
        helper.createErrorScenario(
          ErrorScenarioType.NETWORK_ERROR,
          '网络连接失败',
          async () => helper.mockNetworkDisconnection(),
          async () => AuthService.login({ email: 'test@test.com', password: '123456' }),
          async () => console.log('网络错误处理验证')
        ),
        helper.createErrorScenario(
          ErrorScenarioType.SERVER_ERROR,
          '服务器内部错误',
          async () => helper.mockServerError(500, '服务器错误'),
          async () => AuthService.login({ email: 'test@test.com', password: '123456' }),
          async () => console.log('服务器错误处理验证')
        )
      ]
      
      await helper.executeErrorScenarios(scenarios)
    }))
  })

  describe('并发错误场景测试', () => {
    it('应该测试并发错误处理', withErrorScenarioTesting(async (helper) => {
      const concurrentActions = [
        async () => {
          helper.mockServerError(500)
          return AuthService.login({ email: 'user1@test.com', password: '123456' })
        },
        async () => {
          helper.mockNetworkTimeout()
          return AuthService.login({ email: 'user2@test.com', password: '123456' })
        },
        async () => {
          helper.mockAuthenticationError()
          return AuthService.login({ email: 'user3@test.com', password: 'wrong' })
        }
      ]
      
      await helper.testConcurrentErrorScenarios(
        concurrentActions,
        async () => {
          console.log('并发错误处理验证')
        }
      )
    }))
  })

  describe('内存泄漏测试', () => {
    it('应该测试内存泄漏场景', withErrorScenarioTesting(async (helper) => {
      await helper.testMemoryLeakScenarios(
        () => {
          // 创建资源
          const element = document.createElement('div')
          element.innerHTML = '<span>测试内容</span>'
          document.body.appendChild(element)
          return element
        },
        (element) => {
          // 清理资源
          if (element.parentNode) {
            element.parentNode.removeChild(element)
          }
        },
        50 // 创建50个元素进行测试
      )
    }))
  })

  describe('错误恢复测试', () => {
    it('应该测试错误恢复机制', withErrorScenarioTesting(async (helper) => {
      let attemptCount = 0
      
      await helper.testErrorRecoveryScenarios(
        async () => {
          // 触发错误
          attemptCount++
          if (attemptCount === 1) {
            throw new Error('首次尝试失败')
          }
        },
        async () => {
          // 恢复操作
          console.log('执行恢复操作')
        },
        async () => {
          // 验证恢复
          expect(attemptCount).toBe(1)
        }
      )
    }))
  })

  describe('组件错误边界测试', () => {
    it('应该测试React错误边界', withErrorScenarioTesting(async (helper) => {
      // 创建会抛出错误的组件
      function ErrorComponent() {
        throw new Error('组件渲染错误')
      }
      
      // 创建错误边界组件
      class ErrorBoundary extends React.Component<
        { children: React.ReactNode },
        { hasError: boolean; error?: Error }
      > {
        constructor(props: any) {
          super(props)
          this.state = { hasError: false }
        }
        
        static getDerivedStateFromError(error: Error) {
          return { hasError: true, error }
        }
        
        render() {
          if (this.state.hasError) {
            return <div data-testid="error-boundary">出现错误: {this.state.error?.message}</div>
          }
          
          return this.props.children
        }
      }
      
      // 测试错误边界
      render(
        <ErrorBoundary>
          <ErrorComponent />
        </ErrorBoundary>
      )
      
      // 验证错误边界捕获错误
      expect(screen.getByTestId('error-boundary')).toHaveTextContent('出现错误: 组件渲染错误')
    }))
  })
})