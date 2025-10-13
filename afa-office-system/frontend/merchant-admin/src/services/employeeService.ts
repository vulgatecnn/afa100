import apiClient from './api'

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

export interface UpdateEmployeeData {
  name?: string
  phone?: string
  email?: string
  department?: string
  position?: string
  status?: 'active' | 'inactive'
  permissions?: string[]
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
  errors: Array<{ row: number; message: string }>
}

export const employeeService = {
  // 获取员工列表
  async getEmployees(params?: EmployeeListParams): Promise<EmployeeListResponse> {
    const response = await apiClient.get('/merchant/employees', { params })
    return response.data
  },

  // 获取员工详情
  async getEmployee(id: number): Promise<Employee> {
    const response = await apiClient.get(`/merchant/employees/${id}`)
    return response.data
  },

  // 创建员工
  async createEmployee(data: CreateEmployeeData): Promise<Employee> {
    const response = await apiClient.post('/merchant/employees', data)
    return response.data
  },

  // 更新员工
  async updateEmployee(id: number, data: UpdateEmployeeData): Promise<Employee> {
    const response = await apiClient.put(`/merchant/employees/${id}`, data)
    return response.data
  },

  // 删除员工
  async deleteEmployee(id: number): Promise<void> {
    await apiClient.delete(`/merchant/employees/${id}`)
  },

  // 批量导入员工
  async batchImportEmployees(file: File): Promise<BatchImportResult> {
    const formData = new FormData()
    formData.append('file', file)
    
    const response = await apiClient.post('/merchant/employees/batch', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
    return response.data
  },

  // 下载模板
  async downloadTemplate(): Promise<Blob> {
    const response = await apiClient.get('/merchant/employees/template', {
      responseType: 'blob'
    })
    return response.data
  },

  // 分配权限
  async assignPermissions(employeeId: number, permissions: string[]): Promise<void> {
    await apiClient.post(`/merchant/employees/${employeeId}/permissions`, { permissions })
  },

  // 切换员工状态
  async toggleEmployeeStatus(employeeId: number, status: 'active' | 'inactive'): Promise<Employee> {
    const response = await apiClient.patch(`/merchant/employees/${employeeId}/status`, { status })
    return response.data
  },

  // 获取部门列表
  async getDepartments(): Promise<string[]> {
    const response = await apiClient.get('/merchant/departments')
    return response.data
  },

  // 导出员工列表
  async exportEmployees(params?: EmployeeListParams): Promise<Blob> {
    const response = await apiClient.get('/merchant/employees/export', {
      params,
      responseType: 'blob'
    })
    return response.data
  }
}