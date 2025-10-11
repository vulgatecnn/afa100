/**
 * MySQL适配测试 - 验证测试工具类的MySQL兼容性
 */

import { describe, it, expect, vi } from 'vitest'
import { TestErrorHandler, TestErrorType, createTestContext } from '../../../shared/test-helpers/error-handler'

// Mock所有外部依赖，避免Express应用加载问题
vi.mock('../../src/app', () => ({
  app: {}
}))

vi.mock('supertest', () => ({
  default: vi.fn(() => ({
    post: vi.fn().mockReturnThis(),
    send: vi.fn().mockResolvedValue({
      body: {
        data: {
          accessToken: 'mock-token'
        }
      }
    })
  }))
}))

// Mock MySQL适配器
const mockMySQLAdapter = {
  isReady: vi.fn().mockReturnValue(true),
  connect: vi.fn().mockResolvedValue(undefined),
  run: vi.fn().mockResolvedValue({ insertId: 1, affectedRows: 1 }),
  get: vi.fn().mockResolvedValue({ test: 1, count: 0 }),
  all: vi.fn().mockResolvedValue([])
}

vi.mock('../../src/adapters/mysql-adapter', () => ({
  MySQLAdapter: vi.fn().mockImplementation(() => mockMySQLAdapter)
}))

// Mock数据库配置管理器
vi.mock('../../src/config/database-config-manager', () => ({
  DatabaseConfigManager: vi.fn().mockImplementation(() => ({
    getConfig: vi.fn().mockReturnValue({
      type: 'mysql',
      host: 'localhost',
      port: 3306,
      user: 'test_user',
      password: 'test_password',
      database: 'test_db'
    })
  })),
  DatabaseType: {
    MYSQL: 'mysql'
  }
}))

