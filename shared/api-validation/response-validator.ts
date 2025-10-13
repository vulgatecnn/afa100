/**
 * API 响应验证器
 * 用于验证 API 响应格式和数据结构
 */

export interface ValidationRule {
  field: string
  type: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'date'
  required?: boolean
  minLength?: number
  maxLength?: number
  min?: number
  max?: number
  pattern?: RegExp
  enum?: any[]
  custom?: (value: any) => boolean | string
}

export interface ValidationSchema {
  name: string
  description: string
  rules: ValidationRule[]
}

export interface ValidationResult {
  valid: boolean
  errors: ValidationError[]
  warnings: ValidationWarning[]
}

export interface ValidationError {
  field: string
  message: string
  value?: any
}

export interface ValidationWarning {
  field: string
  message: string
  value?: any
}

export class ResponseValidator {
  /**
   * 验证 API 响应格式
   */
  validateResponse(response: any, schema: ValidationSchema): ValidationResult {
    const errors: ValidationError[] = []
    const warnings: ValidationWarning[] = []

    // 检查响应是否为对象
    if (typeof response !== 'object' || response === null) {
      errors.push({
        field: 'root',
        message: '响应必须是一个对象',
        value: response
      })
      return { valid: false, errors, warnings }
    }

    // 验证每个规则
    for (const rule of schema.rules) {
      const fieldErrors = this.validateField(response, rule)
      errors.push(...fieldErrors)
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    }
  }

  /**
   * 验证标准 API 响应格式
   */
  validateStandardApiResponse(response: any): ValidationResult {
    const standardSchema: ValidationSchema = {
      name: 'Standard API Response',
      description: '标准 API 响应格式',
      rules: [
        {
          field: 'success',
          type: 'boolean',
          required: true
        },
        {
          field: 'message',
          type: 'string',
          required: false
        },
        {
          field: 'timestamp',
          type: 'string',
          required: false,
          pattern: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/
        },
        {
          field: 'data',
          type: 'object',
          required: false
        }
      ]
    }

    return this.validateResponse(response, standardSchema)
  }

  /**
   * 验证分页响应格式
   */
  validatePaginatedResponse(response: any): ValidationResult {
    const paginationSchema: ValidationSchema = {
      name: 'Paginated Response',
      description: '分页响应格式',
      rules: [
        {
          field: 'data',
          type: 'array',
          required: true
        },
        {
          field: 'pagination',
          type: 'object',
          required: true
        },
        {
          field: 'pagination.page',
          type: 'number',
          required: true,
          min: 1
        },
        {
          field: 'pagination.pageSize',
          type: 'number',
          required: true,
          min: 1
        },
        {
          field: 'pagination.total',
          type: 'number',
          required: true,
          min: 0
        }
      ]
    }

    return this.validateResponse(response, paginationSchema)
  }

  /**
   * 验证用户信息响应
   */
  validateUserResponse(response: any): ValidationResult {
    const userSchema: ValidationSchema = {
      name: 'User Response',
      description: '用户信息响应格式',
      rules: [
        {
          field: 'id',
          type: 'number',
          required: true,
          min: 1
        },
        {
          field: 'name',
          type: 'string',
          required: true,
          minLength: 1,
          maxLength: 100
        },
        {
          field: 'email',
          type: 'string',
          required: false,
          pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        },
        {
          field: 'phone',
          type: 'string',
          required: false,
          pattern: /^1[3-9]\d{9}$/
        },
        {
          field: 'userType',
          type: 'string',
          required: true,
          enum: ['tenant_admin', 'merchant_admin', 'merchant_employee', 'visitor']
        },
        {
          field: 'status',
          type: 'string',
          required: true,
          enum: ['active', 'inactive', 'suspended']
        },
        {
          field: 'createdAt',
          type: 'string',
          required: true,
          pattern: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/
        }
      ]
    }

    return this.validateResponse(response, userSchema)
  }

  /**
   * 验证登录响应
   */
  validateLoginResponse(response: any): ValidationResult {
    const loginSchema: ValidationSchema = {
      name: 'Login Response',
      description: '登录响应格式',
      rules: [
        {
          field: 'token',
          type: 'string',
          required: true,
          minLength: 10
        },
        {
          field: 'refreshToken',
          type: 'string',
          required: false,
          minLength: 10
        },
        {
          field: 'expiresIn',
          type: 'number',
          required: true,
          min: 1
        },
        {
          field: 'user',
          type: 'object',
          required: true
        },
        {
          field: 'permissions',
          type: 'array',
          required: false
        }
      ]
    }

    const result = this.validateResponse(response, loginSchema)

    // 如果有用户对象，进一步验证用户信息
    if (response.user) {
      const userValidation = this.validateUserResponse(response.user)
      result.errors.push(...userValidation.errors.map(error => ({
        ...error,
        field: `user.${error.field}`
      })))
    }

    return result
  }

