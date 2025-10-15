import axios from 'axios'
import { message } from 'antd'

const apiClient = axios.create({
  baseURL: import.meta.env.VITEST ? '/api/v1' : (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5100/api/v1'),
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// 请求拦截器
apiClient.interceptors.request.use(
  (config) => {
    // 添加认证token
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

// 响应拦截器
apiClient.interceptors.response.use(
  (response) => {
    // 统一处理响应数据
    if (response.data && response.data.success === false) {
      throw new Error(response.data.message || '请求失败')
    }
    return response.data.success ? response.data : response
  },
  (error) => {
    // 统一处理错误
    if (error.response) {
      const { status, data } = error.response
      
      // 处理不同的HTTP状态码
      switch (status) {
        case 401:
          message.error('登录已过期，请重新登录')
          localStorage.removeItem('token')
          window.location.href = '/login'
          // 返回一个永远不会resolve的Promise，防止后续代码执行
          return new Promise(() => {})
        case 403:
          message.error('权限不足')
          throw new Error(data?.message || '请求失败 (403)')
        case 404:
          message.error('请求的资源不存在')
          throw new Error(data?.message || '请求失败 (404)')
        case 500:
          message.error('服务器内部错误')
          throw new Error(data?.message || '请求失败 (500)')
        default:
          const errorMessage = data?.message || `请求失败 (${status})`
          throw new Error(errorMessage)
      }
    } else if (error.request) {
      message.error('网络连接失败，请检查网络设置')
      throw new Error('网络错误，请检查网络连接')
    } else {
      throw new Error(error.message || '未知错误')
    }
  }
)

export default apiClient
