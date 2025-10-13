/**
 * API 错误类
 * 提供统一的错误处理和错误信息
 */

import { ApiErrorType, ApiErrorDetails } from './types'

export class ApiError extends Error {
    public readonly type: ApiErrorType
    public readonly status?: number
    public readonly code?: string | number
    public readonly retryable: boolean
    public readonly originalError?: any

    constructor(details: ApiErrorDetails) {
        super(details.message)
        this.name = 'ApiError'
        this.type = details.type
        this.status = details.status
        this.code = details.code
        this.retryable = details.retryable || false
        this.originalError = details.originalError

        // 确保错误堆栈正确
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, ApiError)
        }
    }

    /**
     * 创建网络错误
     */
    static networkError(originalError?: any): ApiError {
        return new ApiError({
            type: ApiErrorType.NETWORK_ERROR,
            message: '网络连接失败，请检查网络设置',
            originalError,
            retryable: true
        })
    }

    /**
     * 创建超时错误
     */
    static timeoutError(originalError?: any): ApiError {
        return new ApiError({
            type: ApiErrorType.TIMEOUT_ERROR,
            message: '请求超时，请稍后重试',
            originalError,
            retryable: true
        })
    }

    /**
     * 创建认证错误
     */
    static authError(message = '登录已过期，请重新登录', originalError?: any): ApiError {
        return new ApiError({
            type: ApiErrorType.AUTH_ERROR,
            status: 401,
            message,
            originalError,
            retryable: false
        })
    }

    /**
     * 创建权限错误
     */
    static permissionError(message = '权限不足', originalError?: any): ApiError {
        return new ApiError({
            type: ApiErrorType.PERMISSION_ERROR,
            status: 403,
            message,
            originalError,
            retryable: false
        })
    }

    /**
     * 创建验证错误
     */
    static validationError(message: string, originalError?: any): ApiError {
        return new ApiError({
            type: ApiErrorType.VALIDATION_ERROR,
            status: 400,
            message,
            originalError,
            retryable: false
        })
    }

    /**
     * 创建服务器错误
     */
    static serverError(message = '服务器内部错误', status = 500, originalError?: any): ApiError {
        return new ApiError({
            type: ApiErrorType.SERVER_ERROR,
            status,
            message,
            originalError,
            retryable: status >= 500 // 5xx 错误可以重试
        })
    }

    /**
     * 从 HTTP 响应创建错误
     */
    static fromResponse(response: any): ApiError {
        const status = response.status || 500
        const data = response.data || {}

        let message = '请求失败'
        if (typeof data === 'string') {
            message = data
        } else if (data.message) {
            message = data.message
        } else if (data.error) {
            message = data.error
        }

        switch (status) {
            case 400:
                return ApiError.validationError(message, response)
            case 401:
                return ApiError.authError(message, response)
            case 403:
                return ApiError.permissionError(message, response)
            case 404:
                return new ApiError({
                    type: ApiErrorType.VALIDATION_ERROR,
                    status: 404,
                    message: '请求的资源不存在',
                    originalError: response,
                    retryable: false
                })
            default:
                return ApiError.serverError(message, status, response)
        }
    }

    /**
     * 检查错误是否可以重试
     */
    isRetryable(): boolean {
        return this.retryable
    }

    /**
     * 获取用户友好的错误消息
     */
    getUserMessage(): string {
        switch (this.type) {
            case ApiErrorType.NETWORK_ERROR:
                return '网络连接失败，请检查网络设置'
            case ApiErrorType.TIMEOUT_ERROR:
                return '请求超时，请稍后重试'
            case ApiErrorType.AUTH_ERROR:
                return '登录已过期，请重新登录'
            case ApiErrorType.PERMISSION_ERROR:
                return '权限不足，无法执行此操作'
            case ApiErrorType.VALIDATION_ERROR:
                return this.message || '请求参数有误'
            case ApiErrorType.SERVER_ERROR:
                return '服务器暂时无法处理请求，请稍后重试'
            default:
                return this.message || '未知错误'
        }
    }
}