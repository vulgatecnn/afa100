/**
 * API 服务
 * 集成错误处理和用户反馈的 API 客户端
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios'

// API 配置
const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || '/api/v1'

// 创建 axios 实例
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// 请求拦截器
apiClient.interceptors.request.use(
  (config: any) => {
    // 添加认证 token
    const token = localStorage.getItem('token')
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error: any) => {
    return Promise.reject(error)
  }
)

// 响应拦截器
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    return response
  },
  (error: any) => {
    // 处理认证错误
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    
    return Promise.reject(error)
  }
)

export default apiClient

// 导出常用的 HTTP 方法
export const api = {
  get: <T = any>(url: string, config?: AxiosRequestConfig) => 
    apiClient.get<T>(url, config),
  
  post: <T = any>(url: string, data?: any, config?: AxiosRequestConfig) => 
    apiClient.post<T>(url, data, config),
  
  put: <T = any>(url: string, data?: any, config?: AxiosRequestConfig) => 
    apiClient.put<T>(url, data, config),
  
  patch: <T = any>(url: string, data?: any, config?: AxiosRequestConfig) => 
    apiClient.patch<T>(url, data, config),
  
  delete: <T = any>(url: string, config?: AxiosRequestConfig) => 
    apiClient.delete<T>(url, config)
}

// 文件上传
export const uploadFile = async (
  file: File,
  onProgress?: (progressEvent: any) => void
): Promise<AxiosResponse> => {
  const formData = new FormData()
  formData.append('file', file)

  return apiClient.post('/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    },
    onUploadProgress: onProgress
  })
}

// 批量上传
export const uploadFiles = async (
  files: File[],
  onProgress?: (progressEvent: any) => void
): Promise<AxiosResponse[]> => {
  const uploadPromises = files.map(file => uploadFile(file, onProgress))
  return Promise.all(uploadPromises)
}

// 下载文件
export const downloadFile = async (
  url: string,
  filename?: string
): Promise<void> => {
  const response = await apiClient.get(url, {
    responseType: 'blob'
  })

  const blob = new Blob([response.data])
  const downloadUrl = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = downloadUrl
  link.download = filename || 'download'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.URL.revokeObjectURL(downloadUrl)
}

// 取消请求的 token
export const CancelToken = axios.CancelToken
export const isCancel = axios.isCancel