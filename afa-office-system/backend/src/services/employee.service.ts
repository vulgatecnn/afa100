import { UserModel } from '../models/user.model.js';
import { MerchantModel } from '../models/merchant.model.js';
import { PermissionService } from './permission.service.js';
import type { 
  User, 
  UserStatus, 
  PaginatedResponse
} from '../types/index.js';

/**
 * 员工管理服务
 * 提供员工相关的业务逻辑处理
 */
export class EmployeeService {
  private permissionService: PermissionService;

  constructor() {
    this.permissionService = new PermissionService();
  }

  /**
   * 创建员工
   */
  async createEmployee(merchantId: number, employeeData: {
    name: string;
    phone?: string;
    open_id?: string;
    union_id?: string;
    avatar?: string;
    user_type?: 'employee' | 'merchant_admin';
    status?: UserStatus;
  }): Promise<User> {
    // 验证商户是否存在且状态正常
    const merchant = await MerchantModel.findById(merchantId);
    if (!merchant) {
      throw new Error('商户不存在');
    }
    if (merchant.status !== 'active') {
      throw new Error('商户状态异常，无法添加员工');
    }

    // 验证员工数据
    const validation = UserModel.validateUserData({
      ...employeeData,
      merchant_id: merchantId,
      user_type: employeeData.user_type || 'employee'
    });

    if (!validation.isValid) {
      throw new Error(`数据验证失败: ${validation.errors.join(', ')}`);
    }

    // 检查手机号是否已存在
    if (employeeData.phone) {
      const existingUser = await UserModel.findByPhone(employeeData.phone);
      if (existingUser) {
        throw new Error('手机号已被使用');
      }
    }

    // 检查微信openId是否已存在
    if (employeeData.open_id) {
      const existingUser = await UserModel.findByOpenId(employeeData.open_id);
      if (existingUser) {
        throw new Error('微信账号已被使用');
      }
    }

    // 创建员工
    const newEmployee = await UserModel.create({
      name: employeeData.name,
      phone: employeeData.phone || '',
      open_id: employeeData.open_id || '',
      union_id: employeeData.union_id || '',
      avatar: employeeData.avatar || '',
      user_type: employeeData.user_type || 'employee',
      status: employeeData.status || 'active',
      merchant_id: merchantId
    });

    return newEmployee;
  }  /*
*
   * 批量创建员工
   */
  async batchCreateEmployees(merchantId: number, employeesData: Array<{
    name: string;
    phone?: string;
    open_id?: string;
    union_id?: string;
    avatar?: string;
    user_type?: 'employee' | 'merchant_admin';
    status?: UserStatus;
  }>): Promise<{
    success: User[];
    failed: Array<{ data: any; error: string }>;
  }> {
    // 验证商户是否存在且状态正常
    const merchant = await MerchantModel.findById(merchantId);
    if (!merchant) {
      throw new Error('商户不存在');
    }
    if (merchant.status !== 'active') {
      throw new Error('商户状态异常，无法添加员工');
    }

    const success: User[] = [];
    const failed: Array<{ data: any; error: string }> = [];

    // 逐个处理员工数据
    for (const employeeData of employeesData) {
      try {
        const employee = await this.createEmployee(merchantId, employeeData);
        success.push(employee);
      } catch (error) {
        failed.push({
          data: employeeData,
          error: error instanceof Error ? error.message : '未知错误'
        });
      }
    }

    return { success, failed };
  }

