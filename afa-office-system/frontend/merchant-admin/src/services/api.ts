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
  async (error) => {
    // 处理HTTP错误状态码
    if (error.response) {
      const { status, data } = error.response
      
      // 尝试解析错误响应中的JSON数据
      let errorMessage = '请求失败'
      if (data instanceof Blob) {
        try {
          const text = await data.text()
          // 如果Blob包含内容，尝试解析为JSON
          if (text) {
            const jsonData = JSON.parse(text)
            errorMessage = jsonData.message || `请求失败 (${status})`
          } else {
            // 如果Blob为空，使用默认错误消息
            errorMessage = `请求失败 (${status})`
          }
        } catch (e) {
          // 如果无法解析为JSON，使用默认错误消息
          errorMessage = `请求失败 (${status})`
        }
      } else if (typeof data === 'object' && data !== null && data.message) {
        errorMessage = data.message
      } else if (typeof data === 'string') {
        try {
          const jsonData = JSON.parse(data)
          errorMessage = jsonData.message || `请求失败 (${status})`
        } catch (e) {
          errorMessage = data || `请求失败 (${status})`
        }
      } else {
        errorMessage = `请求失败 (${status})`
      }
      
      switch (status) {
        case 401:
          // 未授权，清除token并跳转到登录页
          localStorage.removeItem('token')
          window.location.href = '/login'
          message.error('登录已过期，请重新登录')
          // 对于401错误，返回一个永远不会resolve的Promise来模拟页面跳转
          return new Promise(() => {})
        case 403:
          message.error('权限不足')
          break
        case 404:
          message.error('请求的资源不存在')
          break
        case 500:
          // 对于500错误，如果没有具体的错误消息，显示默认消息
          message.error(errorMessage === '请求失败 (500)' ? '服务器内部错误' : errorMessage)
          break
        default:
          message.error(errorMessage)
      }
      
      return Promise.reject(new Error(errorMessage))
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