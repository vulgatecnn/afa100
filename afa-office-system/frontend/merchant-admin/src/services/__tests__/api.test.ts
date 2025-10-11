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
  _href: 'http://localhost:3002',
  assign: vi.fn(),
  replace: vi.fn(),
  reload: vi.fn(),
  set href(url) {
    // 在测试环境中模拟页面跳转，处理相对URL
    if (url.startsWith('/')) {
      this._href = 'http://localhost:3002' + url
    } else {
      this._href = url
    }
  },
  get href() {
    return this._href || 'http://localhost:3002'
  }
}

Object.defineProperty(window, 'location', {
  value: mockLocation,
  writable: true
})

describe('merchant-admin api.ts - 请求拦截器和响应拦截器测试', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  afterEach(() => {
    localStorage.clear()
  })

  describe('请求拦截器测试', () => {
    it('应该在请求头中添加Authorization token', async () => {
      const token = 'merchant-jwt-token'
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
  })

  describe('响应拦截器测试 - HTTP错误状态码', () => {
    it('应该处理401未授权错误', async () => {
      const token = 'test-token'
      localStorage.setItem('token', token)

      server.use(
        http.get('/api/v1/test-401', () => {
          return new HttpResponse(null, { status: 401 })
        })
      )

      // 创建一个500ms后超时的Promise来模拟401错误的行为
      const apiCall = api.get('/test-401')
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('TIMEOUT')), 500)
      })

      // 等待其中一个Promise完成
      await Promise.race([apiCall, timeoutPromise]).catch((error) => {
        // 我们期望API调用永远不会resolve，所以会超时
        expect(error.message).toBe('TIMEOUT')
      })
      
      // 验证token被清除
      expect(localStorage.getItem('token')).toBeNull()
      
      // 验证页面跳转
      expect(window.location.href).toBe('http://localhost:3002/login')
      
      // 验证错误消息
      expect(message.error).toHaveBeenCalledWith('登录已过期，请重新登录')
    })

    it('应该处理403权限不足错误', async () => {
      server.use(
        http.get('/api/v1/test-403', () => {
          return new HttpResponse(null, { status: 403 })
        })
      )

      await expect(api.get('/test-403')).rejects.toThrow('请求失败')
      expect(message.error).toHaveBeenCalledWith('权限不足')
    })

    it('应该处理404资源不存在错误', async () => {
      server.use(
        http.get('/api/v1/test-404', () => {
          return new HttpResponse(null, { status: 404 })
        })
      )

      await expect(api.get('/test-404')).rejects.toThrow('请求失败')
      expect(message.error).toHaveBeenCalledWith('请求的资源不存在')
    })

    it('应该处理500服务器内部错误', async () => {
      server.use(
        http.get('/api/v1/test-500', () => {
          return new HttpResponse(null, { status: 500 })
        })
      )

      await expect(api.get('/test-500')).rejects.toThrow('请求失败')
      expect(message.error).toHaveBeenCalledWith('服务器内部错误')
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
  })

  describe('API实例配置测试', () => {
    it('应该有正确的基础配置', () => {
      expect(api.defaults.baseURL).toBe('/api/v1')
      expect(api.defaults.timeout).toBe(10000)
      expect(api.defaults.headers['Content-Type']).toBe('application/json')
    })

    it('应该有请求拦截器', () => {
      expect(api.interceptors.request).toBeDefined()
    })

    it('应该有响应拦截器', () => {
      expect(api.interceptors.response).toBeDefined()
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
})