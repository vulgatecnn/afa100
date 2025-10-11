/**
 * 简单集成测试 - 验证基本的后端集成测试功能
 * 测试数据库连接、基本API功能和认证流程
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest'
import { Database } from '../../src/utils/database.js'
import { userFactory, merchantFactory } from '../../../../shared/test-factories/index.js'
import { TestErrorHandler, createTestContext } from '../../../../shared/test-helpers/error-handler.js'

describe('简单集成测试', () => {
  let db: Database

  const testContext = createTestContext(
    '简单集成测试',
    'simple-integration.test.ts',
    'backend',
    'integration'
  )

  beforeAll(async () => {
    try {
      // 初始化测试数据库
      db = Database.getInstance()
      await db.init()
    } catch (error) {
      TestErrorHandler.handle(error as Error, testContext)
      throw error
    }
  })

  afterAll(async () => {
    try {
      await db.close()
    } catch (error) {
      TestErrorHandler.handle(error as Error, testContext)
    }
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('数据库集成测试', () => {
    it('应该能连接到数据库', async () => {
      const result = await db.get('SELECT 1 as test')
      expect(result).toBeTruthy()
      expect(result.test).toBe(1)
    })

    it('应该能创建和查询用户', async () => {
      const user = userFactory.create({
        userType: 'employee',
        phone: '13800138000',
        name: '测试用户',
        status: 'active'
      })

      // 插入用户
      const result = await db.run(`
        INSERT INTO users (
          open_id, phone, name, user_type, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        user.openId,
        user.phone,
        user.name,
        user.userType,
        user.status,
        user.createdAt,
        user.updatedAt
      ])

      expect(result.lastID).toBeTruthy()

      // 查询用户
      const savedUser = await db.get('SELECT * FROM users WHERE id = ?', [result.lastID])
      expect(savedUser).toBeTruthy()
      expect(savedUser.phone).toBe(user.phone)
      expect(savedUser.name).toBe(user.name)

      // 清理测试数据
      await db.run('DELETE FROM users WHERE id = ?', [result.lastID])
    })

    it('应该能创建和查询商户', async () => {
      const merchant = merchantFactory.create({
        name: '测试商户',
        code: 'TEST001',
        status: 'active'
      })

      // 插入商户
      const result = await db.run(`
        INSERT INTO merchants (
          name, code, contact, phone, email, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        merchant.name,
        merchant.code,
        merchant.contact,
        merchant.phone,
        merchant.email,
        merchant.status,
        merchant.createdAt,
        merchant.updatedAt
      ])

      expect(result.lastID).toBeTruthy()

      // 查询商户
      const savedMerchant = await db.get('SELECT * FROM merchants WHERE id = ?', [result.lastID])
      expect(savedMerchant).toBeTruthy()
      expect(savedMerchant.name).toBe(merchant.name)
      expect(savedMerchant.code).toBe(merchant.code)

      // 清理测试数据
      await db.run('DELETE FROM merchants WHERE id = ?', [result.lastID])
    })
  })

  describe('事务测试', () => {
    it('应该支持事务提交', async () => {
      await db.run('BEGIN TRANSACTION')

      try {
        const user = userFactory.create({
          userType: 'employee',
          phone: '13800138001',
          name: '事务测试用户'
        })

        const result = await db.run(`
          INSERT INTO users (
            open_id, phone, name, user_type, status, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
          user.openId,
          user.phone,
          user.name,
          user.userType,
          user.status,
          user.createdAt,
          user.updatedAt
        ])

        await db.run('COMMIT')

        // 验证数据已保存
        const savedUser = await db.get('SELECT * FROM users WHERE id = ?', [result.lastID])
        expect(savedUser).toBeTruthy()

        // 清理测试数据
        await db.run('DELETE FROM users WHERE id = ?', [result.lastID])

      } catch (error) {
        await db.run('ROLLBACK')
        throw error
      }
    })

    it('应该支持事务回滚', async () => {
      await db.run('BEGIN TRANSACTION')

      let userId: number

      try {
        const user = userFactory.create({
          userType: 'employee',
          phone: '13800138002',
          name: '回滚测试用户'
        })

        const result = await db.run(`
          INSERT INTO users (
            open_id, phone, name, user_type, status, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
          user.openId,
          user.phone,
          user.name,
          user.userType,
          user.status,
          user.createdAt,
          user.updatedAt
        ])

        userId = result.lastID!

        // 故意触发错误
        await db.run('INSERT INTO invalid_table VALUES (1)')

      } catch (error) {
        await db.run('ROLLBACK')

        // 验证数据未保存
        const savedUser = await db.get('SELECT * FROM users WHERE id = ?', [userId!])
        expect(savedUser).toBeUndefined()
      }
    })
  })

  describe('数据工厂测试', () => {
    it('应该能生成有效的用户数据', () => {
      const user = userFactory.create()
      
      expect(user).toBeTruthy()
      expect(user.id).toBeTruthy()
      expect(user.name).toBeTruthy()
      expect(user.userType).toBeTruthy()
      expect(user.status).toBeTruthy()
      expect(user.createdAt).toBeTruthy()
      expect(user.updatedAt).toBeTruthy()
    })

    it('应该能生成有效的商户数据', () => {
      const merchant = merchantFactory.create()
      
      expect(merchant).toBeTruthy()
      expect(merchant.id).toBeTruthy()
      expect(merchant.name).toBeTruthy()
      expect(merchant.code).toBeTruthy()
      expect(merchant.status).toBeTruthy()
      expect(merchant.createdAt).toBeTruthy()
      expect(merchant.updatedAt).toBeTruthy()
    })

    it('应该能批量生成数据', () => {
      const users = userFactory.createMany(5)
      expect(users).toHaveLength(5)
      
      users.forEach(user => {
        expect(user.id).toBeTruthy()
        expect(user.name).toBeTruthy()
      })
    })

    it('应该支持数据覆盖', () => {
      const user = userFactory.create({
        name: '自定义用户名',
        userType: 'tenant_admin'
      })
      
      expect(user.name).toBe('自定义用户名')
      expect(user.userType).toBe('tenant_admin')
    })
  })

  describe('错误处理测试', () => {
    it('应该处理数据库错误', async () => {
      try {
        await db.run('SELECT * FROM non_existent_table')
        expect(true).toBe(false) // 不应该到达这里
      } catch (error) {
        expect(error).toBeTruthy()
        expect(error.message).toContain('no such table')
      }
    })

    it('应该处理约束违反错误', async () => {
      const user1 = userFactory.create({
        phone: '13800138003',
        name: '用户1'
      })

      // 插入第一个用户
      await db.run(`
        INSERT INTO users (
          open_id, phone, name, user_type, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        user1.openId,
        user1.phone,
        user1.name,
        user1.userType,
        user1.status,
        user1.createdAt,
        user1.updatedAt
      ])

      try {
        const user2 = userFactory.create({
          phone: '13800138003', // 相同手机号
          name: '用户2'
        })

        // 尝试插入相同手机号的用户
        await db.run(`
          INSERT INTO users (
            open_id, phone, name, user_type, status, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
          user2.openId,
          user2.phone,
          user2.name,
          user2.userType,
          user2.status,
          user2.createdAt,
          user2.updatedAt
        ])

        expect(true).toBe(false) // 不应该到达这里

      } catch (error) {
        expect(error).toBeTruthy()
        expect(error.message).toContain('UNIQUE constraint failed')
      } finally {
        // 清理测试数据
        await db.run('DELETE FROM users WHERE phone = ?', ['13800138003'])
      }
    })
  })

  describe('性能测试', () => {
    it('应该能处理批量插入', async () => {
      const startTime = Date.now()
      const users = userFactory.createMany(100)

      await db.run('BEGIN TRANSACTION')

      try {
        for (let i = 0; i < users.length; i++) {
          const user = users[i]
          user.phone = `1380013${(8100 + i).toString()}`

          await db.run(`
            INSERT INTO users (
              open_id, phone, name, user_type, status, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
          `, [
            user.openId,
            user.phone,
            user.name,
            user.userType,
            user.status,
            user.createdAt,
            user.updatedAt
          ])
        }

        await db.run('COMMIT')

        const endTime = Date.now()
        const duration = endTime - startTime

        // 验证性能
        expect(duration).toBeLessThan(5000) // 5秒内完成

        // 验证数据
        const count = await db.get('SELECT COUNT(*) as count FROM users WHERE phone LIKE "1380013%"')
        expect(count.count).toBe(100)

        // 清理测试数据
        await db.run('DELETE FROM users WHERE phone LIKE "1380013%"')

      } catch (error) {
        await db.run('ROLLBACK')
        throw error
      }
    })

    it('应该能处理复杂查询', async () => {
      // 创建测试数据
      const merchant = merchantFactory.create({
        name: '性能测试商户',
        code: 'PERF001'
      })

      const merchantResult = await db.run(`
        INSERT INTO merchants (
          name, code, contact, phone, email, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        merchant.name,
        merchant.code,
        merchant.contact,
        merchant.phone,
        merchant.email,
        merchant.status,
        merchant.createdAt,
        merchant.updatedAt
      ])

      const merchantId = merchantResult.lastID!

      // 创建多个用户
      const users = userFactory.createMany(20, {
        userType: 'employee',
        merchantId: merchantId,
        status: 'active'
      })

      for (let i = 0; i < users.length; i++) {
        const user = users[i]
        user.phone = `1380013${(8200 + i).toString()}`

        await db.run(`
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
      }

      // 执行复杂查询
      const startTime = Date.now()

      const result = await db.all(`
        SELECT 
          u.id,
          u.name,
          u.phone,
          u.user_type,
          u.status,
          m.name as merchant_name,
          m.code as merchant_code
        FROM users u
        LEFT JOIN merchants m ON u.merchant_id = m.id
        WHERE u.merchant_id = ? AND u.user_type = 'employee'
        ORDER BY u.created_at DESC
      `, [merchantId])

      const endTime = Date.now()
      const duration = endTime - startTime

      // 验证性能
      expect(duration).toBeLessThan(1000) // 1秒内完成
      expect(result.length).toBe(20)

      // 清理测试数据
      await db.run('DELETE FROM users WHERE merchant_id = ?', [merchantId])
      await db.run('DELETE FROM merchants WHERE id = ?', [merchantId])
    })
  })
})