  /**
   * 验证错误响应
   */
  validateErrorResponse(response: any): ValidationResult {
    const errorSchema: ValidationSchema = {
      name: 'Error Response',
      description: '错误响应格式',
      rules: [
        {
          field: 'success',
          type: 'boolean',
          required: true,
          custom: (value) => value === false || '错误响应的 success 字段必须为 false'
        },
        {
          field: 'code',
          type: 'number',
          required: false,
          min: 1000,
          max: 9999
        },
        {
          field: 'message',
          type: 'string',
          required: true,
          minLength: 1
        },
        {
          field: 'data',
          type: 'object',
          required: false
        }
      ]
    }

    return this.validateResponse(response, errorSchema)
  }

  /**
   * 验证单个字段
   */
  private validateField(obj: any, rule: ValidationRule): ValidationError[] {
    const errors: ValidationError[] = []
    const fieldPath = rule.field.split('.')
    const value = this.getNestedValue(obj, fieldPath)

    // 检查必填字段
    if (rule.required && (value === undefined || value === null)) {
      errors.push({
        field: rule.field,
        message: `字段 ${rule.field} 是必填的`,
        value
      })
      return errors
    }

    // 如果字段不存在且不是必填的，跳过验证
    if (value === undefined || value === null) {
      return errors
    }

    // 类型验证
    if (!this.validateType(value, rule.type)) {
      errors.push({
        field: rule.field,
        message: `字段 ${rule.field} 类型应为 ${rule.type}，实际为 ${typeof value}`,
        value
      })
      return errors
    }

    // 字符串长度验证
    if (rule.type === 'string' && typeof value === 'string') {
      if (rule.minLength !== undefined && value.length < rule.minLength) {
        errors.push({
          field: rule.field,
          message: `字段 ${rule.field} 长度不能少于 ${rule.minLength} 个字符`,
          value
        })
      }
      if (rule.maxLength !== undefined && value.length > rule.maxLength) {
        errors.push({
          field: rule.field,
          message: `字段 ${rule.field} 长度不能超过 ${rule.maxLength} 个字符`,
          value
        })
      }
    }

    // 数值范围验证
    if (rule.type === 'number' && typeof value === 'number') {
      if (rule.min !== undefined && value < rule.min) {
        errors.push({
          field: rule.field,
          message: `字段 ${rule.field} 值不能小于 ${rule.min}`,
          value
        })
      }
      if (rule.max !== undefined && value > rule.max) {
        errors.push({
          field: rule.field,
          message: `字段 ${rule.field} 值不能大于 ${rule.max}`,
          value
        })
      }
    }

    // 正则表达式验证
    if (rule.pattern && typeof value === 'string') {
      if (!rule.pattern.test(value)) {
        errors.push({
          field: rule.field,
          message: `字段 ${rule.field} 格式不正确`,
          value
        })
      }
    }

    // 枚举值验证
    if (rule.enum && !rule.enum.includes(value)) {
      errors.push({
        field: rule.field,
        message: `字段 ${rule.field} 值必须是 ${rule.enum.join(', ')} 中的一个`,
        value
      })
    }

    // 自定义验证
    if (rule.custom) {
      const customResult = rule.custom(value)
      if (typeof customResult === 'string') {
        errors.push({
          field: rule.field,
          message: customResult,
          value
        })
      } else if (customResult === false) {
        errors.push({
          field: rule.field,
          message: `字段 ${rule.field} 自定义验证失败`,
          value
        })
      }
    }

    return errors
  }

  /**
   * 验证数据类型
   */
  private validateType(value: any, expectedType: string): boolean {
    switch (expectedType) {
      case 'string':
        return typeof value === 'string'
      case 'number':
        return typeof value === 'number' && !isNaN(value)
      case 'boolean':
        return typeof value === 'boolean'
      case 'object':
        return typeof value === 'object' && value !== null && !Array.isArray(value)
      case 'array':
        return Array.isArray(value)
      case 'date':
        return typeof value === 'string' && !isNaN(Date.parse(value))
      default:
        return false
    }
  }

  /**
   * 获取嵌套对象的值
   */
  private getNestedValue(obj: any, path: string[]): any {
    return path.reduce((current, key) => {
      return current && typeof current === 'object' ? current[key] : undefined
    }, obj)
  }

  /**
   * 格式化验证结果
   */
  formatValidationResult(result: ValidationResult): string {
    if (result.valid) {
      return '✅ 验证通过'
    }

    let output = '❌ 验证失败:\n'
    
    result.errors.forEach((error, index) => {
      output += `${index + 1}. ${error.message}\n`
      if (error.value !== undefined) {
        output += `   实际值: ${JSON.stringify(error.value)}\n`
      }
    })

    if (result.warnings.length > 0) {
      output += '\n⚠️ 警告:\n'
      result.warnings.forEach((warning, index) => {
        output += `${index + 1}. ${warning.message}\n`
      })
    }

    return output
  }
}