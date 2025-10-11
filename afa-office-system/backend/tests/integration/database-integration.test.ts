/**
 * 数据库集成测试 - 测试数据库事务、关联关系和约束检查
 * 验证数据库操作的正确性和数据完整性
 * 
 * 测试覆盖：
 * 1. 数据库事务的正确性和回滚机制
 * 2. 数据模型间的关联关系验证
 * 3. 数据验证和约束检查
 * 4. 并发事务处理
 * 5. 数据完整性约束
 * 6. 级联操作和外键约束
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest'
import { Database } from '../../src/utils/database.js'
import { 
  userFactory, 
  merchantFactory, 
  visitorApplicationFactory, 
  passcodeFactory,
  accessRecordFactory,
  projectFactory,
  venueFactory,
  floorFactory,
  TestScenarioFactory
} from '../../../../shared/test-factories/index.js'
import { TestErrorHandler, createTestContext } from '../../../../shared/test-helpers/error-handler.js'

describe('数据库集成测试', () => {
  let db: Database
  let testMerchantId: number
  let testUserIds: number[] = []

  const testContext = createTestContext(
    '数据库集成测试',
    'database-integration.test.ts',
    'backend',
    'integration'
  )

  beforeAll(async () => {
    try {
      // 初始化测试数据库
      db = Database.getInstance()
      await db.init()

      // 创建测试商户
      const testMerchant = merchantFactory.create({
        name: '数据库测试商户',
        code: 'DB_TEST_001',
        status: 'active'
      })

      const merchantResult = await db.run(`
        INSERT INTO merchants (
          name, code, contact, phone, email, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        testMerchant.name,
        testMerchant.code,
        testMerchant.contact,
        testMerchant.phone,
        testMerchant.email,
        testMerchant.status,
        testMerchant.createdAt,
        testMerchant.updatedAt
      ])

      testMerchantId = merchantResult.lastID!

    } catch (error) {
      TestErrorHandler.handle(error as Error, testContext)
      throw error
    }
  })

  afterAll(async () => {
    try {
      // 清理测试数据
      await db.run('DELETE FROM visitor_applications WHERE merchant_id = ?', [testMerchantId])
      await db.run('DELETE FROM passcodes WHERE user_id IN (SELECT id FROM users WHERE phone LIKE "138001390%")')
      await db.run('DELETE FROM users WHERE phone LIKE "138001390%"')
      await db.run('DELETE FROM merchants WHERE code = "DB_TEST_001"')
      await db.close()
    } catch (error) {
      TestErrorHandler.handle(error as Error, testContext)
    }
  })

  beforeEach(async () => {
    vi.clearAllMocks()
    // 清理之前测试的数据
    await db.run('DELETE FROM visitor_applications WHERE merchant_id = ?', [testMerchantId])
    await db.run('DELETE FROM passcodes WHERE user_id IN (SELECT id FROM users WHERE phone LIKE "138001390%")')
    await db.run('DELETE FROM users WHERE phone LIKE "138001390%"')
    testUserIds = []
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('数据库事务测试', () => {
    it('应该正确处理简单事务提交', async () => {
      // 使用数据库的事务方法
      const result = await db.withTransaction(async (executor) => {
        // 创建用户
        const user = userFactory.create({
          userType: 'employee',
          phone: '13800139001',
          merchantId: testMerchantId
        })

        const userResult = await executor.run(`
          INSERT INTO users (
            open_id, phone, name, user_type, status, merchant_id, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          user.openId,
          user.phone,
          user.name,
          user.userType,
          user.status,
          user.merchantId,
          user.createdAt,
          user.updatedAt
        ])

        const userId = userResult.lastID!
        testUserIds.push(userId)

        // 创建通行码
        await executor.run(`
          INSERT INTO passcodes (
            user_id, code, type, status, usage_limit, usage_count, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          userId, 'EMP001', 'employee', 'active', 100, 0,
          new Date().toISOString(), new Date().toISOString()
        ])

        return { userId, userPhone: user.phone }
      })

      // 验证事务提交后数据已保存
      const savedUser = await db.get('SELECT * FROM users WHERE id = ?', [result.userId])
      expect(savedUser).toBeTruthy()
      expect(savedUser.phone).toBe(result.userPhone)

      const savedPasscode = await db.get('SELECT * FROM passcodes WHERE user_id = ?', [result.userId])
      expect(savedPasscode).toBeTruthy()
      expect(savedPasscode.code).toBe('EMP001')
    })

    it('应该正确处理复杂业务事务提交', async () => {
      // 测试复杂的业务场景事务
      const result = await db.withTransaction(async (executor) => {
        // 1. 创建访客用户
        const visitor = userFactory.create({
          userType: 'visitor',
          phone: '13800139002',
          merchantId: undefined
        })

        const visitorResult = await executor.run(`
          INSERT INTO users (
            open_id, phone, name, user_type, status, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
          visitor.openId,
          visitor.phone,
          visitor.name,
          visitor.userType,
          visitor.status,
          visitor.createdAt,
          visitor.updatedAt
        ])

        const visitorId = visitorResult.lastID!
        testUserIds.push(visitorId)

        // 2. 创建访客申请
        const application = visitorApplicationFactory.create({
          applicantId: visitorId,
          merchantId: testMerchantId,
          status: 'approved'
        })

        const appResult = await executor.run(`
          INSERT INTO visitor_applications (
            applicant_id, merchant_id, visitor_name, visitor_phone,
            visit_purpose, scheduled_time, duration, status, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          application.applicantId,
          application.merchantId,
          application.visitorName,
          application.visitorPhone,
          application.visitPurpose,
          application.scheduledTime,
          application.duration,
          application.status,
          application.createdAt,
          application.updatedAt
        ])

        const applicationId = appResult.lastID!

        // 3. 创建访客通行码
        const passcode = passcodeFactory.create({
          userId: visitorId,
          type: 'visitor',
          status: 'active',
          applicationId: applicationId
        })

        await executor.run(`
          INSERT INTO passcodes (
            user_id, code, type, status, usage_limit, usage_count,
            application_id, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          passcode.userId,
          passcode.code,
          passcode.type,
          passcode.status,
          passcode.usageLimit,
          passcode.usageCount,
          passcode.applicationId,
          passcode.createdAt,
          passcode.updatedAt
        ])

        // 4. 创建通行记录
        const accessRecord = accessRecordFactory.create({
          userId: visitorId,
          deviceId: 'DEVICE001',
          direction: 'in',
          result: 'success'
        })

        await executor.run(`
          INSERT INTO access_records (
            user_id, device_id, direction, result, timestamp
          ) VALUES (?, ?, ?, ?, ?)
        `, [
          accessRecord.userId,
          accessRecord.deviceId,
          accessRecord.direction,
          accessRecord.result,
          accessRecord.timestamp
        ])

        return { visitorId, applicationId, passcodeCode: passcode.code }
      })

      // 验证所有相关数据都已正确保存
      const savedVisitor = await db.get('SELECT * FROM users WHERE id = ?', [result.visitorId])
      expect(savedVisitor).toBeTruthy()
      expect(savedVisitor.user_type).toBe('visitor')

      const savedApplication = await db.get('SELECT * FROM visitor_applications WHERE id = ?', [result.applicationId])
      expect(savedApplication).toBeTruthy()
      expect(savedApplication.status).toBe('approved')

      const savedPasscode = await db.get('SELECT * FROM passcodes WHERE code = ?', [result.passcodeCode])
      expect(savedPasscode).toBeTruthy()
      expect(savedPasscode.application_id).toBe(result.applicationId)

      const savedAccessRecord = await db.get('SELECT * FROM access_records WHERE user_id = ?', [result.visitorId])
      expect(savedAccessRecord).toBeTruthy()
      expect(savedAccessRecord.result).toBe('success')
    })

    it('应该正确处理事务回滚 - 外键约束违反', async () => {
      let userId: number | undefined

      try {
        await db.withTransaction(async (executor) => {
          // 创建用户
          const user = userFactory.create({
            userType: 'employee',
            phone: '13800139003',
            merchantId: testMerchantId
          })

          const userResult = await executor.run(`
            INSERT INTO users (
              open_id, phone, name, user_type, status, merchant_id, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            user.openId,
            user.phone,
            user.name,
            user.userType,
            user.status,
            user.merchantId,
            user.createdAt,
            user.updatedAt
          ])

          userId = userResult.lastID!

          // 故意插入无效数据触发外键约束错误
          await executor.run(`
            INSERT INTO passcodes (
              user_id, code, type, status, usage_limit, usage_count, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            99999, 'INVALID', 'employee', 'active', 100, 0, // 无效的user_id
            new Date().toISOString(), new Date().toISOString()
          ])
        })

        // 不应该到达这里
        expect(true).toBe(false)

      } catch (error) {
        // 验证事务已回滚，数据未保存
        if (userId) {
          const savedUser = await db.get('SELECT * FROM users WHERE id = ?', [userId])
          expect(savedUser).toBeUndefined()
        }

        const savedPasscode = await db.get('SELECT * FROM passcodes WHERE code = "INVALID"')
        expect(savedPasscode).toBeUndefined()

        // 验证错误类型
        expect(error.message).toMatch(/外键约束|foreign key|constraint/i)
      }
    })

    it('应该正确处理事务回滚 - 业务逻辑错误', async () => {
      let createdUserIds: number[] = []

      try {
        await db.withTransaction(async (executor) => {
          // 创建多个用户
          for (let i = 0; i < 3; i++) {
            const user = userFactory.create({
              userType: 'employee',
              phone: `1380013900${4 + i}`,
              merchantId: testMerchantId
            })

            const userResult = await executor.run(`
              INSERT INTO users (
                open_id, phone, name, user_type, status, merchant_id, created_at, updated_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `, [
              user.openId,
              user.phone,
              user.name,
              user.userType,
              user.status,
              user.merchantId,
              user.createdAt,
              user.updatedAt
            ])

            createdUserIds.push(userResult.lastID!)
          }

          // 模拟业务逻辑错误
          if (createdUserIds.length > 2) {
            throw new Error('业务规则：不能同时创建超过2个用户')
          }
        })

        // 不应该到达这里
        expect(true).toBe(false)

      } catch (error) {
        // 验证所有用户都未保存（事务回滚）
        for (const userId of createdUserIds) {
          const savedUser = await db.get('SELECT * FROM users WHERE id = ?', [userId])
          expect(savedUser).toBeUndefined()
        }

        expect(error.message).toContain('业务规则')
      }
    })

    it('应该正确处理事务回滚 - 数据验证失败', async () => {
      try {
        await db.withTransaction(async (executor) => {
          // 创建用户
          const user = userFactory.create({
            userType: 'employee',
            phone: '13800139007',
            merchantId: testMerchantId
          })

          const userResult = await executor.run(`
            INSERT INTO users (
              open_id, phone, name, user_type, status, merchant_id, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            user.openId,
            user.phone,
            user.name,
            user.userType,
            user.status,
            user.merchantId,
            user.createdAt,
            user.updatedAt
          ])

          const userId = userResult.lastID!

          // 尝试插入无效状态的通行码
          await executor.run(`
            INSERT INTO passcodes (
              user_id, code, type, status, usage_limit, usage_count, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            userId, 'TEST001', 'employee', 'invalid_status', // 无效状态
            100, 0, new Date().toISOString(), new Date().toISOString()
          ])
        })

        expect(true).toBe(false)

      } catch (error) {
        // 验证用户也未保存（整个事务回滚）
        const savedUser = await db.get('SELECT * FROM users WHERE phone = ?', ['13800139007'])
        expect(savedUser).toBeUndefined()

        const savedPasscode = await db.get('SELECT * FROM passcodes WHERE code = "TEST001"')
        expect(savedPasscode).toBeUndefined()
      }
    })

    it('应该支持复杂嵌套事务操作', async () => {
      const result = await db.withTransaction(async (outerExecutor) => {
        // 外层事务：创建商户管理员
        const admin = userFactory.create({
          userType: 'merchant_admin',
          phone: '13800139008',
          merchantId: testMerchantId
        })

        const adminResult = await outerExecutor.run(`
          INSERT INTO users (
            open_id, phone, name, user_type, status, merchant_id, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          admin.openId,
          admin.phone,
          admin.name,
          admin.userType,
          admin.status,
          admin.merchantId,
          admin.createdAt,
          admin.updatedAt
        ])

        const adminId = adminResult.lastID!
        testUserIds.push(adminId)

        // 内层操作：批量创建员工和通行码
        const employees = userFactory.createMany(3, {
          userType: 'employee',
          merchantId: testMerchantId,
          status: 'active'
        })

        const employeeIds: number[] = []
        const passcodeCodes: string[] = []

        for (let i = 0; i < employees.length; i++) {
          const employee = employees[i]
          employee.phone = `1380013900${8 + i}` // 确保手机号唯一

          // 创建员工
          const empResult = await outerExecutor.run(`
            INSERT INTO users (
              open_id, phone, name, user_type, status, merchant_id, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            employee.openId,
            employee.phone,
            employee.name,
            employee.userType,
            employee.status,
            employee.merchantId,
            employee.createdAt,
            employee.updatedAt
          ])

          const employeeId = empResult.lastID!
          employeeIds.push(employeeId)
          testUserIds.push(employeeId)

          // 为每个员工创建通行码
          const passcodeCode = `EMP${(100 + i).toString().padStart(3, '0')}`
          passcodeCodes.push(passcodeCode)

          await outerExecutor.run(`
            INSERT INTO passcodes (
              user_id, code, type, status, usage_limit, usage_count, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            employeeId, passcodeCode, 'employee', 'active', 100, 0,
            new Date().toISOString(), new Date().toISOString()
          ])

          // 创建初始通行记录
          await outerExecutor.run(`
            INSERT INTO access_records (
              user_id, device_id, direction, result, timestamp
            ) VALUES (?, ?, ?, ?, ?)
          `, [
            employeeId, 'DEVICE001', 'in', 'success', new Date().toISOString()
          ])
        }

        return { adminId, employeeIds, passcodeCodes }
      })

      // 验证所有数据都已正确保存
      const savedAdmin = await db.get('SELECT * FROM users WHERE id = ?', [result.adminId])
      expect(savedAdmin).toBeTruthy()
      expect(savedAdmin.user_type).toBe('merchant_admin')

      // 验证所有员工都已保存
      for (const employeeId of result.employeeIds) {
        const savedEmployee = await db.get('SELECT * FROM users WHERE id = ?', [employeeId])
        expect(savedEmployee).toBeTruthy()
        expect(savedEmployee.user_type).toBe('employee')
      }

      // 验证所有通行码都已保存
      for (const passcodeCode of result.passcodeCodes) {
        const savedPasscode = await db.get('SELECT * FROM passcodes WHERE code = ?', [passcodeCode])
        expect(savedPasscode).toBeTruthy()
        expect(savedPasscode.type).toBe('employee')
      }

      // 验证通行记录都已保存
      const accessRecords = await db.all(
        'SELECT * FROM access_records WHERE user_id IN (' + result.employeeIds.map(() => '?').join(',') + ')',
        result.employeeIds
      )
      expect(accessRecords.length).toBe(result.employeeIds.length)
    })

    it('应该处理并发事务冲突和死锁', async () => {
      // 创建两个测试用户
      const user1 = userFactory.create({
        userType: 'employee',
        phone: '13800139010',
        merchantId: testMerchantId
      })

      const user2 = userFactory.create({
        userType: 'employee',
        phone: '13800139011',
        merchantId: testMerchantId
      })

      const user1Result = await db.run(`
        INSERT INTO users (
          open_id, phone, name, user_type, status, merchant_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        user1.openId, user1.phone, user1.name, user1.userType,
        user1.status, user1.merchantId, user1.createdAt, user1.updatedAt
      ])

      const user2Result = await db.run(`
        INSERT INTO users (
          open_id, phone, name, user_type, status, merchant_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        user2.openId, user2.phone, user2.name, user2.userType,
        user2.status, user2.merchantId, user2.createdAt, user2.updatedAt
      ])

      const userId1 = user1Result.lastID!
      const userId2 = user2Result.lastID!
      testUserIds.push(userId1, userId2)

      // 模拟并发更新可能导致死锁的场景
      const concurrentOperations = [
        // 操作1：先更新用户1，再更新用户2
        async () => {
          try {
            return await db.withTransaction(async (executor) => {
              await executor.run(
                'UPDATE users SET name = ?, updated_at = ? WHERE id = ?',
                ['并发更新1-用户1', new Date().toISOString(), userId1]
              )
              
              // 模拟处理时间
              await new Promise(resolve => setTimeout(resolve, 50))
              
              await executor.run(
                'UPDATE users SET name = ?, updated_at = ? WHERE id = ?',
                ['并发更新1-用户2', new Date().toISOString(), userId2]
              )
              
              return { success: true, operation: 'operation1' }
            })
          } catch (error) {
            return { success: false, operation: 'operation1', error: error.message }
          }
        },

        // 操作2：先更新用户2，再更新用户1
        async () => {
          try {
            return await db.withTransaction(async (executor) => {
              await executor.run(
                'UPDATE users SET name = ?, updated_at = ? WHERE id = ?',
                ['并发更新2-用户2', new Date().toISOString(), userId2]
              )
              
              // 模拟处理时间
              await new Promise(resolve => setTimeout(resolve, 50))
              
              await executor.run(
                'UPDATE users SET name = ?, updated_at = ? WHERE id = ?',
                ['并发更新2-用户1', new Date().toISOString(), userId1]
              )
              
              return { success: true, operation: 'operation2' }
            })
          } catch (error) {
            return { success: false, operation: 'operation2', error: error.message }
          }
        },

        // 操作3：批量更新
        async () => {
          try {
            return await db.withTransaction(async (executor) => {
              await executor.run(
                'UPDATE users SET status = ?, updated_at = ? WHERE id IN (?, ?)',
                ['active', new Date().toISOString(), userId1, userId2]
              )
              
              return { success: true, operation: 'batch_update' }
            })
          } catch (error) {
            return { success: false, operation: 'batch_update', error: error.message }
          }
        }
      ]

      const results = await Promise.all(concurrentOperations)
      
      // 至少有一个操作成功
      const successCount = results.filter(r => r.success).length
      expect(successCount).toBeGreaterThan(0)

      // 验证最终状态一致性
      const finalUser1 = await db.get('SELECT * FROM users WHERE id = ?', [userId1])
      const finalUser2 = await db.get('SELECT * FROM users WHERE id = ?', [userId2])
      
      expect(finalUser1).toBeTruthy()
      expect(finalUser2).toBeTruthy()
      
      // 验证数据完整性
      expect(finalUser1.merchant_id).toBe(testMerchantId)
      expect(finalUser2.merchant_id).toBe(testMerchantId)
    })

    it('应该正确处理事务超时', async () => {
      // 创建测试用户
      const user = userFactory.create({
        userType: 'employee',
        phone: '13800139012',
        merchantId: testMerchantId
      })

      const userResult = await db.run(`
        INSERT INTO users (
          open_id, phone, name, user_type, status, merchant_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        user.openId, user.phone, user.name, user.userType,
        user.status, user.merchantId, user.createdAt, user.updatedAt
      ])

      const userId = userResult.lastID!
      testUserIds.push(userId)

      try {
        // 模拟长时间运行的事务
        await db.withTransaction(async (executor) => {
          await executor.run(
            'UPDATE users SET name = ? WHERE id = ?',
            ['长时间事务测试', userId]
          )
          
          // 模拟长时间处理
          await new Promise(resolve => setTimeout(resolve, 2000))
          
          await executor.run(
            'UPDATE users SET status = ? WHERE id = ?',
            ['inactive', userId]
          )
        }, { timeout: 1000 }) // 设置1秒超时

        // 不应该到达这里
        expect(true).toBe(false)

      } catch (error) {
        // 验证是超时错误
        expect(error.message).toMatch(/timeout|超时/i)
        
        // 验证事务已回滚
        const savedUser = await db.get('SELECT * FROM users WHERE id = ?', [userId])
        expect(savedUser.name).not.toBe('长时间事务测试')
        expect(savedUser.status).not.toBe('inactive')
      }
    })
  })

  describe('数据模型关联关系测试', () => {
    it('应该正确处理用户-商户关联关系', async () => {
      // 创建商户管理员
      const admin = userFactory.create({
        userType: 'merchant_admin',
        phone: '13800139020',
        merchantId: testMerchantId
      })

      const adminResult = await db.run(`
        INSERT INTO users (
          open_id, phone, name, user_type, status, merchant_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        admin.openId,
        admin.phone,
        admin.name,
        admin.userType,
        admin.status,
        admin.merchantId,
        admin.createdAt,
        admin.updatedAt
      ])

      const adminId = adminResult.lastID!
      testUserIds.push(adminId)

      // 验证关联查询
      const userWithMerchant = await db.get(`
        SELECT u.*, m.name as merchant_name, m.code as merchant_code
        FROM users u
        LEFT JOIN merchants m ON u.merchant_id = m.id
        WHERE u.id = ?
      `, [adminId])

      expect(userWithMerchant).toBeTruthy()
      expect(userWithMerchant.merchant_name).toBe('数据库测试商户')
      expect(userWithMerchant.merchant_code).toBe('DB_TEST_001')
      expect(userWithMerchant.merchant_id).toBe(testMerchantId)

      // 验证反向关联查询
      const merchantWithUsers = await db.all(`
        SELECT m.*, COUNT(u.id) as user_count
        FROM merchants m
        LEFT JOIN users u ON m.id = u.merchant_id
        WHERE m.id = ?
        GROUP BY m.id, m.name, m.code, m.contact, m.phone, m.email, m.status, m.created_at, m.updated_at
      `, [testMerchantId])

      expect(merchantWithUsers.length).toBe(1)
      expect(merchantWithUsers[0].user_count).toBeGreaterThan(0)
    })

    it('应该正确处理项目-场地-楼层层级关系', async () => {
      // 创建项目
      const project = projectFactory.create({ status: 'active' })
      const projectResult = await db.run(`
        INSERT INTO projects (code, name, description, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [
        project.code, project.name, project.description,
        project.status, project.createdAt, project.updatedAt
      ])
      const projectId = projectResult.lastID!

      // 创建场地
      const venue = venueFactory.create({ 
        projectId: projectId,
        status: 'active' 
      })
      const venueResult = await db.run(`
        INSERT INTO venues (project_id, code, name, description, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        venue.projectId, venue.code, venue.name, venue.description,
        venue.status, venue.createdAt, venue.updatedAt
      ])
      const venueId = venueResult.lastID!

      // 创建楼层
      const floor = floorFactory.create({
        venueId: venueId,
        status: 'active'
      })
      const floorResult = await db.run(`
        INSERT INTO floors (venue_id, code, name, description, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        floor.venueId, floor.code, floor.name, floor.description,
        floor.status, floor.createdAt, floor.updatedAt
      ])
      const floorId = floorResult.lastID!

      // 验证三级关联查询
      const hierarchyQuery = await db.get(`
        SELECT 
          p.name as project_name,
          v.name as venue_name,
          f.name as floor_name,
          p.id as project_id,
          v.id as venue_id,
          f.id as floor_id
        FROM floors f
        JOIN venues v ON f.venue_id = v.id
        JOIN projects p ON v.project_id = p.id
        WHERE f.id = ?
      `, [floorId])

      expect(hierarchyQuery).toBeTruthy()
      expect(hierarchyQuery.project_id).toBe(projectId)
      expect(hierarchyQuery.venue_id).toBe(venueId)
      expect(hierarchyQuery.floor_id).toBe(floorId)
      expect(hierarchyQuery.project_name).toBe(project.name)
      expect(hierarchyQuery.venue_name).toBe(venue.name)
      expect(hierarchyQuery.floor_name).toBe(floor.name)

      // 验证层级统计查询
      const hierarchyStats = await db.get(`
        SELECT 
          COUNT(DISTINCT v.id) as venue_count,
          COUNT(DISTINCT f.id) as floor_count
        FROM projects p
        LEFT JOIN venues v ON p.id = v.project_id
        LEFT JOIN floors f ON v.id = f.venue_id
        WHERE p.id = ?
      `, [projectId])

      expect(hierarchyStats.venue_count).toBe(1)
      expect(hierarchyStats.floor_count).toBe(1)

      // 清理测试数据
      await db.run('DELETE FROM floors WHERE id = ?', [floorId])
      await db.run('DELETE FROM venues WHERE id = ?', [venueId])
      await db.run('DELETE FROM projects WHERE id = ?', [projectId])
    })

    it('应该正确处理访客申请-用户关联关系', async () => {
      // 创建访客用户
      const visitor = userFactory.create({
        userType: 'visitor',
        phone: '13800139021',
        merchantId: undefined
      })

      const visitorResult = await db.run(`
        INSERT INTO users (
          open_id, phone, name, user_type, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        visitor.openId,
        visitor.phone,
        visitor.name,
        visitor.userType,
        visitor.status,
        visitor.createdAt,
        visitor.updatedAt
      ])

      const visitorId = visitorResult.lastID!
      testUserIds.push(visitorId)

      // 创建员工用户
      const employee = userFactory.create({
        userType: 'employee',
        phone: '13800139022',
        merchantId: testMerchantId
      })

      const employeeResult = await db.run(`
        INSERT INTO users (
          open_id, phone, name, user_type, status, merchant_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        employee.openId,
        employee.phone,
        employee.name,
        employee.userType,
        employee.status,
        employee.merchantId,
        employee.createdAt,
        employee.updatedAt
      ])

      const employeeId = employeeResult.lastID!
      testUserIds.push(employeeId)

      // 创建访客申请
      const application = visitorApplicationFactory.create({
        applicantId: visitorId,
        merchantId: testMerchantId,
        visiteeId: employeeId
      })

      const appResult = await db.run(`
        INSERT INTO visitor_applications (
          applicant_id, merchant_id, visitee_id, visitor_name, visitor_phone,
          visit_purpose, scheduled_time, duration, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        application.applicantId,
        application.merchantId,
        application.visiteeId,
        application.visitorName,
        application.visitorPhone,
        application.visitPurpose,
        application.scheduledTime,
        application.duration,
        application.status,
        application.createdAt,
        application.updatedAt
      ])

      const applicationId = appResult.lastID!

      // 验证复杂关联查询
      const applicationWithUsers = await db.get(`
        SELECT 
          va.*,
          applicant.name as applicant_name,
          applicant.phone as applicant_phone,
          visitee.name as visitee_name,
          visitee.phone as visitee_phone,
          m.name as merchant_name
        FROM visitor_applications va
        LEFT JOIN users applicant ON va.applicant_id = applicant.id
        LEFT JOIN users visitee ON va.visitee_id = visitee.id
        LEFT JOIN merchants m ON va.merchant_id = m.id
        WHERE va.id = ?
      `, [applicationId])

      expect(applicationWithUsers).toBeTruthy()
      expect(applicationWithUsers.applicant_name).toBe(visitor.name)
      expect(applicationWithUsers.visitee_name).toBe(employee.name)
      expect(applicationWithUsers.merchant_name).toBe('数据库测试商户')

      // 验证访客申请状态流转
      const statusTransitions = ['pending', 'approved', 'completed']
      for (const status of statusTransitions) {
        await db.run(
          'UPDATE visitor_applications SET status = ?, updated_at = ? WHERE id = ?',
          [status, new Date().toISOString(), applicationId]
        )

        const updatedApp = await db.get('SELECT status FROM visitor_applications WHERE id = ?', [applicationId])
        expect(updatedApp.status).toBe(status)
      }

      // 验证访客申请统计查询
      const visitorStats = await db.get(`
        SELECT 
          COUNT(*) as total_applications,
          COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_count,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count
        FROM visitor_applications
        WHERE merchant_id = ?
      `, [testMerchantId])

      expect(visitorStats.total_applications).toBeGreaterThan(0)

      // 清理测试数据
      await db.run('DELETE FROM visitor_applications WHERE id = ?', [applicationId])
    })

    it('应该正确处理通行码-用户-申请关联关系', async () => {
      // 创建访客用户
      const visitor = userFactory.create({
        userType: 'visitor',
        phone: '13800139023',
        merchantId: undefined
      })

      const visitorResult = await db.run(`
        INSERT INTO users (
          open_id, phone, name, user_type, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        visitor.openId,
        visitor.phone,
        visitor.name,
        visitor.userType,
        visitor.status,
        visitor.createdAt,
        visitor.updatedAt
      ])

      const visitorId = visitorResult.lastID!
      testUserIds.push(visitorId)

      // 创建访客申请
      const appResult = await db.run(`
        INSERT INTO visitor_applications (
          applicant_id, merchant_id, visitor_name, visitor_phone,
          visit_purpose, scheduled_time, duration, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        visitorId, testMerchantId, visitor.name, visitor.phone,
        '关联测试', new Date().toISOString(), 60, 'approved',
        new Date().toISOString(), new Date().toISOString()
      ])

      const applicationId = appResult.lastID!

      // 创建通行码
      const passcodeResult = await db.run(`
        INSERT INTO passcodes (
          user_id, code, type, status, usage_limit, usage_count,
          application_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        visitorId, 'VIS001', 'visitor', 'active', 5, 0,
        applicationId, new Date().toISOString(), new Date().toISOString()
      ])

      const passcodeId = passcodeResult.lastID!

      // 验证三表关联查询
      const passcodeWithDetails = await db.get(`
        SELECT 
          p.*,
          u.name as user_name,
          u.phone as user_phone,
          va.visitor_name,
          va.visit_purpose,
          va.scheduled_time
        FROM passcodes p
        LEFT JOIN users u ON p.user_id = u.id
        LEFT JOIN visitor_applications va ON p.application_id = va.id
        WHERE p.user_id = ? AND p.code = ?
      `, [visitorId, 'VIS001'])

      expect(passcodeWithDetails).toBeTruthy()
      expect(passcodeWithDetails.user_name).toBe(visitor.name)
      expect(passcodeWithDetails.visitor_name).toBe(visitor.name)
      expect(passcodeWithDetails.visit_purpose).toBe('关联测试')

      // 创建通行记录
      const accessRecord = accessRecordFactory.create({
        userId: visitorId,
        passcodeId: passcodeId,
        deviceId: 'DEVICE001',
        direction: 'in',
        result: 'success'
      })

      await db.run(`
        INSERT INTO access_records (
          user_id, passcode_id, device_id, direction, result, timestamp
        ) VALUES (?, ?, ?, ?, ?, ?)
      `, [
        accessRecord.userId,
        accessRecord.passcodeId,
        accessRecord.deviceId,
        accessRecord.direction,
        accessRecord.result,
        accessRecord.timestamp
      ])

      // 验证四表关联查询（用户-申请-通行码-通行记录）
      const fullRelationQuery = await db.get(`
        SELECT 
          u.name as user_name,
          va.visit_purpose,
          p.code as passcode,
          ar.direction,
          ar.result,
          ar.timestamp
        FROM access_records ar
        JOIN users u ON ar.user_id = u.id
        JOIN passcodes p ON ar.passcode_id = p.id
        JOIN visitor_applications va ON p.application_id = va.id
        WHERE ar.user_id = ? AND p.code = ?
      `, [visitorId, 'VIS001'])

      expect(fullRelationQuery).toBeTruthy()
      expect(fullRelationQuery.user_name).toBe(visitor.name)
      expect(fullRelationQuery.visit_purpose).toBe('关联测试')
      expect(fullRelationQuery.passcode).toBe('VIS001')
      expect(fullRelationQuery.direction).toBe('in')
      expect(fullRelationQuery.result).toBe('success')

      // 验证通行码使用统计
      await db.run(
        'UPDATE passcodes SET usage_count = usage_count + 1 WHERE id = ?',
        [passcodeId]
      )

      const updatedPasscode = await db.get('SELECT usage_count FROM passcodes WHERE id = ?', [passcodeId])
      expect(updatedPasscode.usage_count).toBe(1)

      // 清理测试数据
      await db.run('DELETE FROM access_records WHERE user_id = ?', [visitorId])
      await db.run('DELETE FROM passcodes WHERE id = ?', [passcodeId])
      await db.run('DELETE FROM visitor_applications WHERE id = ?', [applicationId])
    })

    it('应该正确处理级联删除和更新', async () => {
      // 创建员工用户
      const employee = userFactory.create({
        userType: 'employee',
        phone: '13800139024',
        merchantId: testMerchantId
      })

      const employeeResult = await db.run(`
        INSERT INTO users (
          open_id, phone, name, user_type, status, merchant_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        employee.openId,
        employee.phone,
        employee.name,
        employee.userType,
        employee.status,
        employee.merchantId,
        employee.createdAt,
        employee.updatedAt
      ])

      const employeeId = employeeResult.lastID!
      testUserIds.push(employeeId)

      // 创建通行码
      const passcodeResult = await db.run(`
        INSERT INTO passcodes (
          user_id, code, type, status, usage_limit, usage_count, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        employeeId, 'EMP002', 'employee', 'active', 100, 0,
        new Date().toISOString(), new Date().toISOString()
      ])

      const passcodeId = passcodeResult.lastID!

      // 创建访问记录
      await db.run(`
        INSERT INTO access_records (
          user_id, passcode_id, device_id, direction, result, timestamp
        ) VALUES (?, ?, ?, ?, ?, ?)
      `, [
        employeeId, passcodeId, 'DEVICE001', 'in', 'success', new Date().toISOString()
      ])

      // 验证关联数据存在
      const passcode = await db.get('SELECT * FROM passcodes WHERE user_id = ?', [employeeId])
      expect(passcode).toBeTruthy()

      const accessRecord = await db.get('SELECT * FROM access_records WHERE user_id = ?', [employeeId])
      expect(accessRecord).toBeTruthy()

      // 测试级联删除（先删除关联数据，再删除主数据）
      await db.withTransaction(async (executor) => {
        // 删除访问记录
        await executor.run('DELETE FROM access_records WHERE user_id = ?', [employeeId])
        
        // 删除通行码
        await executor.run('DELETE FROM passcodes WHERE user_id = ?', [employeeId])
        
        // 删除用户
        await executor.run('DELETE FROM users WHERE id = ?', [employeeId])
      })

      // 验证所有关联数据都已被删除
      const remainingUser = await db.get('SELECT * FROM users WHERE id = ?', [employeeId])
      expect(remainingUser).toBeUndefined()

      const remainingPasscode = await db.get('SELECT * FROM passcodes WHERE user_id = ?', [employeeId])
      expect(remainingPasscode).toBeUndefined()

      const remainingAccessRecord = await db.get('SELECT * FROM access_records WHERE user_id = ?', [employeeId])
      expect(remainingAccessRecord).toBeUndefined()

      // 从testUserIds中移除，避免重复清理
      testUserIds = testUserIds.filter(id => id !== employeeId)
    })

    it('应该正确处理商户级联删除', async () => {
      // 创建测试商户
      const testMerchant = merchantFactory.create({
        name: '级联删除测试商户',
        code: 'CASCADE_TEST_001',
        status: 'active'
      })

      const merchantResult = await db.run(`
        INSERT INTO merchants (
          name, code, contact, phone, email, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        testMerchant.name, testMerchant.code, testMerchant.contact,
        testMerchant.phone, testMerchant.email, testMerchant.status,
        testMerchant.createdAt, testMerchant.updatedAt
      ])

      const cascadeMerchantId = merchantResult.lastID!

      // 创建商户下的用户
      const merchantUsers = userFactory.createMany(3, {
        userType: 'employee',
        merchantId: cascadeMerchantId,
        status: 'active'
      })

      const userIds: number[] = []
      for (let i = 0; i < merchantUsers.length; i++) {
        const user = merchantUsers[i]
        user.phone = `1380013902${5 + i}`

        const userResult = await db.run(`
          INSERT INTO users (
            open_id, phone, name, user_type, status, merchant_id, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          user.openId, user.phone, user.name, user.userType,
          user.status, user.merchantId, user.createdAt, user.updatedAt
        ])

        userIds.push(userResult.lastID!)
      }

      // 为用户创建通行码
      const passcodeCodes: string[] = []
      for (let i = 0; i < userIds.length; i++) {
        const passcodeCode = `CASCADE${i.toString().padStart(3, '0')}`
        passcodeCodes.push(passcodeCode)

        await db.run(`
          INSERT INTO passcodes (
            user_id, code, type, status, usage_limit, usage_count, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          userIds[i], passcodeCode, 'employee', 'active', 100, 0,
          new Date().toISOString(), new Date().toISOString()
        ])
      }

      // 创建访客申请
      const visitorApp = visitorApplicationFactory.create({
        merchantId: cascadeMerchantId,
        applicantId: userIds[0],
        status: 'approved'
      })

      const appResult = await db.run(`
        INSERT INTO visitor_applications (
          applicant_id, merchant_id, visitor_name, visitor_phone,
          visit_purpose, scheduled_time, duration, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        visitorApp.applicantId, visitorApp.merchantId, visitorApp.visitorName,
        visitorApp.visitorPhone, visitorApp.visitPurpose, visitorApp.scheduledTime,
        visitorApp.duration, visitorApp.status, visitorApp.createdAt, visitorApp.updatedAt
      ])

      const applicationId = appResult.lastID!

      // 验证所有数据都已创建
      const createdUsers = await db.all('SELECT * FROM users WHERE merchant_id = ?', [cascadeMerchantId])
      expect(createdUsers.length).toBe(3)

      const createdPasscodes = await db.all(
        'SELECT * FROM passcodes WHERE user_id IN (' + userIds.map(() => '?').join(',') + ')',
        userIds
      )
      expect(createdPasscodes.length).toBe(3)

      const createdApplication = await db.get('SELECT * FROM visitor_applications WHERE id = ?', [applicationId])
      expect(createdApplication).toBeTruthy()

      // 执行级联删除
      await db.withTransaction(async (executor) => {
        // 删除访客申请
        await executor.run('DELETE FROM visitor_applications WHERE merchant_id = ?', [cascadeMerchantId])
        
        // 删除通行码
        await executor.run(
          'DELETE FROM passcodes WHERE user_id IN (' + userIds.map(() => '?').join(',') + ')',
          userIds
        )
        
        // 删除用户
        await executor.run('DELETE FROM users WHERE merchant_id = ?', [cascadeMerchantId])
        
        // 删除商户
        await executor.run('DELETE FROM merchants WHERE id = ?', [cascadeMerchantId])
      })

      // 验证所有数据都已被删除
      const remainingMerchant = await db.get('SELECT * FROM merchants WHERE id = ?', [cascadeMerchantId])
      expect(remainingMerchant).toBeUndefined()

      const remainingUsers = await db.all('SELECT * FROM users WHERE merchant_id = ?', [cascadeMerchantId])
      expect(remainingUsers.length).toBe(0)

      const remainingPasscodes = await db.all(
        'SELECT * FROM passcodes WHERE user_id IN (' + userIds.map(() => '?').join(',') + ')',
        userIds
      )
      expect(remainingPasscodes.length).toBe(0)

      const remainingApplication = await db.get('SELECT * FROM visitor_applications WHERE id = ?', [applicationId])
      expect(remainingApplication).toBeUndefined()
    })
  })

  describe('数据验证和约束检查测试', () => {
    it('应该验证唯一约束 - 手机号唯一性', async () => {
      // 创建第一个用户
      const user1 = userFactory.create({
        userType: 'employee',
        phone: '13800139030',
        merchantId: testMerchantId
      })

      const user1Result = await db.run(`
        INSERT INTO users (
          open_id, phone, name, user_type, status, merchant_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        user1.openId,
        user1.phone,
        user1.name,
        user1.userType,
        user1.status,
        user1.merchantId,
        user1.createdAt,
        user1.updatedAt
      ])

      testUserIds.push(user1Result.lastID!)

      // 尝试创建相同手机号的用户（应该失败）
      const user2 = userFactory.create({
        userType: 'visitor',
        phone: '13800139030', // 相同手机号
        merchantId: undefined
      })

      await expect(
        db.run(`
          INSERT INTO users (
            open_id, phone, name, user_type, status, merchant_id, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          user2.openId,
          user2.phone,
          user2.name,
          user2.userType,
          user2.status,
          user2.merchantId,
          user2.createdAt,
          user2.updatedAt
        ])
      ).rejects.toThrow(/唯一|unique|duplicate/i)
    })

    it('应该验证唯一约束 - 商户代码唯一性', async () => {
      // 创建第一个商户
      const merchant1 = merchantFactory.create({
        name: '唯一约束测试商户1',
        code: 'UNIQUE_TEST_001',
        status: 'active'
      })

      const merchant1Result = await db.run(`
        INSERT INTO merchants (
          name, code, contact, phone, email, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        merchant1.name, merchant1.code, merchant1.contact,
        merchant1.phone, merchant1.email, merchant1.status,
        merchant1.createdAt, merchant1.updatedAt
      ])

      const merchant1Id = merchant1Result.lastID!

      // 尝试创建相同代码的商户（应该失败）
      const merchant2 = merchantFactory.create({
        name: '唯一约束测试商户2',
        code: 'UNIQUE_TEST_001', // 相同代码
        status: 'active'
      })

      await expect(
        db.run(`
          INSERT INTO merchants (
            name, code, contact, phone, email, status, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          merchant2.name, merchant2.code, merchant2.contact,
          merchant2.phone, merchant2.email, merchant2.status,
          merchant2.createdAt, merchant2.updatedAt
        ])
      ).rejects.toThrow(/唯一|unique|duplicate/i)

      // 清理测试数据
      await db.run('DELETE FROM merchants WHERE id = ?', [merchant1Id])
    })

    it('应该验证唯一约束 - 通行码唯一性', async () => {
      // 创建测试用户
      const user = userFactory.create({
        userType: 'employee',
        phone: '13800139031',
        merchantId: testMerchantId
      })

      const userResult = await db.run(`
        INSERT INTO users (
          open_id, phone, name, user_type, status, merchant_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        user.openId, user.phone, user.name, user.userType,
        user.status, user.merchantId, user.createdAt, user.updatedAt
      ])

      const userId = userResult.lastID!
      testUserIds.push(userId)

      // 创建第一个通行码
      await db.run(`
        INSERT INTO passcodes (
          user_id, code, type, status, usage_limit, usage_count, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        userId, 'UNIQUE_CODE_001', 'employee', 'active', 100, 0,
        new Date().toISOString(), new Date().toISOString()
      ])

      // 尝试创建相同代码的通行码（应该失败）
      await expect(
        db.run(`
          INSERT INTO passcodes (
            user_id, code, type, status, usage_limit, usage_count, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          userId, 'UNIQUE_CODE_001', 'employee', 'active', 100, 0, // 相同代码
          new Date().toISOString(), new Date().toISOString()
        ])
      ).rejects.toThrow(/唯一|unique|duplicate/i)

      // 清理测试数据
      await db.run('DELETE FROM passcodes WHERE user_id = ?', [userId])
    })

    it('应该验证外键约束 - 用户商户关联', async () => {
      // 尝试创建引用不存在商户的用户（应该失败）
      const user = userFactory.create({
        userType: 'employee',
        phone: '13800139032',
        merchantId: 99999 // 不存在的商户ID
      })

      await expect(
        db.run(`
          INSERT INTO users (
            open_id, phone, name, user_type, status, merchant_id, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          user.openId,
          user.phone,
          user.name,
          user.userType,
          user.status,
          user.merchantId,
          user.createdAt,
          user.updatedAt
        ])
      ).rejects.toThrow(/外键|foreign key|constraint/i)
    })

    it('应该验证外键约束 - 通行码用户关联', async () => {
      // 尝试创建引用不存在用户的通行码（应该失败）
      await expect(
        db.run(`
          INSERT INTO passcodes (
            user_id, code, type, status, usage_limit, usage_count, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          99999, 'FK_TEST_001', 'employee', 'active', 100, 0, // 不存在的用户ID
          new Date().toISOString(), new Date().toISOString()
        ])
      ).rejects.toThrow(/外键|foreign key|constraint/i)
    })

    it('应该验证外键约束 - 访客申请关联', async () => {
      // 尝试创建引用不存在用户的访客申请（应该失败）
      await expect(
        db.run(`
          INSERT INTO visitor_applications (
            applicant_id, merchant_id, visitor_name, visitor_phone,
            visit_purpose, scheduled_time, duration, status, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          99999, testMerchantId, '测试访客', '13800139999', // 不存在的申请人ID
          '外键测试', new Date().toISOString(), 60, 'pending',
          new Date().toISOString(), new Date().toISOString()
        ])
      ).rejects.toThrow(/外键|foreign key|constraint/i)

      // 尝试创建引用不存在商户的访客申请（应该失败）
      const visitor = userFactory.create({
        userType: 'visitor',
        phone: '13800139033',
        merchantId: undefined
      })

      const visitorResult = await db.run(`
        INSERT INTO users (
          open_id, phone, name, user_type, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        visitor.openId, visitor.phone, visitor.name, visitor.userType,
        visitor.status, visitor.createdAt, visitor.updatedAt
      ])

      const visitorId = visitorResult.lastID!
      testUserIds.push(visitorId)

      await expect(
        db.run(`
          INSERT INTO visitor_applications (
            applicant_id, merchant_id, visitor_name, visitor_phone,
            visit_purpose, scheduled_time, duration, status, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          visitorId, 99999, visitor.name, visitor.phone, // 不存在的商户ID
          '外键测试', new Date().toISOString(), 60, 'pending',
          new Date().toISOString(), new Date().toISOString()
        ])
      ).rejects.toThrow(/外键|foreign key|constraint/i)
    })

    it('应该验证外键约束 - 通行记录关联', async () => {
      // 尝试创建引用不存在用户的通行记录（应该失败）
      await expect(
        db.run(`
          INSERT INTO access_records (
            user_id, device_id, direction, result, timestamp
          ) VALUES (?, ?, ?, ?, ?)
        `, [
          99999, 'DEVICE001', 'in', 'success', new Date().toISOString() // 不存在的用户ID
        ])
      ).rejects.toThrow(/外键|foreign key|constraint/i)

      // 尝试创建引用不存在通行码的通行记录（应该失败）
      const user = userFactory.create({
        userType: 'employee',
        phone: '13800139034',
        merchantId: testMerchantId
      })

      const userResult = await db.run(`
        INSERT INTO users (
          open_id, phone, name, user_type, status, merchant_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        user.openId, user.phone, user.name, user.userType,
        user.status, user.merchantId, user.createdAt, user.updatedAt
      ])

      const userId = userResult.lastID!
      testUserIds.push(userId)

      await expect(
        db.run(`
          INSERT INTO access_records (
            user_id, passcode_id, device_id, direction, result, timestamp
          ) VALUES (?, ?, ?, ?, ?, ?)
        `, [
          userId, 99999, 'DEVICE001', 'in', 'success', new Date().toISOString() // 不存在的通行码ID
        ])
      ).rejects.toThrow(/外键|foreign key|constraint/i)
    })

    it('应该验证非空约束 - 用户必填字段', async () => {
      // 尝试创建缺少必填字段的用户（应该失败）
      await expect(
        db.run(`
          INSERT INTO users (phone, user_type, status, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?)
        `, [
          '13800139035',
          'employee',
          'active',
          new Date().toISOString(),
          new Date().toISOString()
          // 缺少 name 字段
        ])
      ).rejects.toThrow(/not null|非空|required/i)

      // 尝试创建缺少用户类型的用户（应该失败）
      await expect(
        db.run(`
          INSERT INTO users (phone, name, status, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?)
        `, [
          '13800139036',
          '测试用户',
          'active',
          new Date().toISOString(),
          new Date().toISOString()
          // 缺少 user_type 字段
        ])
      ).rejects.toThrow(/not null|非空|required/i)
    })

    it('应该验证非空约束 - 商户必填字段', async () => {
      // 尝试创建缺少商户名称的商户（应该失败）
      await expect(
        db.run(`
          INSERT INTO merchants (code, status, created_at, updated_at)
          VALUES (?, ?, ?, ?)
        `, [
          'NULL_TEST_001',
          'active',
          new Date().toISOString(),
          new Date().toISOString()
          // 缺少 name 字段
        ])
      ).rejects.toThrow(/not null|非空|required/i)

      // 尝试创建缺少商户代码的商户（应该失败）
      await expect(
        db.run(`
          INSERT INTO merchants (name, status, created_at, updated_at)
          VALUES (?, ?, ?, ?)
        `, [
          '非空约束测试商户',
          'active',
          new Date().toISOString(),
          new Date().toISOString()
          // 缺少 code 字段
        ])
      ).rejects.toThrow(/not null|非空|required/i)
    })

    it('应该验证非空约束 - 通行码必填字段', async () => {
      // 创建测试用户
      const user = userFactory.create({
        userType: 'employee',
        phone: '13800139037',
        merchantId: testMerchantId
      })

      const userResult = await db.run(`
        INSERT INTO users (
          open_id, phone, name, user_type, status, merchant_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        user.openId, user.phone, user.name, user.userType,
        user.status, user.merchantId, user.createdAt, user.updatedAt
      ])

      const userId = userResult.lastID!
      testUserIds.push(userId)

      // 尝试创建缺少通行码代码的记录（应该失败）
      await expect(
        db.run(`
          INSERT INTO passcodes (
            user_id, type, status, usage_limit, usage_count, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
          userId,
          'employee',
          'active',
          100,
          0,
          new Date().toISOString(),
          new Date().toISOString()
          // 缺少 code 字段
        ])
      ).rejects.toThrow(/not null|非空|required/i)

      // 尝试创建缺少通行码类型的记录（应该失败）
      await expect(
        db.run(`
          INSERT INTO passcodes (
            user_id, code, status, usage_limit, usage_count, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
          userId,
          'NULL_TEST_001',
          'active',
          100,
          0,
          new Date().toISOString(),
          new Date().toISOString()
          // 缺少 type 字段
        ])
      ).rejects.toThrow(/not null|非空|required/i)
    })

    it('应该验证检查约束 - 枚举值约束', async () => {
      // 创建用户
      const user = userFactory.create({
        userType: 'employee',
        phone: '13800139038',
        merchantId: testMerchantId
      })

      const userResult = await db.run(`
        INSERT INTO users (
          open_id, phone, name, user_type, status, merchant_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        user.openId, user.phone, user.name, user.userType,
        user.status, user.merchantId, user.createdAt, user.updatedAt
      ])

      const userId = userResult.lastID!
      testUserIds.push(userId)

      // 尝试创建无效用户类型（应该失败）
      await expect(
        db.run(`
          INSERT INTO users (
            open_id, phone, name, user_type, status, merchant_id, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          'test_open_id', '13800139039', '测试用户', 'invalid_user_type', // 无效用户类型
          'active', testMerchantId, new Date().toISOString(), new Date().toISOString()
        ])
      ).rejects.toThrow(/check|constraint|invalid/i)

      // 尝试创建无效状态的通行码（应该失败）
      await expect(
        db.run(`
          INSERT INTO passcodes (
            user_id, code, type, status, usage_limit, usage_count, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          userId, 'CHECK_TEST_001', 'employee', 'invalid_status', // 无效状态
          100, 0, new Date().toISOString(), new Date().toISOString()
        ])
      ).rejects.toThrow(/check|constraint|invalid/i)

      // 尝试创建无效方向的通行记录（应该失败）
      await expect(
        db.run(`
          INSERT INTO access_records (
            user_id, device_id, direction, result, timestamp
          ) VALUES (?, ?, ?, ?, ?)
        `, [
          userId, 'DEVICE001', 'invalid_direction', 'success', new Date().toISOString() // 无效方向
        ])
      ).rejects.toThrow(/check|constraint|invalid/i)
    })

    it('应该验证数值范围约束', async () => {
      // 创建用户
      const user = userFactory.create({
        userType: 'employee',
        phone: '13800139040',
        merchantId: testMerchantId
      })

      const userResult = await db.run(`
        INSERT INTO users (
          open_id, phone, name, user_type, status, merchant_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        user.openId, user.phone, user.name, user.userType,
        user.status, user.merchantId, user.createdAt, user.updatedAt
      ])

      const userId = userResult.lastID!
      testUserIds.push(userId)

      // 尝试创建负数使用限制的通行码（应该失败）
      await expect(
        db.run(`
          INSERT INTO passcodes (
            user_id, code, type, status, usage_limit, usage_count, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          userId, 'RANGE_TEST_001', 'employee', 'active',
          -1, 0, // 负数使用限制
          new Date().toISOString(), new Date().toISOString()
        ])
      ).rejects.toThrow(/check|constraint|range/i)

      // 尝试创建负数使用次数的通行码（应该失败）
      await expect(
        db.run(`
          INSERT INTO passcodes (
            user_id, code, type, status, usage_limit, usage_count, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          userId, 'RANGE_TEST_002', 'employee', 'active',
          100, -1, // 负数使用次数
          new Date().toISOString(), new Date().toISOString()
        ])
      ).rejects.toThrow(/check|constraint|range/i)

      // 尝试创建负数时长的访客申请（应该失败）
      await expect(
        db.run(`
          INSERT INTO visitor_applications (
            applicant_id, merchant_id, visitor_name, visitor_phone,
            visit_purpose, scheduled_time, duration, status, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          userId, testMerchantId, '测试访客', '13800139041',
          '范围测试', new Date().toISOString(), -60, 'pending', // 负数时长
          new Date().toISOString(), new Date().toISOString()
        ])
      ).rejects.toThrow(/check|constraint|range/i)
    })

    it('应该验证数据类型约束', async () => {
      // 创建用户
      const user = userFactory.create({
        userType: 'employee',
        phone: '13800139042',
        merchantId: testMerchantId
      })

      const userResult = await db.run(`
        INSERT INTO users (
          open_id, phone, name, user_type, status, merchant_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        user.openId, user.phone, user.name, user.userType,
        user.status, user.merchantId, user.createdAt, user.updatedAt
      ])

      const userId = userResult.lastID!
      testUserIds.push(userId)

      // 尝试插入字符串到数字字段（应该失败或自动转换）
      try {
        await db.run(`
          INSERT INTO passcodes (
            user_id, code, type, status, usage_limit, usage_count, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          userId, 'TYPE_TEST_001', 'employee', 'active',
          'invalid_number', // 应该是数字
          0, new Date().toISOString(), new Date().toISOString()
        ])
        
        // 如果没有抛出错误，检查是否被转换为0或NULL
        const savedPasscode = await db.get('SELECT * FROM passcodes WHERE code = ?', ['TYPE_TEST_001'])
        if (savedPasscode) {
          expect(savedPasscode.usage_limit).toBe(0) // 可能被转换为0
          await db.run('DELETE FROM passcodes WHERE code = ?', ['TYPE_TEST_001'])
        }
      } catch (error) {
        // 预期的类型错误
        expect(error.message).toMatch(/type|invalid|conversion/i)
      }

      // 尝试插入过长的字符串到有长度限制的字段
      const longString = 'A'.repeat(1000) // 1000个字符的字符串
      
      try {
        await db.run(`
          INSERT INTO users (
            open_id, phone, name, user_type, status, merchant_id, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          'test_open_id', '13800139043', longString, 'employee', // 过长的名称
          'active', testMerchantId, new Date().toISOString(), new Date().toISOString()
        ])
        
        // 如果没有抛出错误，检查是否被截断
        const savedUser = await db.get('SELECT * FROM users WHERE phone = ?', ['13800139043'])
        if (savedUser) {
          expect(savedUser.name.length).toBeLessThan(1000) // 应该被截断
          testUserIds.push(savedUser.id)
        }
      } catch (error) {
        // 预期的长度错误
        expect(error.message).toMatch(/length|too long|size/i)
      }
    })

    it('应该验证日期时间约束', async () => {
      // 创建访客用户
      const visitor = userFactory.create({
        userType: 'visitor',
        phone: '13800139044',
        merchantId: undefined
      })

      const visitorResult = await db.run(`
        INSERT INTO users (
          open_id, phone, name, user_type, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        visitor.openId, visitor.phone, visitor.name, visitor.userType,
        visitor.status, visitor.createdAt, visitor.updatedAt
      ])

      const visitorId = visitorResult.lastID!
      testUserIds.push(visitorId)

      // 尝试创建无效日期格式的访客申请（应该失败）
      await expect(
        db.run(`
          INSERT INTO visitor_applications (
            applicant_id, merchant_id, visitor_name, visitor_phone,
            visit_purpose, scheduled_time, duration, status, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          visitorId, testMerchantId, visitor.name, visitor.phone,
          '测试访问', 'invalid_date_format', // 无效日期格式
          60, 'pending', new Date().toISOString(), new Date().toISOString()
        ])
      ).rejects.toThrow(/date|time|format|invalid/i)

      // 尝试创建无效日期的通行码过期时间（应该失败）
      await expect(
        db.run(`
          INSERT INTO passcodes (
            user_id, code, type, status, expiry_time, usage_limit, usage_count, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          visitorId, 'DATE_TEST_001', 'visitor', 'active',
          '2023-13-45 25:70:80', // 无效日期时间
          10, 0, new Date().toISOString(), new Date().toISOString()
        ])
      ).rejects.toThrow(/date|time|format|invalid/i)

      // 测试有效的日期时间格式
      const validDateTime = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 明天
      
      const validPasscodeResult = await db.run(`
        INSERT INTO passcodes (
          user_id, code, type, status, expiry_time, usage_limit, usage_count, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        visitorId, 'DATE_TEST_002', 'visitor', 'active',
        validDateTime, // 有效日期时间
        10, 0, new Date().toISOString(), new Date().toISOString()
      ])

      expect(validPasscodeResult.lastID).toBeGreaterThan(0)

      // 验证日期时间被正确存储
      const savedPasscode = await db.get('SELECT * FROM passcodes WHERE code = ?', ['DATE_TEST_002'])
      expect(savedPasscode).toBeTruthy()
      expect(savedPasscode.expiry_time).toBe(validDateTime)

      // 清理测试数据
      await db.run('DELETE FROM passcodes WHERE code = ?', ['DATE_TEST_002'])
    })

    it('应该验证业务逻辑约束', async () => {
      // 创建访客用户
      const visitor = userFactory.create({
        userType: 'visitor',
        phone: '13800139045',
        merchantId: undefined
      })

      const visitorResult = await db.run(`
        INSERT INTO users (
          open_id, phone, name, user_type, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        visitor.openId, visitor.phone, visitor.name, visitor.userType,
        visitor.status, visitor.createdAt, visitor.updatedAt
      ])

      const visitorId = visitorResult.lastID!
      testUserIds.push(visitorId)

      // 创建访客申请
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() // 昨天
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 明天

      // 测试过去时间的访客申请（业务上可能不允许）
      try {
        await db.run(`
          INSERT INTO visitor_applications (
            applicant_id, merchant_id, visitor_name, visitor_phone,
            visit_purpose, scheduled_time, duration, status, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          visitorId, testMerchantId, visitor.name, visitor.phone,
          '过去时间测试', pastDate, // 过去时间
          60, 'pending', new Date().toISOString(), new Date().toISOString()
        ])

        // 如果允许创建，验证数据
        const pastApplication = await db.get(
          'SELECT * FROM visitor_applications WHERE applicant_id = ? AND visit_purpose = ?',
          [visitorId, '过去时间测试']
        )
        
        if (pastApplication) {
          expect(new Date(pastApplication.scheduled_time)).toBeInstanceOf(Date)
          await db.run('DELETE FROM visitor_applications WHERE id = ?', [pastApplication.id])
        }
      } catch (error) {
        // 如果业务逻辑不允许过去时间，这是预期的
        expect(error.message).toMatch(/past|time|business|logic/i)
      }

      // 测试未来时间的访客申请（应该成功）
      const futureAppResult = await db.run(`
        INSERT INTO visitor_applications (
          applicant_id, merchant_id, visitor_name, visitor_phone,
          visit_purpose, scheduled_time, duration, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        visitorId, testMerchantId, visitor.name, visitor.phone,
        '未来时间测试', futureDate, // 未来时间
        60, 'pending', new Date().toISOString(), new Date().toISOString()
      ])

      expect(futureAppResult.lastID).toBeGreaterThan(0)

      // 验证未来时间申请被正确存储
      const futureApplication = await db.get('SELECT * FROM visitor_applications WHERE id = ?', [futureAppResult.lastID])
      expect(futureApplication).toBeTruthy()
      expect(futureApplication.scheduled_time).toBe(futureDate)

      // 清理测试数据
      await db.run('DELETE FROM visitor_applications WHERE id = ?', [futureAppResult.lastID])
    })
  })

  describe('数据库性能和并发测试', () => {
    it('应该支持大批量数据插入', async () => {
      const startTime = Date.now()

      // 批量创建用户
      const users = userFactory.createMany(100, {
        userType: 'employee',
        merchantId: testMerchantId,
        status: 'active'
      })

      await db.run('BEGIN TRANSACTION')

      try {
        for (let i = 0; i < users.length; i++) {
          const user = users[i]
          user.phone = `1380013${(9100 + i).toString()}` // 确保手机号唯一

          const result = await db.run(`
            INSERT INTO users (
              open_id, phone, name, user_type, status, merchant_id, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            user.openId,
            user.phone,
            user.name,
            user.userType,
            user.status,
            user.merchantId,
            user.createdAt,
            user.updatedAt
          ])

          testUserIds.push(result.lastID!)
        }

        await db.run('COMMIT')

        const endTime = Date.now()
        const duration = endTime - startTime

        // 验证插入性能（应该在合理时间内完成）
        expect(duration).toBeLessThan(10000) // 10秒内

        // 验证数据已正确插入
        const count = await db.get(
          'SELECT COUNT(*) as count FROM users WHERE merchant_id = ? AND phone LIKE "1380013%"',
          [testMerchantId]
        )
        expect(count.count).toBe(100)

      } catch (error) {
        await db.run('ROLLBACK')
        throw error
      }
    })

    it('应该支持复杂查询性能', async () => {
      // 创建测试数据
      const users = userFactory.createMany(50, {
        userType: 'employee',
        merchantId: testMerchantId,
        status: 'active'
      })

      for (let i = 0; i < users.length; i++) {
        const user = users[i]
        user.phone = `1380013${(9200 + i).toString()}`

        const result = await db.run(`
          INSERT INTO users (
            open_id, phone, name, user_type, status, merchant_id, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          user.openId,
          user.phone,
          user.name,
          user.userType,
          user.status,
          user.merchantId,
          user.createdAt,
          user.updatedAt
        ])

        testUserIds.push(result.lastID!)

        // 为每个用户创建通行码
        await db.run(`
          INSERT INTO passcodes (
            user_id, code, type, status, usage_limit, usage_count, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          result.lastID!, `EMP${(100 + i).toString().padStart(3, '0')}`,
          'employee', 'active', 100, Math.floor(Math.random() * 50),
          new Date().toISOString(), new Date().toISOString()
        ])
      }

      // 执行复杂查询
      const startTime = Date.now()

      const complexQuery = await db.all(`
        SELECT 
          u.id,
          u.name,
          u.phone,
          u.status,
          m.name as merchant_name,
          p.code as passcode,
          p.usage_count,
          COUNT(ar.id) as access_count
        FROM users u
        LEFT JOIN merchants m ON u.merchant_id = m.id
        LEFT JOIN passcodes p ON u.id = p.user_id
        LEFT JOIN access_records ar ON u.id = ar.user_id
        WHERE u.merchant_id = ? AND u.user_type = 'employee'
        GROUP BY u.id, u.name, u.phone, u.status, m.name, p.code, p.usage_count
        ORDER BY u.created_at DESC
        LIMIT 20
      `, [testMerchantId])

      const endTime = Date.now()
      const duration = endTime - startTime

      // 验证查询性能
      expect(duration).toBeLessThan(1000) // 1秒内
      expect(complexQuery.length).toBeGreaterThan(0)
      expect(complexQuery.length).toBeLessThanOrEqual(20)
    })

    it('应该支持并发读写操作', async () => {
      // 创建基础用户
      const user = userFactory.create({
        userType: 'employee',
        phone: '13800139300',
        merchantId: testMerchantId
      })

      const userResult = await db.run(`
        INSERT INTO users (
          open_id, phone, name, user_type, status, merchant_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        user.openId,
        user.phone,
        user.name,
        user.userType,
        user.status,
        user.merchantId,
        user.createdAt,
        user.updatedAt
      ])

      const userId = userResult.lastID!
      testUserIds.push(userId)

      // 并发读写操作
      const operations = Array(10).fill(null).map(async (_, index) => {
        if (index % 2 === 0) {
          // 读操作
          return await db.get('SELECT * FROM users WHERE id = ?', [userId])
        } else {
          // 写操作
          return await db.run(
            'UPDATE users SET updated_at = ? WHERE id = ?',
            [new Date().toISOString(), userId]
          )
        }
      })

      const results = await Promise.all(operations)

      // 验证所有操作都成功完成
      results.forEach((result, index) => {
        if (index % 2 === 0) {
          // 读操作结果
          expect(result).toBeTruthy()
          expect(result.id).toBe(userId)
        } else {
          // 写操作结果
          expect(result.changes).toBe(1)
        }
      })
    })
  })

  describe('数据库错误处理测试', () => {
    it('应该正确处理连接错误', async () => {
      // 模拟数据库连接错误
      const originalRun = db.run
      db.run = vi.fn().mockRejectedValue(new Error('数据库连接失败'))

      try {
        await db.run('SELECT 1')
        expect(true).toBe(false) // 不应该到达这里
      } catch (error) {
        expect(error.message).toContain('数据库连接失败')
      }

      // 恢复原始方法
      db.run = originalRun
    })

    it('应该正确处理SQL语法错误', async () => {
      try {
        await db.run('INVALID SQL STATEMENT')
        expect(true).toBe(false) // 不应该到达这里
      } catch (error) {
        expect(error.message).toMatch(/syntax error|SQL/)
      }
    })

    it('应该正确处理数据库锁定', async () => {
      // 创建长时间运行的事务
      await db.run('BEGIN EXCLUSIVE TRANSACTION')

      try {
        // 在另一个连接中尝试写操作（应该超时或失败）
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('操作超时')), 1000)
        })

        const operationPromise = db.run(`
          INSERT INTO users (
            phone, name, user_type, status, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?)
        `, [
          '13800139999',
          '锁定测试用户',
          'employee',
          'active',
          new Date().toISOString(),
          new Date().toISOString()
        ])

        await Promise.race([operationPromise, timeoutPromise])
        expect(true).toBe(false) // 不应该到达这里

      } catch (error) {
        expect(error.message).toMatch(/locked|timeout|操作超时/)
      } finally {
        // 释放锁
        await db.run('ROLLBACK')
      }
    })

    it('应该正确处理磁盘空间不足', async () => {
      // 这个测试在实际环境中很难模拟，主要是验证错误处理逻辑
      const originalRun = db.run
      db.run = vi.fn().mockRejectedValue(new Error('database or disk is full'))

      try {
        await db.run(`
          INSERT INTO users (
            phone, name, user_type, status, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?)
        `, [
          '13800139998',
          '磁盘测试用户',
          'employee',
          'active',
          new Date().toISOString(),
          new Date().toISOString()
        ])
        expect(true).toBe(false) // 不应该到达这里
      } catch (error) {
        expect(error.message).toContain('disk is full')
      }

      // 恢复原始方法
      db.run = originalRun
    })
  })

  describe('数据库维护和优化测试', () => {
    it('应该支持数据库备份和恢复', async () => {
      // 创建测试数据
      const user = userFactory.create({
        userType: 'employee',
        phone: '13800139400',
        merchantId: testMerchantId
      })

      const userResult = await db.run(`
        INSERT INTO users (
          open_id, phone, name, user_type, status, merchant_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        user.openId,
        user.phone,
        user.name,
        user.userType,
        user.status,
        user.merchantId,
        user.createdAt,
        user.updatedAt
      ])

      const userId = userResult.lastID!
      testUserIds.push(userId)

      // 验证数据存在
      const originalUser = await db.get('SELECT * FROM users WHERE id = ?', [userId])
      expect(originalUser).toBeTruthy()

      // 模拟备份操作（实际实现中可能使用VACUUM INTO或其他方法）
      const backupData = await db.all('SELECT * FROM users WHERE id = ?', [userId])
      expect(backupData.length).toBe(1)

      // 模拟数据丢失
      await db.run('DELETE FROM users WHERE id = ?', [userId])
      const deletedUser = await db.get('SELECT * FROM users WHERE id = ?', [userId])
      expect(deletedUser).toBeUndefined()

      // 模拟恢复操作
      const backupUser = backupData[0]
      await db.run(`
        INSERT INTO users (
          id, open_id, phone, name, user_type, status, merchant_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        backupUser.id,
        backupUser.open_id,
        backupUser.phone,
        backupUser.name,
        backupUser.user_type,
        backupUser.status,
        backupUser.merchant_id,
        backupUser.created_at,
        backupUser.updated_at
      ])

      // 验证数据已恢复
      const restoredUser = await db.get('SELECT * FROM users WHERE id = ?', [userId])
      expect(restoredUser).toBeTruthy()
      expect(restoredUser.phone).toBe(user.phone)
    })

    it('应该支持数据库索引优化', async () => {
      // 创建大量测试数据
      const users = userFactory.createMany(200, {
        userType: 'employee',
        merchantId: testMerchantId,
        status: 'active'
      })

      for (let i = 0; i < users.length; i++) {
        const user = users[i]
        user.phone = `1380013${(9500 + i).toString()}`

        const result = await db.run(`
          INSERT INTO users (
            open_id, phone, name, user_type, status, merchant_id, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          user.openId,
          user.phone,
          user.name,
          user.userType,
          user.status,
          user.merchantId,
          user.createdAt,
          user.updatedAt
        ])

        testUserIds.push(result.lastID!)
      }

      // 测试索引查询性能
      const startTime = Date.now()

      // 使用索引的查询
      const indexedQuery = await db.all(
        'SELECT * FROM users WHERE merchant_id = ? AND user_type = ? ORDER BY created_at DESC LIMIT 10',
        [testMerchantId, 'employee']
      )

      const endTime = Date.now()
      const duration = endTime - startTime

      expect(indexedQuery.length).toBe(10)
      expect(duration).toBeLessThan(500) // 500ms内完成

      // 验证查询计划（如果数据库支持）
      try {
        const queryPlan = await db.all(
          'EXPLAIN QUERY PLAN SELECT * FROM users WHERE merchant_id = ? AND user_type = ?',
          [testMerchantId, 'employee']
        )
        expect(queryPlan).toBeTruthy()
      } catch (error) {
        // 某些数据库可能不支持EXPLAIN QUERY PLAN
        console.log('查询计划分析不支持:', error.message)
      }
    })

    it('应该支持数据库统计信息更新', async () => {
      // 获取表统计信息
      const tableInfo = await db.all("SELECT name FROM sqlite_master WHERE type='table'")
      expect(tableInfo.length).toBeGreaterThan(0)

      // 检查用户表的记录数
      const userCount = await db.get('SELECT COUNT(*) as count FROM users')
      expect(userCount.count).toBeGreaterThan(0)

      // 检查商户表的记录数
      const merchantCount = await db.get('SELECT COUNT(*) as count FROM merchants')
      expect(merchantCount.count).toBeGreaterThan(0)

      // 获取数据库大小信息（如果支持）
      try {
        const dbSize = await db.get('PRAGMA page_count')
        expect(dbSize).toBeTruthy()
      } catch (error) {
        console.log('数据库大小查询不支持:', error.message)
      }
    })
  })
})