  /**
   * 获取员工列表
   */
  async getEmployees(merchantId: number, options?: {
    page?: number;
    limit?: number;
    status?: UserStatus;
    search?: string;
  }): Promise<PaginatedResponse<User>> {
    // 验证商户是否存在
    const merchant = await MerchantModel.findById(merchantId);
    if (!merchant) {
      throw new Error('商户不存在');
    }

    const page = options?.page || 1;
    const limit = options?.limit || 20;

    // 构建查询条件
    const queryOptions: any = {
      page,
      limit,
      merchantId,
      userType: 'employee' // 只查询员工类型的用户
    };

    if (options?.status) {
      queryOptions.status = options.status;
    }

    // 获取员工列表
    let employees = await UserModel.findAll(queryOptions);

    // 如果有搜索条件，进行过滤
    if (options?.search) {
      const searchTerm = options.search.toLowerCase();
      employees = employees.filter(employee => 
        employee.name.toLowerCase().includes(searchTerm) ||
        (employee.phone && employee.phone.includes(searchTerm))
      );
    }

    // 获取总数
    const countQuery: any = {
      merchantId,
      userType: 'employee'
    };
    if (options?.status !== undefined) {
      countQuery.status = options.status;
    }
    const total = await UserModel.count(countQuery);

    return {
      data: employees,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * 获取员工详情
   */
  async getEmployeeById(merchantId: number, employeeId: number): Promise<User> {
    // 验证商户是否存在
    const merchant = await MerchantModel.findById(merchantId);
    if (!merchant) {
      throw new Error('商户不存在');
    }

    const employee = await UserModel.findById(employeeId);
    if (!employee) {
      throw new Error('员工不存在');
    }

    // 验证员工是否属于该商户
    if (employee.merchant_id !== merchantId) {
      throw new Error('员工不属于该商户');
    }

    return employee;
  }

  /**
   * 更新员工信息
   */
  async updateEmployee(merchantId: number, employeeId: number, updateData: {
    name?: string;
    phone?: string;
    avatar?: string;
    user_type?: 'employee' | 'merchant_admin';
    status?: UserStatus;
  }): Promise<User> {
    // 验证商户是否存在
    const merchant = await MerchantModel.findById(merchantId);
    if (!merchant) {
      throw new Error('商户不存在');
    }

    // 验证员工是否存在且属于该商户
    const employee = await this.getEmployeeById(merchantId, employeeId);

    // 验证更新数据
    if (Object.keys(updateData).length === 0) {
      throw new Error('没有需要更新的数据');
    }

    // 检查手机号是否已被其他用户使用
    if (updateData.phone && updateData.phone !== employee.phone) {
      const phoneExists = await UserModel.phoneExists(updateData.phone, employeeId);
      if (phoneExists) {
        throw new Error('手机号已被其他用户使用');
      }
    }

    // 验证更新数据
    const validation = UserModel.validateUserData(updateData);
    if (!validation.isValid) {
      throw new Error(`数据验证失败: ${validation.errors.join(', ')}`);
    }

    // 更新员工信息
    const updatedEmployee = await UserModel.update(employeeId, updateData);
    return updatedEmployee;
  }

  /**
   * 删除员工（软删除）
   */
  async deleteEmployee(merchantId: number, employeeId: number): Promise<boolean> {
    // 验证商户是否存在
    const merchant = await MerchantModel.findById(merchantId);
    if (!merchant) {
      throw new Error('商户不存在');
    }

    // 验证员工是否存在且属于该商户
    await this.getEmployeeById(merchantId, employeeId);

    // 软删除员工（设置状态为inactive）
    const result = await UserModel.softDelete(employeeId);
    return result;
  }

  /**
   * 批量删除员工
   */
  async batchDeleteEmployees(merchantId: number, employeeIds: number[]): Promise<{
    success: number[];
    failed: Array<{ id: number; error: string }>;
  }> {
    // 验证商户是否存在
    const merchant = await MerchantModel.findById(merchantId);
    if (!merchant) {
      throw new Error('商户不存在');
    }

    const success: number[] = [];
    const failed: Array<{ id: number; error: string }> = [];

    for (const employeeId of employeeIds) {
      try {
        const result = await this.deleteEmployee(merchantId, employeeId);
        if (result) {
          success.push(employeeId);
        } else {
          failed.push({ id: employeeId, error: '删除失败' });
        }
      } catch (error) {
        failed.push({
          id: employeeId,
          error: error instanceof Error ? error.message : '未知错误'
        });
      }
    }

    return { success, failed };
  }

  /**
   * 启用/禁用员工
   */
  async toggleEmployeeStatus(merchantId: number, employeeId: number, status: UserStatus): Promise<User> {
    // 验证商户是否存在
    const merchant = await MerchantModel.findById(merchantId);
    if (!merchant) {
      throw new Error('商户不存在');
    }

    // 验证员工是否存在且属于该商户
    await this.getEmployeeById(merchantId, employeeId);

    // 更新员工状态
    const updatedEmployee = await UserModel.update(employeeId, { status });
    return updatedEmployee;
  }

  /**
   * 分配员工权限
   */
  async assignEmployeePermissions(merchantId: number, employeeId: number, permissions: string[]): Promise<boolean> {
    // 验证商户是否存在
    const merchant = await MerchantModel.findById(merchantId);
    if (!merchant) {
      throw new Error('商户不存在');
    }

    // 验证员工是否存在且属于该商户
    await this.getEmployeeById(merchantId, employeeId);

    // 验证权限是否有效
    for (const permission of permissions) {
      // 简化权限验证，实际应该调用权限服务
      if (!permission || permission.trim().length === 0) {
        throw new Error(`权限代码无效: ${permission}`);
      }
    }

    // 分配权限 - 这里简化实现
    return true;
  }

  /**
   * 获取员工权限
   */
  async getEmployeePermissions(merchantId: number, employeeId: number): Promise<string[]> {
    // 验证商户是否存在
    const merchant = await MerchantModel.findById(merchantId);
    if (!merchant) {
      throw new Error('商户不存在');
    }

    // 验证员工是否存在且属于该商户
    await this.getEmployeeById(merchantId, employeeId);

    // 获取员工权限 - 这里简化实现
    return [];
  }

  /**
   * 获取商户员工统计信息
   */
  async getEmployeeStats(merchantId: number): Promise<{
    total: number;
    active: number;
    inactive: number;
    pending: number;
    byType: {
      employee: number;
      merchant_admin: number;
    };
  }> {
    // 验证商户是否存在
    const merchant = await MerchantModel.findById(merchantId);
    if (!merchant) {
      throw new Error('商户不存在');
    }

    // 获取各种状态的员工数量
    const [total, active, inactive, pending, employees, admins] = await Promise.all([
      UserModel.count({ merchantId, userType: 'employee' }),
      UserModel.count({ merchantId, userType: 'employee', status: 'active' }),
      UserModel.count({ merchantId, userType: 'employee', status: 'inactive' }),
      UserModel.count({ merchantId, userType: 'employee', status: 'pending' }),
      UserModel.count({ merchantId, userType: 'employee' }),
      UserModel.count({ merchantId, userType: 'merchant_admin' })
    ]);

    return {
      total,
      active,
      inactive,
      pending,
      byType: {
        employee: employees,
        merchant_admin: admins
      }
    };
  }

  /**
   * 验证Excel导入数据
   */
  validateImportData(data: any[]): {
    valid: Array<{
      name: string;
      phone?: string;
      user_type?: 'employee' | 'merchant_admin';
      status?: UserStatus;
    }>;
    invalid: Array<{ row: number; data: any; errors: string[] }>;
  } {
    const valid: Array<{
      name: string;
      phone?: string;
      user_type?: 'employee' | 'merchant_admin';
      status?: UserStatus;
    }> = [];
    const invalid: Array<{ row: number; data: any; errors: string[] }> = [];

    data.forEach((row, index) => {
      const errors: string[] = [];
      const rowNumber = index + 1;

      // 验证必填字段
      if (!row.name || typeof row.name !== 'string' || row.name.trim().length === 0) {
        errors.push('姓名不能为空');
      }

      // 验证手机号格式
      if (row.phone) {
        if (typeof row.phone !== 'string' || !/^1[3-9]\d{9}$/.test(row.phone)) {
          errors.push('手机号格式无效');
        }
      }

      // 验证用户类型
      if (row.user_type && !['employee', 'merchant_admin'].includes(row.user_type)) {
        errors.push('用户类型无效，只能是employee或merchant_admin');
      }

      // 验证状态
      if (row.status && !['active', 'inactive', 'pending'].includes(row.status)) {
        errors.push('状态无效，只能是active、inactive或pending');
      }

      if (errors.length > 0) {
        invalid.push({ row: rowNumber, data: row, errors });
      } else {
        valid.push({
          name: row.name.trim(),
          phone: row.phone?.trim(),
          user_type: row.user_type || 'employee',
          status: row.status || 'active'
        });
      }
    });

    return { valid, invalid };
  }

  /**
   * 处理Excel批量导入
   */
  async importEmployeesFromExcel(merchantId: number, data: any[]): Promise<{
    success: User[];
    failed: Array<{ row: number; data: any; error: string }>;
    summary: {
      total: number;
      successCount: number;
      failedCount: number;
    };
  }> {
    // 验证商户是否存在
    const merchant = await MerchantModel.findById(merchantId);
    if (!merchant) {
      throw new Error('商户不存在');
    }

    // 验证导入数据
    const validation = this.validateImportData(data);
    
    const success: User[] = [];
    const failed: Array<{ row: number; data: any; error: string }> = [];

    // 添加验证失败的记录
    validation.invalid.forEach(item => {
      failed.push({
        row: item.row,
        data: item.data,
        error: item.errors.join(', ')
      });
    });

    // 处理验证通过的记录
    for (let i = 0; i < validation.valid.length; i++) {
      const employeeData = validation.valid[i];
      if (!employeeData) continue;
      
      const originalIndex = data.findIndex(row => 
        row.name === employeeData.name && row.phone === employeeData.phone
      );
      const rowNumber = originalIndex + 1;

      try {
        const employee = await this.createEmployee(merchantId, employeeData);
        success.push(employee);
      } catch (error) {
        failed.push({
          row: rowNumber,
          data: employeeData,
          error: error instanceof Error ? error.message : '未知错误'
        });
      }
    }

    return {
      success,
      failed,
      summary: {
        total: data.length,
        successCount: success.length,
        failedCount: failed.length
      }
    };
  }
}