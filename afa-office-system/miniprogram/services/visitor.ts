// 访客相关API服务
import ApiService from './api';
import NotificationService from './notification';
import { VisitorApplication, MerchantInfo, PasscodeInfo, AccessRecord } from '../types/api';

export interface VisitorApplyData {
    merchantId: number;
    visiteeId?: number;
    visitorName: string;
    visitorPhone: string;
    visitorCompany?: string;
    visitPurpose: string;
    visitType: string;
    scheduledTime: string;
    duration: number;
}

class VisitorService {
    // 获取商户列表
    async getMerchants(): Promise<MerchantInfo[]> {
        const response = await ApiService.get<MerchantInfo[]>('/api/v1/visitor/merchants');
        if (response.success) {
            return response.data;
        }
        throw new Error(response.message || '获取商户列表失败');
    }

    // 提交访客申请
    async submitApplication(data: VisitorApplyData): Promise<VisitorApplication> {
        const response = await ApiService.post<VisitorApplication>('/api/v1/visitor/apply', data);
        if (response.success) {
            // 发送申请提交成功通知
            const notification = NotificationService.createApplicationSubmittedNotification(response.data.id);
            await NotificationService.sendVisitorNotification(notification);

            return response.data;
        }
        throw new Error(response.message || '提交申请失败');
    }

    // 获取我的申请列表
    async getMyApplications(status?: string): Promise<VisitorApplication[]> {
        const params = status ? { status } : {};
        const response = await ApiService.get<VisitorApplication[]>('/api/v1/visitor/applications', params);
        if (response.success) {
            return response.data;
        }
        throw new Error(response.message || '获取申请列表失败');
    }

    // 获取申请详情
    async getApplicationDetail(id: number): Promise<VisitorApplication> {
        const response = await ApiService.get<VisitorApplication>(`/api/v1/visitor/applications/${id}`);
        if (response.success) {
            return response.data;
        }
        throw new Error(response.message || '获取申请详情失败');
    }

    // 获取通行码
    async getPasscode(applicationId: number): Promise<PasscodeInfo> {
        const response = await ApiService.get<PasscodeInfo>(`/api/v1/visitor/passcode/${applicationId}`);
        if (response.success) {
            return response.data;
        }
        throw new Error(response.message || '获取通行码失败');
    }

    // 刷新通行码
    async refreshPasscode(applicationId: number): Promise<PasscodeInfo> {
        const response = await ApiService.post<PasscodeInfo>(`/api/v1/visitor/passcode/${applicationId}/refresh`);
        if (response.success) {
            return response.data;
        }
        throw new Error(response.message || '刷新通行码失败');
    }

    // 获取通行记录
    async getAccessHistory(applicationId: number, startDate?: string, endDate?: string): Promise<AccessRecord[]> {
        const params: any = {};
        if (startDate) params.startDate = startDate;
        if (endDate) params.endDate = endDate;
        
        const response = await ApiService.get<AccessRecord[]>(`/api/v1/visitor/access-history/${applicationId}`, params);
        if (response.success) {
            return response.data;
        }
        throw new Error(response.message || '获取通行记录失败');
    }

    // 根据商户ID获取商户信息
    async getMerchantById(merchantId: number): Promise<MerchantInfo> {
        const merchants = await this.getMerchants();
        const merchant = merchants.find(m => m.id === merchantId);
        if (!merchant) {
            throw new Error('商户不存在');
        }
        return merchant;
    }

    // 验证商户是否可以接受访客申请
    async validateMerchantForVisitor(merchantId: number): Promise<boolean> {
        try {
            const merchant = await this.getMerchantById(merchantId);
            // 这里可以添加更多的验证逻辑，比如商户状态、营业时间等
            return merchant.id > 0;
        } catch (error) {
            return false;
        }
    }
}

export default new VisitorService();