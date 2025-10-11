import axios, { AxiosInstance, AxiosResponse } from 'axios'
import { message } from 'antd'

// 创建axios实例
const api: AxiosInstance = axios.create({
  baseURL: '/api/v1',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// 请求拦截器 - 添加认证token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// 响应拦截器 - 统一处理错误
api.interceptors.response.use(
  (response: AxiosResponse) => {
    // 如果响应包含success字段，检查业务状态
    if (response.data && typeof response.data.success === 'boolean') {
      if (!response.data.success) {
        const errorMessage = response.data.message || '操作失败'
        message.error(errorMessage)
        return Promise.reject(new Error(errorMessage))
      }
      // 返回实际数据
      return response.data.data || response.data
    }
    return response.data
  },
  (error) => {
    // 处理HTTP错误状态码
    if (error.response) {
      const { status, data } = error.response
      
      switch (status) {
        case 401:
          // 未授权，清除token并跳转到登录页
          localStorage.removeItem('token')
          window.location.href = '/login'
          message.error('登录已过期，请重新登录')
          break
        case 403:
          message.error('权限不足')
          break
        case 404:
          message.error('请求的资源不存在')
          break
        case 500:
          message.error('服务器内部错误')
          break
        default:
          const errorMessage = data?.message || `请求失败 (${status})`
          message.error(errorMessage)
      }
      
      return Promise.reject(new Error(data?.message || '请求失败'))
    } else if (error.request) {
      // 网络错误
      message.error('网络连接失败，请检查网络设置')
      return Promise.reject(new Error('网络连接失败'))
    } else {
      // 其他错误
      message.error('请求配置错误')
      return Promise.reject(error)
    }
  }
)

export default api