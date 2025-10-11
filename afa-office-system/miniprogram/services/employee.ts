// 员工相关API服务
import ApiService from './api';
import { EmployeeApplication, PasscodeInfo, MerchantInfo, AccessRecord } from '../types/api';

export interface EmployeeApplyData {
  merchantId: number;
  name: string;
  phone: string;
  department?: string;
  position?: string;
  idCard?: string;
  email?: string;
  startDate?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  emergencyRelationship?: string;
}

class EmployeeService {
  // 获取商户列表
  async getMerchants(): Promise<MerchantInfo[]> {
    const response = await ApiService.get<MerchantInfo[]>('/api/v1/employee/merchants');
    if (response.success) {
      return response.data;
    }
    throw new Error(response.message || '获取商户列表失败');
  }

  // 提交员工申请
  async submitApplication(data: EmployeeApplyData): Promise<EmployeeApplication> {
    const response = await ApiService.post<EmployeeApplication>('/api/v1/employee/apply', data);
    if (response.success) {
      return response.data;
    }
    throw new Error(response.message || '提交申请失败');
  }

  // 获取我的员工申请
  async getMyApplication(): Promise<EmployeeApplication | null> {
    try {
      const response = await ApiService.get<EmployeeApplication>('/api/v1/employee/application');
      if (response.success) {
        return response.data;
      }
      return null;
    } catch (error) {
      // 如果没有申请记录，返回null
      return null;
    }
  }

  // 获取员工通行码
  async getEmployeePasscode(): Promise<PasscodeInfo> {
    const response = await ApiService.get<PasscodeInfo>('/api/v1/employee/passcode');
    if (response.success) {
      return response.data;
    }
    throw new Error(response.message || '获取通行码失败');
  }

  // 刷新员工通行码
  async refreshEmployeePasscode(): Promise<PasscodeInfo> {
    const response = await ApiService.post<PasscodeInfo>('/api/v1/employee/passcode/refresh');
    if (response.success) {
      return response.data;
    }
    throw new Error(response.message || '刷新通行码失败');
  }

  // 获取待审批的访客申请列表（员工审批功能）
  async getPendingVisitorApplications(): Promise<any[]> {
    const response = await ApiService.get<any[]>('/api/v1/employee/visitor-applications/pending');
    if (response.success) {
      return response.data;
    }
    throw new Error(response.message || '获取待审批申请失败');
  }

  // 审批访客申请
  async approveVisitorApplication(applicationId: number, approved: boolean, reason?: string): Promise<void> {
    const response = await ApiService.put(`/api/v1/employee/visitor-applications/${applicationId}/approve`, {
      approved,
      reason
    });
    if (!response.success) {
      throw new Error(response.message || '审批操作失败');
    }
  }

  // 获取员工通行记录
  async getAccessHistory(startDate?: string, endDate?: string): Promise<AccessRecord[]> {
    const params: any = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    
    const response = await ApiService.get<AccessRecord[]>('/api/v1/employee/access-history', params);
    if (response.success) {
      return response.data;
    }
    throw new Error(response.message || '获取通行记录失败');
  }

  // 撤销员工申请
  async withdrawApplication(applicationId: number): Promise<void> {
    const response = await ApiService.delete(`/api/v1/employee/application/${applicationId}`);
    if (!response.success) {
      throw new Error(response.message || '撤销申请失败');
    }
  }
}

export default new EmployeeService();