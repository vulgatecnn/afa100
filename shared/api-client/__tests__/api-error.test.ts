/**
 * API 错误类测试
 */

import { describe, it, expect } from 'vitest'
import { ApiError } from '../api-error'
import { ApiErrorType } from '../types'

describe('ApiError', () => {
  describe('构造函数', () => {
    it('应该创建基本的 API 错误', () => {
      const error = new ApiError({
        type: ApiErrorType.VALIDATION_ERROR,
        message: '参数验证失败',
        status: 400
      })

      expect(error.name).toBe('ApiError')
      expect(error.type).toBe(ApiErrorType.VALIDATION_ERROR)
      expect(error.message).toBe('参数验证失败')
      expect(error.status).toBe(400)
      expect(error.retryable).toBe(false)
    })

    it('应该设置可重试标志', () => {
      const error = new ApiError({
        type: ApiErrorType.NETWORK_ERROR,
        message: '网络错误',
        retryable: true
      })

      expect(error.retryable).toBe(true)
      expect(error.isRetryable()).toBe(true)
    })
  })

  describe('静态工厂方法', () => {
    it('应该创建网络错误', () => {
      const error = ApiError.networkError()

      expect(error.type).toBe(ApiErrorType.NETWORK_ERROR)
      expect(error.message).toBe('网络连接失败，请检查网络设置')
      expect(error.retryable).toBe(true)
    })

    it('应该创建超时错误', () => {
      const error = ApiError.timeoutError()

      expect(error.type).toBe(ApiErrorType.TIMEOUT_ERROR)
      expect(error.message).toBe('请求超时，请稍后重试')
      expect(error.retryable).toBe(true)
    })

    it('应该创建认证错误', () => {
      const error = ApiError.authError()

      expect(error.type).toBe(ApiErrorType.AUTH_ERROR)
      expect(error.status).toBe(401)
      expect(error.message).toBe('登录已过期，请重新登录')
      expect(error.retryable).toBe(false)
    })

    it('应该创建权限错误', () => {
      const error = ApiError.permissionError()

      expect(error.type).toBe(ApiErrorType.PERMISSION_ERROR)
      expect(error.status).toBe(403)
      expect(error.message).toBe('权限不足')
      expect(error.retryable).toBe(false)
    })

    it('应该创建验证错误', () => {
      const error = ApiError.validationError('用户名不能为空')

      expect(error.type).toBe(ApiErrorType.VALIDATION_ERROR)
      expect(error.status).toBe(400)
      expect(error.message).toBe('用户名不能为空')
      expect(error.retryable).toBe(false)
    })

    it('应该创建服务器错误', () => {
      const error = ApiError.serverError('内部服务器错误', 500)

      expect(error.type).toBe(ApiErrorType.SERVER_ERROR)
      expect(error.status).toBe(500)
      expect(error.message).toBe('内部服务器错误')
      expect(error.retryable).toBe(true) // 5xx 错误可以重试
    })
  })

  describe('fromResponse', () => {
    it('应该从 400 响应创建验证错误', () => {
      const response = {
        status: 400,
        data: { message: '请求参数无效' }
      }

      const error = ApiError.fromResponse(response)

      expect(error.type).toBe(ApiErrorType.VALIDATION_ERROR)
      expect(error.status).toBe(400)
      expect(error.message).toBe('请求参数无效')
    })

    it('应该从 401 响应创建认证错误', () => {
      const response = {
        status: 401,
        data: { message: 'Token 已过期' }
      }

      const error = ApiError.fromResponse(response)

      expect(error.type).toBe(ApiErrorType.AUTH_ERROR)
      expect(error.status).toBe(401)
      expect(error.message).toBe('Token 已过期')
    })

    it('应该从 403 响应创建权限错误', () => {
      const response = {
        status: 403,
        data: { message: '无访问权限' }
      }

      const error = ApiError.fromResponse(response)

      expect(error.type).toBe(ApiErrorType.PERMISSION_ERROR)
      expect(error.status).toBe(403)
      expect(error.message).toBe('无访问权限')
    })

    it('应该从 500 响应创建服务器错误', () => {
      const response = {
        status: 500,
        data: { message: '数据库连接失败' }
      }

      const error = ApiError.fromResponse(response)

      expect(error.type).toBe(ApiErrorType.SERVER_ERROR)
      expect(error.status).toBe(500)
      expect(error.message).toBe('数据库连接失败')
    })

    it('应该处理字符串响应数据', () => {
      const response = {
        status: 400,
        data: '请求格式错误'
      }

      const error = ApiError.fromResponse(response)

      expect(error.message).toBe('请求格式错误')
    })
  })

  describe('getUserMessage', () => {
    it('应该返回用户友好的错误消息', () => {
      const networkError = ApiError.networkError()
      expect(networkError.getUserMessage()).toBe('网络连接失败，请检查网络设置')

      const authError = ApiError.authError()
      expect(authError.getUserMessage()).toBe('登录已过期，请重新登录')

      const validationError = ApiError.validationError('自定义验证错误')
      expect(validationError.getUserMessage()).toBe('自定义验证错误')
    })
  })
})