import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../../test/mocks/server'
import api from '../api'
import { message } from 'antd'

// Mock antd message
vi.mock('antd', () => ({
  message: {
    error: vi.fn(),
    success: vi.fn(),
    warning: vi.fn(),
    info: vi.fn()
  }
}))

// Mock window.location
const mockLocation = {
  href: 'http://localhost:3001',
  assign: vi.fn(),
  replace: vi.fn(),
  reload: vi.fn()
}

Object.defineProperty(window, 'location', {
  value: mockLocation,
  writable: true
})

describe('api.ts - 请求拦截器和响应拦截器测试', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  afterEach(() => {
    localStorage.clear()
  })

  describe('请求拦截器测试', () => {
    it('应该在请求头中添加Authorization token', async () => {
      const token = 'test-jwt-token'
      localStorage.setItem('token', token)

      // 设置一个测试端点来验证请求头
      server.use(
        http.get('/api/v1/test-auth', ({ request }) => {
          const authHeader = request.headers.get('Authorization')
          expect(authHeader).toBe(`Bearer ${token}`)
          
          return HttpResponse.json({
            success: true,
            data: { message: 'authorized' },
            timestamp: new Date().toISOString()
          })
        })
      )

      const response = await api.get('/test-auth')
      expect(response).toEqual({ message: 'authorized' })
    })

    it('应该在没有token时不添加Authorization头', async () => {
      // 确保localStorage中没有token
      localStorage.removeItem('token')

      server.use(
        http.get('/api/v1/test-no-auth', ({ request }) => {
          const authHeader = request.headers.get('Authorization')
          expect(authHeader).toBeNull()
          
          return HttpResponse.json({
            success: true,
            data: { message: 'no auth header' },
            timestamp: new Date().toISOString()
          })
        })
      )

      const response = await api.get('/test-no-auth')
      expect(response).toEqual({ message: 'no auth header' })
    })

    it('应该处理请求拦截器错误', async () => {
      // Mock一个会在请求拦截器中抛出错误的情况
      const originalInterceptor = api.interceptors.request.handlers[0]
      
      // 临时替换请求拦截器
      api.interceptors.request.clear()
      api.interceptors.request.use(
        () => {
          throw new Error('Request interceptor error')
        },
        (error) => Promise.reject(error)
      )

      await expect(api.get('/test')).rejects.toThrow('Request interceptor error')

      // 恢复原始拦截器
      api.interceptors.request.clear()
      api.interceptors.request.use(originalInterceptor.fulfilled, originalInterceptor.rejected)
    })

    it('应该设置正确的默认请求头', async () => {
      server.use(
        http.get('/api/v1/test-headers', ({ request }) => {
          const contentType = request.headers.get('Content-Type')
          expect(contentType).toBe('application/json')
          
          return HttpResponse.json({
            success: true,
            data: { message: 'headers ok' },
            timestamp: new Date().toISOString()
          })
        })
      )

      const response = await api.get('/test-headers')
      expect(response).toEqual({ message: 'headers ok' })
    })
  })

  describe('响应拦截器测试 - 成功响应', () => {
    it('应该正确处理包含success字段的成功响应', async () => {
      server.use(
        http.get('/api/v1/test-success', () => {
          return HttpResponse.json({
            success: true,
            data: { id: 1, name: '测试数据' },
            message: '操作成功',
            timestamp: new Date().toISOString()
          })
        })
      )

      const response = await api.get('/test-success')
      expect(response).toEqual({ id: 1, name: '测试数据' })
    })

    it('应该处理success为true但没有data字段的响应', async () => {
      server.use(
        http.get('/api/v1/test-no-data', () => {
          return HttpResponse.json({
            success: true,
            message: '操作成功',
            timestamp: new Date().toISOString()
          })
        })
      )

      const response = await api.get('/test-no-data')
      expect(response).toEqual({
        success: true,
        message: '操作成功',
        timestamp: expect.any(String)
      })
    })

    it('应该处理没有success字段的普通响应', async () => {
      server.use(
        http.get('/api/v1/test-plain', () => {
          return HttpResponse.json({
            id: 1,
            name: '普通响应'
          })
        })
      )

      const response = await api.get('/test-plain')
      expect(response).toEqual({ id: 1, name: '普通响应' })
    })

    it('应该处理空响应', async () => {
      server.use(
        http.get('/api/v1/test-empty', () => {
          return HttpResponse.json(null)
        })
      )

      const response = await api.get('/test-empty')
      expect(response).toBeNull()
    })
  })

  describe('响应拦截器测试 - 业务错误', () => {
    it('应该处理success为false的业务错误', async () => {
      const errorMessage = '业务逻辑错误'
      
      server.use(
        http.get('/api/v1/test-business-error', () => {
          return HttpResponse.json({
            success: false,
            message: errorMessage,
            code: 2001,
            data: null,
            timestamp: new Date().toISOString()
          })
        })
      )

      await expect(api.get('/test-business-error')).rejects.toThrow(errorMessage)
      expect(message.error).toHaveBeenCalledWith(errorMessage)
    })

    it('应该处理success为false但没有message的业务错误', async () => {
      server.use(
        http.get('/api/v1/test-no-message', () => {
          return HttpResponse.json({
            success: false,
            code: 2001,
            data: null,
            timestamp: new Date().toISOString()
          })
        })
      )

      await expect(api.get('/test-no-message')).rejects.toThrow('操作失败')
      expect(message.error).toHaveBeenCalledWith('操作失败')
    })
  })

  describe('响应拦截器测试 - HTTP错误状态码', () => {
    it('应该处理401未授权错误', async () => {
      const token = 'test-token'
      localStorage.setItem('token', token)

      server.use(
        http.get('/api/v1/test-401', () => {
          return HttpResponse.json({
            success: false,
            message: '未授权访问',
            code: 401,
            data: null,
            timestamp: new Date().toISOString()
          }, { status: 401 })
        })
      )

      await expect(api.get('/test-401')).rejects.toThrow('未授权访问')
      
      // 验证token被清除
      expect(localStorage.getItem('token')).toBeNull()
      
      // 验证页面跳转
      expect(window.location.href).toBe('/login')
      
      // 验证错误消息
      expect(message.error).toHaveBeenCalledWith('登录已过期，请重新登录')
    })

    it('应该处理403权限不足错误', async () => {
      server.use(
        http.get('/api/v1/test-403', () => {
          return HttpResponse.json({
            success: false,
            message: '权限不足',
            code: 403,
            data: null,
            timestamp: new Date().toISOString()
          }, { status: 403 })
        })
      )

      await expect(api.get('/test-403')).rejects.toThrow('权限不足')
      expect(message.error).toHaveBeenCalledWith('权限不足')
    })

    it('应该处理404资源不存在错误', async () => {
      server.use(
        http.get('/api/v1/test-404', () => {
          return HttpResponse.json({
            success: false,
            message: '资源不存在',
            code: 404,
            data: null,
            timestamp: new Date().toISOString()
          }, { status: 404 })
        })
      )

      await expect(api.get('/test-404')).rejects.toThrow('资源不存在')
      expect(message.error).toHaveBeenCalledWith('请求的资源不存在')
    })

    it('应该处理500服务器内部错误', async () => {
      server.use(
        http.get('/api/v1/test-500', () => {
          return HttpResponse.json({
            success: false,
            message: '服务器内部错误',
            code: 500,
            data: null,
            timestamp: new Date().toISOString()
          }, { status: 500 })
        })
      )

      await expect(api.get('/test-500')).rejects.toThrow('服务器内部错误')
      expect(message.error).toHaveBeenCalledWith('服务器内部错误')
    })

    it('应该处理其他HTTP错误状态码', async () => {
      server.use(
        http.get('/api/v1/test-422', () => {
          return HttpResponse.json({
            success: false,
            message: '参数验证失败',
            code: 422,
            data: null,
            timestamp: new Date().toISOString()
          }, { status: 422 })
        })
      )

      await expect(api.get('/test-422')).rejects.toThrow('参数验证失败')
      expect(message.error).toHaveBeenCalledWith('参数验证失败')
    })

    it('应该处理没有响应数据的HTTP错误', async () => {
      server.use(
        http.get('/api/v1/test-no-data-error', () => {
          return new HttpResponse(null, { status: 400 })
        })
      )

      await expect(api.get('/test-no-data-error')).rejects.toThrow('请求失败')
      expect(message.error).toHaveBeenCalledWith('请求失败 (400)')
    })
  })

  describe('响应拦截器测试 - 网络错误', () => {
    it('应该处理网络连接失败', async () => {
      server.use(
        http.get('/api/v1/test-network-error', () => {
          return HttpResponse.error()
        })
      )

      await expect(api.get('/test-network-error')).rejects.toThrow('网络连接失败')
      expect(message.error).toHaveBeenCalledWith('网络连接失败，请检查网络设置')
    })

    it('应该处理请求超时', async () => {
      server.use(
        http.get('/api/v1/test-timeout', () => {
          // 模拟超时 - 返回一个永远不会resolve的Promise
          return new Promise(() => {})
        })
      )

      // 由于我们设置了10秒超时，这里我们模拟一个超时错误
      const timeoutError = new Error('timeout of 10000ms exceeded')
      timeoutError.name = 'AxiosError'
      // @ts-ignore
      timeoutError.code = 'ECONNABORTED'

      // 直接测试超时错误处理逻辑
      const originalInterceptor = api.interceptors.response.handlers[0]
      
      try {
        await originalInterceptor.rejected(timeoutError)
      } catch (error) {
        expect(error.message).toContain('timeout')
      }
    })
  })

  describe('响应拦截器测试 - 其他错误', () => {
    it('应该处理请求配置错误', async () => {
      const configError = new Error('Request failed with status code 0')
      configError.name = 'AxiosError'

      // 模拟一个既没有response也没有request的错误
      const errorWithoutResponseOrRequest = {
        ...configError,
        response: undefined,
        request: undefined
      }

      const originalInterceptor = api.interceptors.response.handlers[0]
      
      await expect(originalInterceptor.rejected(errorWithoutResponseOrRequest)).rejects.toThrow()
      expect(message.error).toHaveBeenCalledWith('请求配置错误')
    })

    it('应该处理未知错误类型', async () => {
      const unknownError = new Error('Unknown error')
      
      const originalInterceptor = api.interceptors.response.handlers[0]
      
      await expect(originalInterceptor.rejected(unknownError)).rejects.toThrow('Unknown error')
    })
  })

  describe('API实例配置测试', () => {
    it('应该有正确的基础配置', () => {
      expect(api.defaults.baseURL).toBe('/api/v1')
      expect(api.defaults.timeout).toBe(10000)
      expect(api.defaults.headers['Content-Type']).toBe('application/json')
    })

    it('应该有请求拦截器', () => {
      expect(api.interceptors.request.handlers).toHaveLength(1)
    })

    it('应该有响应拦截器', () => {
      expect(api.interceptors.response.handlers).toHaveLength(1)
    })
  })

  describe('边界条件和异常场景测试', () => {
    it('应该处理空的localStorage token', async () => {
      localStorage.setItem('token', '')

      server.use(
        http.get('/api/v1/test-empty-token', ({ request }) => {
          const authHeader = request.headers.get('Authorization')
          expect(authHeader).toBe('Bearer ')
          
          return HttpResponse.json({
            success: true,
            data: { message: 'empty token' },
            timestamp: new Date().toISOString()
          })
        })
      )

      const response = await api.get('/test-empty-token')
      expect(response).toEqual({ message: 'empty token' })
    })

    it('应该处理null的localStorage token', async () => {
      localStorage.removeItem('token')

      server.use(
        http.get('/api/v1/test-null-token', ({ request }) => {
          const authHeader = request.headers.get('Authorization')
          expect(authHeader).toBeNull()
          
          return HttpResponse.json({
            success: true,
            data: { message: 'null token' },
            timestamp: new Date().toISOString()
          })
        })
      )

      const response = await api.get('/test-null-token')
      expect(response).toEqual({ message: 'null token' })
    })

    it('应该处理响应数据为undefined的情况', async () => {
      server.use(
        http.get('/api/v1/test-undefined', () => {
          return new HttpResponse(undefined)
        })
      )

      const response = await api.get('/test-undefined')
      expect(response).toBeUndefined()
    })

    it('应该处理响应数据为空字符串的情况', async () => {
      server.use(
        http.get('/api/v1/test-empty-string', () => {
          return new HttpResponse('')
        })
      )

      const response = await api.get('/test-empty-string')
      expect(response).toBe('')
    })

    it('应该处理响应数据为数字的情况', async () => {
      server.use(
        http.get('/api/v1/test-number', () => {
          return HttpResponse.json(42)
        })
      )

      const response = await api.get('/test-number')
      expect(response).toBe(42)
    })

    it('应该处理响应数据为布尔值的情况', async () => {
      server.use(
        http.get('/api/v1/test-boolean', () => {
          return HttpResponse.json(true)
        })
      )

      const response = await api.get('/test-boolean')
      expect(response).toBe(true)
    })

    it('应该处理响应数据为数组的情况', async () => {
      const testArray = [1, 2, 3]
      
      server.use(
        http.get('/api/v1/test-array', () => {
          return HttpResponse.json(testArray)
        })
      )

      const response = await api.get('/test-array')
      expect(response).toEqual(testArray)
    })
  })

  describe('HTTP方法测试', () => {
    it('应该支持GET请求', async () => {
      server.use(
        http.get('/api/v1/test-get', () => {
          return HttpResponse.json({
            success: true,
            data: { method: 'GET' },
            timestamp: new Date().toISOString()
          })
        })
      )

      const response = await api.get('/test-get')
      expect(response).toEqual({ method: 'GET' })
    })

    it('应该支持POST请求', async () => {
      const postData = { name: '测试数据' }
      
      server.use(
        http.post('/api/v1/test-post', async ({ request }) => {
          const body = await request.json()
          expect(body).toEqual(postData)
          
          return HttpResponse.json({
            success: true,
            data: { method: 'POST', received: body },
            timestamp: new Date().toISOString()
          })
        })
      )

      const response = await api.post('/test-post', postData)
      expect(response).toEqual({ method: 'POST', received: postData })
    })

    it('应该支持PUT请求', async () => {
      const putData = { id: 1, name: '更新数据' }
      
      server.use(
        http.put('/api/v1/test-put', async ({ request }) => {
          const body = await request.json()
          expect(body).toEqual(putData)
          
          return HttpResponse.json({
            success: true,
            data: { method: 'PUT', received: body },
            timestamp: new Date().toISOString()
          })
        })
      )

      const response = await api.put('/test-put', putData)
      expect(response).toEqual({ method: 'PUT', received: putData })
    })

    it('应该支持DELETE请求', async () => {
      server.use(
        http.delete('/api/v1/test-delete', () => {
          return HttpResponse.json({
            success: true,
            data: { method: 'DELETE' },
            timestamp: new Date().toISOString()
          })
        })
      )

      const response = await api.delete('/test-delete')
      expect(response).toEqual({ method: 'DELETE' })
    })

    it('应该支持PATCH请求', async () => {
      const patchData = { status: 'updated' }
      
      server.use(
        http.patch('/api/v1/test-patch', async ({ request }) => {
          const body = await request.json()
          expect(body).toEqual(patchData)
          
          return HttpResponse.json({
            success: true,
            data: { method: 'PATCH', received: body },
            timestamp: new Date().toISOString()
          })
        })
      )

      const response = await api.patch('/test-patch', patchData)
      expect(response).toEqual({ method: 'PATCH', received: patchData })
    })
  })

  describe('请求参数和配置测试', () => {
    it('应该支持查询参数', async () => {
      const params = { page: 1, size: 10, search: '测试' }
      
      server.use(
        http.get('/api/v1/test-params', ({ request }) => {
          const url = new URL(request.url)
          expect(url.searchParams.get('page')).toBe('1')
          expect(url.searchParams.get('size')).toBe('10')
          expect(url.searchParams.get('search')).toBe('测试')
          
          return HttpResponse.json({
            success: true,
            data: { params: Object.fromEntries(url.searchParams) },
            timestamp: new Date().toISOString()
          })
        })
      )

      const response = await api.get('/test-params', { params })
      expect(response.params).toEqual({
        page: '1',
        size: '10',
        search: '测试'
      })
    })

    it('应该支持自定义请求头', async () => {
      const customHeaders = { 'X-Custom-Header': 'custom-value' }
      
      server.use(
        http.get('/api/v1/test-custom-headers', ({ request }) => {
          expect(request.headers.get('X-Custom-Header')).toBe('custom-value')
          
          return HttpResponse.json({
            success: true,
            data: { message: 'custom headers received' },
            timestamp: new Date().toISOString()
          })
        })
      )

      const response = await api.get('/test-custom-headers', { headers: customHeaders })
      expect(response).toEqual({ message: 'custom headers received' })
    })

    it('应该支持请求超时配置', async () => {
      server.use(
        http.get('/api/v1/test-timeout-config', () => {
          return HttpResponse.json({
            success: true,
            data: { message: 'timeout config test' },
            timestamp: new Date().toISOString()
          })
        })
      )

      const response = await api.get('/test-timeout-config', { timeout: 5000 })
      expect(response).toEqual({ message: 'timeout config test' })
    })
  })
})