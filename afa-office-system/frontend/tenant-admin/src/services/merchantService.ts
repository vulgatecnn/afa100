import { api } from './api'

export interface Merchant {
  id: number
  name: string
  code: string
  contact: string
  phone: string
  email: string
  address: string
  status: 'active' | 'inactive'
  permissions: string[]
  createdAt: string
  updatedAt: string
}

export interface CreateMerchantData {
  name: string
  code: string
  contact: string
  phone: string
  email: string
  address: string
  permissions: string[]
}

export interface UpdateMerchantData extends Partial<CreateMerchantData> {
  status?: 'active' | 'inactive'
}

export interface MerchantListParams {
  page?: number
  pageSize?: number
  search?: string
  status?: 'active' | 'inactive'
}

export interface MerchantListResponse {
  merchants: Merchant[]
  total: number
  page: number
  pageSize: number
}

class MerchantService {
  /**
   * 获取商户列表
   */
  async getMerchants(params: MerchantListParams = {}): Promise<MerchantListResponse> {
    const response = await api.get('/tenant/merchants', { params })
    return response.data
  }

  /**
   * 获取商户详情
   */
  async getMerchant(id: number): Promise<Merchant> {
    const response = await api.get(`/tenant/merchants/${id}`)
    return response.data
  }

  /**
   * 创建商户
   */
  async createMerchant(data: CreateMerchantData): Promise<Merchant> {
    const response = await api.post('/tenant/merchants', data)
    return response.data
  }

  /**
   * 更新商户
   */
  async updateMerchant(id: number, data: UpdateMerchantData): Promise<Merchant> {
    const response = await api.put(`/tenant/merchants/${id}`, data)
    return response.data
  }

  /**
   * 删除商户
   */
  async deleteMerchant(id: number): Promise<void> {
    await api.delete(`/tenant/merchants/${id}`)
  }

  /**
   * 分配权限给商户
   */
  async assignPermissions(id: number, permissions: string[]): Promise<void> {
    await api.post(`/tenant/merchants/${id}/permissions`, { permissions })
  }

  /**
   * 启用/停用商户
   */
  async toggleMerchantStatus(id: number, status: 'active' | 'inactive'): Promise<Merchant> {
    const response = await api.patch(`/tenant/merchants/${id}/status`, { status })
    return response.data
  }
}

export const merchantService = new MerchantService()