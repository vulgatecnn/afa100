import { describe, it, expect, beforeEach, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../../test/mocks/server'

// Mock antd message
vi.mock('antd', () => ({
  message: {
    error: vi.fn(),
    success: vi.fn(),
    warning: vi.fn(),
    info: vi.fn()
  }
}))

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
}
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage
})

// Mock window.location
Object.defineProperty(window, 'location', {
  value: {
    href: 'http://localhost:3001',
    assign: vi.fn(),
    replace: vi.fn(),
    reload: vi.fn()
  },
  writable: true
})

describe('API 服务集成测试', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockLocalStorage.getItem.mockReturnValue(null)
  })

  describe('基础 HTTP 请求', () => {
    it('应该能够发送 GET 请求', async () => {
      server.use(
        http.get('/api/v1/test-get', () => {
          return HttpResponse.json({
            success: true,
            data: { message: 'GET success' },
            timestamp: new Date().toISOString()
          })
        })
      )

      const response = await fetch('/api/v1/test-get')
      const data = await response.json()
      
      expect(response.ok).toBe(true)
      expect(data.success).toBe(true)
      expect(data.data.message).toBe('GET success')
    })

    it('应该能够发送 POST 请求', async () => {
      const testData = { name: 'test', value: 123 }
      
      server.use(
        http.post('/api/v1/test-post', async ({ request }) => {
          const body = await request.json()
          return HttpResponse.json({
            success: true,
            data: { received: body },
            timestamp: new Date().toISOString()
          })
        })
      )

      const response = await fetch('/api/v1/test-post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testData)
      })
      const data = await response.json()
      
      expect(response.ok).toBe(true)
      expect(data.success).toBe(true)
      expect(data.data.received).toEqual(testData)
    })
  })

  describe('错误处理', () => {
    it('应该处理 404 错误', async () => {
      server.use(
        http.get('/api/v1/not-found', () => {
          return HttpResponse.json(
            {
              success: false,
              code: 404,
              message: '资源不存在',
              data: null,
              timestamp: new Date().toISOString()
            },
            { status: 404 }
          )
        })
      )

      const response = await fetch('/api/v1/not-found')
      const data = await response.json()
      
      expect(response.status).toBe(404)
      expect(data.success).toBe(false)
      expect(data.message).toBe('资源不存在')
    })

    it('应该处理 500 服务器错误', async () => {
      server.use(
        http.get('/api/v1/server-error', () => {
          return HttpResponse.json(
            {
              success: false,
              code: 500,
              message: '服务器内部错误',
              data: null,
              timestamp: new Date().toISOString()
            },
            { status: 500 }
          )
        })
      )

      const response = await fetch('/api/v1/server-error')
      const data = await response.json()
      
      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.message).toBe('服务器内部错误')
    })
  })

  describe('认证相关', () => {
    it('应该处理 401 未授权错误', async () => {
      server.use(
        http.get('/api/v1/protected', () => {
          return HttpResponse.json(
            {
              success: false,
              code: 401,
              message: '未授权访问',
              data: null,
              timestamp: new Date().toISOString()
            },
            { status: 401 }
          )
        })
      )

      const response = await fetch('/api/v1/protected')
      const data = await response.json()
      
      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.message).toBe('未授权访问')
    })

    it('应该在请求中包含认证头', async () => {
      const token = 'test-jwt-token'
      mockLocalStorage.getItem.mockReturnValue(token)

      server.use(
        http.get('/api/v1/auth-test', ({ request }) => {
          const authHeader = request.headers.get('Authorization')
          return HttpResponse.json({
            success: true,
            data: { 
              hasAuth: !!authHeader,
              authHeader: authHeader 
            },
            timestamp: new Date().toISOString()
          })
        })
      )

      const response = await fetch('/api/v1/auth-test', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      const data = await response.json()
      
      expect(response.ok).toBe(true)
      expect(data.data.hasAuth).toBe(true)
      expect(data.data.authHeader).toBe(`Bearer ${token}`)
    })
  })

  describe('业务逻辑响应', () => {
    it('应该处理成功的业务响应', async () => {
      server.use(
        http.get('/api/v1/business-success', () => {
          return HttpResponse.json({
            success: true,
            data: { id: 1, name: '测试数据' },
            message: '操作成功',
            timestamp: new Date().toISOString()
          })
        })
      )

      const response = await fetch('/api/v1/business-success')
      const data = await response.json()
      
      expect(response.ok).toBe(true)
      expect(data.success).toBe(true)
      expect(data.data).toEqual({ id: 1, name: '测试数据' })
      expect(data.message).toBe('操作成功')
    })

    it('应该处理业务逻辑错误', async () => {
      server.use(
        http.post('/api/v1/business-error', () => {
          return HttpResponse.json({
            success: false,
            code: 400,
            message: '参数验证失败',
            data: null,
            timestamp: new Date().toISOString()
          })
        })
      )

      const response = await fetch('/api/v1/business-error', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invalid: 'data' })
      })
      const data = await response.json()
      
      expect(data.success).toBe(false)
      expect(data.message).toBe('参数验证失败')
    })
  })

  describe('数据格式处理', () => {
    it('应该处理空响应', async () => {
      server.use(
        http.get('/api/v1/empty', () => {
          return HttpResponse.json(null)
        })
      )

      const response = await fetch('/api/v1/empty')
      const data = await response.json()
      
      expect(response.ok).toBe(true)
      expect(data).toBeNull()
    })

    it('应该处理数组响应', async () => {
      const testArray = [1, 2, 3, 4, 5]
      
      server.use(
        http.get('/api/v1/array', () => {
          return HttpResponse.json({
            success: true,
            data: testArray,
            timestamp: new Date().toISOString()
          })
        })
      )

      const response = await fetch('/api/v1/array')
      const data = await response.json()
      
      expect(response.ok).toBe(true)
      expect(data.success).toBe(true)
      expect(data.data).toEqual(testArray)
    })

    it('应该处理字符串响应', async () => {
      server.use(
        http.get('/api/v1/string', () => {
          return HttpResponse.json({
            success: true,
            data: 'Hello World',
            timestamp: new Date().toISOString()
          })
        })
      )

      const response = await fetch('/api/v1/string')
      const data = await response.json()
      
      expect(response.ok).toBe(true)
      expect(data.success).toBe(true)
      expect(data.data).toBe('Hello World')
    })
  })
})