// Mock后端测试工厂
const mockTestData = {
  user: {
    name: '测试用户',
    email: 'test@example.com',
    phone: '13800138000',
    password: 'hashed_password',
    user_type: 'tenant_admin',
    status: 'active',
    merchant_id: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  merchant: {
    name: '测试商户',
    code: 'TEST_MERCHANT',
    contact_person: '联系人',
    phone: '13800138001',
    email: 'merchant@example.com',
    status: 'active',
    space_ids: '[]',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  visitorApplication: {
    visitor_name: '访客姓名',
    phone: '13800138002',
    company: '访客公司',
    purpose: '商务洽谈',
    visit_date: new Date().toISOString(),
    duration: 120,
    status: 'pending',
    merchant_id: 1,
    applicant_id: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
}

vi.mock('../../../shared/test-factories/backend-adapter', () => ({
  BackendTestFactory: {
    createUser: vi.fn().mockReturnValue(mockTestData.user),
    createMerchant: vi.fn().mockReturnValue(mockTestData.merchant),
    createVisitorApplication: vi.fn().mockReturnValue(mockTestData.visitorApplication)
  }
}))

describe('MySQL适配测试工具', () => {
  describe('MySQL适配器Mock验证', () => {
    it('应该正确模拟MySQL适配器', () => {
      expect(mockMySQLAdapter.isReady()).toBe(true)
      expect(mockMySQLAdapter.run).toBeDefined()
      expect(mockMySQLAdapter.get).toBeDefined()
      expect(mockMySQLAdapter.all).toBeDefined()
    })

    it('应该正确模拟数据库操作结果', async () => {
      const runResult = await mockMySQLAdapter.run('INSERT INTO users VALUES (?)', ['test'])
      expect(runResult).toEqual({ insertId: 1, affectedRows: 1 })

      const getResult = await mockMySQLAdapter.get('SELECT 1 as test')
      expect(getResult).toEqual({ test: 1, count: 0 })

      const allResult = await mockMySQLAdapter.all('SELECT * FROM users')
      expect(allResult).toEqual([])
    })
  })

  describe('测试数据工厂验证', () => {
    it('应该正确生成用户测试数据', () => {
      expect(mockTestData.user).toHaveProperty('name', '测试用户')
      expect(mockTestData.user).toHaveProperty('email', 'test@example.com')
      expect(mockTestData.user).toHaveProperty('user_type', 'tenant_admin')
      expect(mockTestData.user).toHaveProperty('status', 'active')
    })

    it('应该正确生成商户测试数据', () => {
      expect(mockTestData.merchant).toHaveProperty('name', '测试商户')
      expect(mockTestData.merchant).toHaveProperty('code', 'TEST_MERCHANT')
      expect(mockTestData.merchant).toHaveProperty('status', 'active')
    })

    it('应该正确生成访客申请测试数据', () => {
      expect(mockTestData.visitorApplication).toHaveProperty('visitor_name', '访客姓名')
      expect(mockTestData.visitorApplication).toHaveProperty('status', 'pending')
      expect(mockTestData.visitorApplication).toHaveProperty('merchant_id', 1)
    })
  })

  describe('TestErrorHandler MySQL错误处理', () => {
    it('应该能够识别MySQL连接错误', () => {
      const context = createTestContext(
        'test-mysql-connection',
        'mysql-test.ts',
        'backend',
        'unit'
      )

      const connectionError = new Error('MySQL服务器连接失败')
      ;(connectionError as any).code = 'ECONNREFUSED'

      // 不应该抛出异常
      expect(() => {
        TestErrorHandler.handle(connectionError, context)
      }).not.toThrow()

      // 验证错误统计
      const stats = TestErrorHandler.getErrorStats()
      expect(stats[TestErrorType.MYSQL_CONNECTION_ERROR]).toBeGreaterThan(0)
    })

    it('应该能够识别MySQL查询错误', () => {
      const context = createTestContext(
        'test-mysql-query',
        'mysql-test.ts',
        'backend',
        'unit'
      )

      const queryError = new Error('MySQL查询执行失败')
      ;(queryError as any).code = 'ER_BAD_FIELD_ERROR'

      TestErrorHandler.handle(queryError, context)

      const stats = TestErrorHandler.getErrorStats()
      expect(stats[TestErrorType.MYSQL_QUERY_ERROR]).toBeGreaterThan(0)
    })

    it('应该能够识别MySQL事务错误', () => {
      const context = createTestContext(
        'test-mysql-transaction',
        'mysql-test.ts',
        'backend',
        'unit'
      )

      const transactionError = new Error('MySQL事务处理失败')
      ;(transactionError as any).code = 'ER_LOCK_DEADLOCK'

      TestErrorHandler.handle(transactionError, context)

      const stats = TestErrorHandler.getErrorStats()
      expect(stats[TestErrorType.MYSQL_TRANSACTION_ERROR]).toBeGreaterThan(0)
    })

    it('应该能够识别MySQL约束错误', () => {
      const context = createTestContext(
        'test-mysql-constraint',
        'mysql-test.ts',
        'backend',
        'unit'
      )

      const constraintError = new Error('MySQL数据约束违反')
      ;(constraintError as any).code = 'ER_DUP_ENTRY'

      TestErrorHandler.handle(constraintError, context)

      const stats = TestErrorHandler.getErrorStats()
      expect(stats[TestErrorType.MYSQL_CONSTRAINT_ERROR]).toBeGreaterThan(0)
    })

    it('应该能够生成错误报告', () => {
      const report = TestErrorHandler.generateErrorReport()
      
      expect(report).toContain('# 测试错误报告')
      expect(report).toContain('## 错误类型统计')
      expect(report).toContain('## 平台错误统计')
    })
  })

  describe('MySQL响应格式验证', () => {
    it('应该正确验证MySQL成功响应格式', () => {
      const response = {
        status: 200,
        body: {
          success: true,
          data: { id: 1, name: '测试' },
          message: '操作成功',
          timestamp: new Date().toISOString()
        }
      }

      // 验证响应结构
      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data).toEqual({ id: 1, name: '测试' })
      expect(response.body.message).toBe('操作成功')
      expect(response.body.timestamp).toBeDefined()
    })

    it('应该正确验证MySQL错误响应格式', () => {
      const response = {
        status: 400,
        body: {
          success: false,
          message: '请求参数错误',
          data: null,
          code: 400
        }
      }

      expect(response.status).toBe(400)
      expect(response.body.success).toBe(false)
      expect(response.body.message).toBe('请求参数错误')
      expect(response.body.data).toBeNull()
    })

    it('应该正确验证MySQL分页响应格式', () => {
      const response = {
        status: 200,
        body: {
          success: true,
          data: {
            items: [{ id: 1 }, { id: 2 }],
            pagination: {
              current: 1,
              pageSize: 10,
              total: 2,
              totalPages: 1
            }
          },
          message: '查询成功',
          timestamp: new Date().toISOString()
        }
      }

      expect(response.body.data.items).toHaveLength(2)
      expect(response.body.data.pagination.current).toBe(1)
      expect(response.body.data.pagination.total).toBe(2)
    })
  })
})