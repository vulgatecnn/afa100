import api from './api'

export interface VisitorApplication {
    id: number
    applicantId: number
    applicantName: string
    visitorName: string
    visitorPhone: string
    visitorCompany: string
    visitPurpose: string
    visitType: string
    scheduledTime: string
    duration: number
    status: 'pending' | 'approved' | 'rejected' | 'expired'
    approvedBy?: number
    approvedByName?: string
    approvedAt?: string
    passcode?: string
    passcodeExpiry?: string
    usageLimit: number
    usageCount: number
    createdAt: string
    updatedAt: string
}

export interface VisitorListParams {
    page?: number
    pageSize?: number
    search?: string
    status?: 'pending' | 'approved' | 'rejected' | 'expired'
    startDate?: string
    endDate?: string
}

export interface VisitorListResponse {
    applications: VisitorApplication[]
    total: number
    page: number
    pageSize: number
}

export interface ApprovalData {
    status: 'approved' | 'rejected'
    reason?: string
    usageLimit?: number
    duration?: number
}

export interface VisitorStats {
    total: number
    pending: number
    approved: number
    rejected: number
    todayVisits: number
}

class VisitorService {
    /**
     * 获取访客申请列表
     */
    async getVisitorApplications(params: VisitorListParams = {}): Promise<VisitorListResponse> {
        const response = await api.get('/merchant/visitors', { params })
        return response.data
    }

    /**
     * 获取访客申请详情
     */
    async getVisitorApplication(id: number): Promise<VisitorApplication> {
        const response = await api.get(`/merchant/visitors/${id}`)
        return response.data
    }

    /**
     * 审批访客申请
     */
    async approveVisitorApplication(id: number, data: ApprovalData): Promise<VisitorApplication> {
        const response = await api.put(`/merchant/visitors/${id}/approve`, data)
        return response.data
    }

    /**
     * 批量审批访客申请
     */
    async batchApproveApplications(ids: number[], data: ApprovalData): Promise<void> {
        await api.post('/merchant/visitors/batch-approve', { ids, ...data })
    }

    /**
     * 获取访客统计数据
     */
    async getVisitorStats(): Promise<VisitorStats> {
        const response = await api.get('/merchant/visitors/stats')
        return response.data
    }

    /**
     * 获取访客类型列表
     */
    async getVisitorTypes(): Promise<string[]> {
        const response = await api.get('/merchant/visitor-types')
        return response.data
    }

    /**
     * 导出访客记录
     */
    async exportVisitorRecords(params: VisitorListParams = {}): Promise<Blob> {
        const response = await api.get('/merchant/visitors/export', {
            params,
            responseType: 'blob'
        })
        return response.data
    }

    /**
     * 撤销访客申请
     */
    async revokeVisitorApplication(id: number): Promise<void> {
        await api.post(`/merchant/visitors/${id}/revoke`)
    }

    /**
     * 延长访客通行码有效期
     */
    async extendPasscode(id: number, duration: number): Promise<VisitorApplication> {
        const response = await api.post(`/merchant/visitors/${id}/extend`, { duration })
        return response.data
    }
}

export const visitorService = new VisitorService()