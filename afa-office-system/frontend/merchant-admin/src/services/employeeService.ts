import api from './api'

export interface Employee {
  id: number
  name: string
  phone: string
  email: string
  department: string
  position: string
  status: 'active' | 'inactive'
  permissions: string[]
  createdAt: string
  updatedAt: string
}

export interface CreateEmployeeData {
  name: string
  phone: string
  email: string
  department: string
  position: string
  permissions: string[]
}

export interface UpdateEmployeeData extends Partial<CreateEmployeeData> {
  status?: 'active' | 'inactive'
}

export interface EmployeeListParams {
  page?: number
  pageSize?: number
  search?: string
  department?: string
  status?: 'active' | 'inactive'
}

export interface EmployeeListResponse {
  employees: Employee[]
  total: number
  page: number
  pageSize: number
}

export interface BatchImportResult {
  success: number
  failed: number
  errors: Array<{
    row: number
    message: string
  }>
}

class EmployeeService {
  /**
   * 获取员工列表
   */
  async getEmployees(params: EmployeeListParams = {}): Promise<EmployeeListResponse> {
    const response = await api.get('/merchant/employees', { params })
    return response as unknown as EmployeeListResponse
  }

  /**
   * 获取员工详情
   */
  async getEmployee(id: number): Promise<Employee> {
    const response = await api.get(`/merchant/employees/${id}`)
    return response as unknown as Employee
  }

  /**
   * 创建员工
   */
  async createEmployee(data: CreateEmployeeData): Promise<Employee> {
    const response = await api.post('/merchant/employees', data)
    return response as unknown as Employee
  }

  /**
   * 更新员工
   */
  async updateEmployee(id: number, data: UpdateEmployeeData): Promise<Employee> {
    const response = await api.put(`/merchant/employees/${id}`, data)
    return response as unknown as Employee
  }

  /**
   * 删除员工
   */
  async deleteEmployee(id: number): Promise<void> {
    await api.delete(`/merchant/employees/${id}`)
  }

  /**
   * 批量导入员工
   */
  async batchImportEmployees(file: File): Promise<BatchImportResult> {
    const formData = new FormData()
    formData.append('file', file)
    
    const response = await api.post('/merchant/employees/batch', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
    return response as unknown as BatchImportResult
  }

  /**
   * 下载员工导入模板
   */
  async downloadTemplate(): Promise<Blob> {
    const response = await api.get('/merchant/employees/template', {
      responseType: 'blob'
    })
    return response as unknown as Blob
  }

  /**
   * 分配权限给员工
   */
  async assignPermissions(id: number, permissions: string[]): Promise<void> {
    await api.post(`/merchant/employees/${id}/permissions`, { permissions })
  }

  /**
   * 启用/停用员工
   */
  async toggleEmployeeStatus(id: number, status: 'active' | 'inactive'): Promise<Employee> {
    const response = await api.patch(`/merchant/employees/${id}/status`, { status })
    return response as unknown as Employee
  }

  /**
   * 获取部门列表
   */
  async getDepartments(): Promise<string[]> {
    const response = await api.get('/merchant/departments')
    return response as unknown as string[]
  }

  /**
   * 导出员工列表
   */
  async exportEmployees(params: EmployeeListParams = {}): Promise<Blob> {
    const response = await api.get('/merchant/employees/export', {
      params,
      responseType: 'blob'
    })
    return response as unknown as Blob
  }
}

export const employeeService = new EmployeeService()