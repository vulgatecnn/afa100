import axios from 'axios'

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
      const message = data?.message || `请求失败 (${status})`
      throw new Error(message)
    } else if (error.request) {
      throw new Error('网络错误，请检查网络连接')
    } else {
      throw new Error(error.message || '未知错误')
    }
  }
)

export default apiClient