import { api } from './api'

export interface AccessRecord {
  id: number
  userId: number
  userName: string
  userType: 'employee' | 'visitor'
  merchantName: string
  deviceId: string
  deviceType: string
  direction: 'in' | 'out'
  result: 'success' | 'failed'
  failReason?: string
  location: {
    projectName: string
    venueName: string
    floorName: string
  }
  timestamp: string
}

export interface AccessRecordsParams {
  page?: number
  pageSize?: number
  search?: string
  userType?: 'employee' | 'visitor'
  result?: 'success' | 'failed'
  direction?: 'in' | 'out'
  startDate?: string
  endDate?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface AccessRecordsResponse {
  records: AccessRecord[]
  total: number
  page: number
  pageSize: number
}

export interface ExportParams {
  format: 'csv' | 'excel' | 'pdf'
  filters?: AccessRecordsParams
}

class AccessService {
  /**
   * 获取通行记录列表
   */
  async getAccessRecords(params: AccessRecordsParams = {}): Promise<AccessRecordsResponse> {
    const response = await api.get('/tenant/access-records', { params })
    return response.data
  }

  /**
   * 获取通行记录详情
   */
  async getAccessRecord(id: number): Promise<AccessRecord> {
    const response = await api.get(`/tenant/access-records/${id}`)
    return response.data
  }

  /**
   * 导出通行记录
   */
  async exportAccessRecords(params: ExportParams): Promise<Blob> {
    const response = await api.post('/tenant/access-records/export', params, {
      responseType: 'blob'
    })
    return response.data
  }

  /**
   * 获取通行统计数据
   */
  async getAccessStatistics(params: {
    startDate?: string
    endDate?: string
    groupBy?: 'day' | 'week' | 'month'
  } = {}): Promise<{
    totalRecords: number
    successRate: number
    dailyStats: Array<{
      date: string
      total: number
      success: number
      failed: number
    }>
  }> {
    const response = await api.get('/tenant/access-records/statistics', { params })
    return response.data
  }

  /**
   * 获取实时通行状态
   */
  async getRealtimeStatus(): Promise<{
    onlineDevices: number
    totalDevices: number
    currentVisitors: number
    todayRecords: number
  }> {
    const response = await api.get('/tenant/access-records/realtime')
    return response.data
  }
}

export const accessService = new AccessService()