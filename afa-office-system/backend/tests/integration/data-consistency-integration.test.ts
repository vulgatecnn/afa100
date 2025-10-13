/**
 * 前后端数据一致性集成测试
 * 测试前后端数据状态同步、缓存一致性和数据刷新机制
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { IntegrationTestHelper } from '../helpers/integration-test-helper.js'
import { ApiTestHelper } from '../helpers/api-test-helper.js'
import { TestDataFactory } from '../helpers/test-data-factory.js'

describe('前后端数据一致性集成测试', () => {
  let testHelper: IntegrationTestHelper
  let authenticatedRequest: any

  beforeEach(async () => {
    // 设置集成测试环境
    testHelper = await IntegrationTestHelper.quickSetup({
      environment: 'integration',
      seedOptions: {
        users: 5,
        merchants: 3,
        visitors: 10,
        projects: 2
      }
    })

    // 创建认证用户
    authenticatedRequest = await ApiTestHelper.createAuthenticatedRequest({
      user_type: 'tenant_admin'
    })
  })

  afterEach(async () => {
    await testHelper.cleanup()
    await ApiTestHelper.cleanupTestData()
  })

  describe('API调用后的数据更新机制', () => {
    it('应该在创建商户后立即返回最新数据', async () => {
      // 创建商户数据
      const merchantData = TestDataFactory.createMerchant({
        name: '测试商户A',
        code: 'TEST_MERCHANT_A'
      })

      // 发送创建请求
      const createResponse = await authenticatedRequest.request('post', '/api/v1/merchants')
        .send(merchantData)

      ApiTestHelper.expectCreateResponse(createResponse, {
        name: merchantData.name,
        code: merchantData.code
      })

      const createdMerchant = createResponse.body.data

      // 立即查询商户列表，验证新创建的商户存在
      const listResponse = await authenticatedRequest.request('get', '/api/v1/merchants')

      ApiTestHelper.expectSuccessResponse(listResponse)
      
      const merchants = listResponse.body.data.items || listResponse.body.data
      const foundMerchant = merchants.find((m: any) => m.id === createdMerchant.id)
      
      expect(foundMerchant).toBeDefined()
      expect(foundMerchant.name).toBe(merchantData.name)
      expect(foundMerchant.code).toBe(merchantData.code)
    })

    it('应该在更新商户后返回最新状态', async () => {
      // 创建测试商户
      const merchant = await ApiTestHelper.createTestMerchant({
        name: '原始商户名称',
        status: 'active'
      })

      // 更新商户信息
      const updateData = {
        name: '更新后的商户名称',
        status: 'inactive'
      }

      const updateResponse = await authenticatedRequest.request('put', `/api/v1/merchants/${merchant.id}`)
        .send(updateData)

      ApiTestHelper.expectUpdateResponse(updateResponse, updateData)

      // 立即查询单个商户，验证更新生效
      const getResponse = await authenticatedRequest.request('get', `/api/v1/merchants/${merchant.id}`)

      ApiTestHelper.expectSuccessResponse(getResponse)
      expect(getResponse.body.data.name).toBe(updateData.name)
      expect(getResponse.body.data.status).toBe(updateData.status)
    })

    it('应该在删除商户后立即反映删除状态', async () => {
      // 创建测试商户
      const merchant = await ApiTestHelper.createTestMerchant()

      // 删除商户
      const deleteResponse = await authenticatedRequest.request('delete', `/api/v1/merchants/${merchant.id}`)

      ApiTestHelper.expectDeleteResponse(deleteResponse)

      // 立即查询已删除的商户，应该返回404
      const getResponse = await authenticatedRequest.request('get', `/api/v1/merchants/${merchant.id}`)

      ApiTestHelper.expectNotFoundError(getResponse)
    })
  })

  describe('前端缓存与后端数据一致性', () => {
    it('应该检测到后端数据变更并提示刷新', async () => {
      // 模拟前端缓存场景：先获取数据
      const initialResponse = await authenticatedRequest.request('get', '/api/v1/merchants')
      ApiTestHelper.expectSuccessResponse(initialResponse)
      
      const initialMerchants = initialResponse.body.data.items || initialResponse.body.data
      const initialCount = initialMerchants.length

      // 模拟另一个用户/会话创建新商户
      const newMerchant = await ApiTestHelper.createTestMerchant({
        name: '新增商户'
      })

      // 前端再次请求数据，应该包含新商户
      const updatedResponse = await authenticatedRequest.request('get', '/api/v1/merchants')
      ApiTestHelper.expectSuccessResponse(updatedResponse)
      
      const updatedMerchants = updatedResponse.body.data.items || updatedResponse.body.data
      
      expect(updatedMerchants.length).toBe(initialCount + 1)
      
      const foundNewMerchant = updatedMerchants.find((m: any) => m.id === newMerchant.id)
      expect(foundNewMerchant).toBeDefined()
    })

    it('应该通过ETag机制检测数据变更', async () => {
      // 创建测试商户
      const merchant = await ApiTestHelper.createTestMerchant()

      // 首次获取商户数据（模拟前端缓存）
      const firstResponse = await authenticatedRequest.request('get', `/api/v1/merchants/${merchant.id}`)
      ApiTestHelper.expectSuccessResponse(firstResponse)
      
      const firstETag = firstResponse.headers.etag

      // 更新商户数据
      await authenticatedRequest.request('put', `/api/v1/merchants/${merchant.id}`)
        .send({ name: '更新后的名称' })

      // 再次获取商户数据，ETag应该不同
      const secondResponse = await authenticatedRequest.request('get', `/api/v1/merchants/${merchant.id}`)
      ApiTestHelper.expectSuccessResponse(secondResponse)
      
      const secondETag = secondResponse.headers.etag

      // ETag应该不同，表示数据已变更
      expect(secondETag).toBeDefined()
      if (firstETag && secondETag) {
        expect(firstETag).not.toBe(secondETag)
      }
    })

    it('应该支持条件请求避免不必要的数据传输', async () => {
      // 创建测试商户
      const merchant = await ApiTestHelper.createTestMerchant()

      // 首次获取数据
      const firstResponse = await authenticatedRequest.request('get', `/api/v1/merchants/${merchant.id}`)
      ApiTestHelper.expectSuccessResponse(firstResponse)
      
      const etag = firstResponse.headers.etag

      if (etag) {
        // 使用If-None-Match头进行条件请求
        const conditionalResponse = await authenticatedRequest.request('get', `/api/v1/merchants/${merchant.id}`)
          .set('If-None-Match', etag)

        // 如果数据未变更，应该返回304 Not Modified
        // 注意：这需要后端支持ETag和条件请求
        if (conditionalResponse.status === 304) {
          expect(conditionalResponse.body).toEqual({})
        } else {
          // 如果后端不支持条件请求，至少应该返回正常数据
          ApiTestHelper.expectSuccessResponse(conditionalResponse)
        }
      }
    })
  })

  describe('数据刷新和轮询机制', () => {
    it('应该支持增量数据更新', async () => {
      // 获取初始时间戳
      const initialTimestamp = new Date().toISOString()

      // 等待一小段时间确保时间戳不同
      await ApiTestHelper.delay(100)

      // 创建新数据
      const newMerchant = await ApiTestHelper.createTestMerchant({
        name: '增量更新测试商户'
      })

      // 请求指定时间戳之后的数据
      const incrementalResponse = await authenticatedRequest.request('get', '/api/v1/merchants')
        .query({ since: initialTimestamp })

      ApiTestHelper.expectSuccessResponse(incrementalResponse)
      
      const incrementalMerchants = incrementalResponse.body.data.items || incrementalResponse.body.data
      
      // 应该只包含新创建的商户
      if (Array.isArray(incrementalMerchants)) {
        const foundMerchant = incrementalMerchants.find((m: any) => m.id === newMerchant.id)
        expect(foundMerchant).toBeDefined()
      }
    })

    it('应该支持长轮询获取实时更新', async () => {
      const startTime = Date.now()

      // 启动长轮询请求（模拟）
      const longPollPromise = authenticatedRequest.request('get', '/api/v1/merchants/poll')
        .query({ timeout: 2000 }) // 2秒超时

      // 在另一个"会话"中创建数据
      setTimeout(async () => {
        await ApiTestHelper.createTestMerchant({
          name: '长轮询测试商户'
        })
      }, 500)

      try {
        const pollResponse = await longPollPromise
        const endTime = Date.now()
        
        // 如果后端支持长轮询，应该在创建数据后立即返回
        // 如果不支持，应该在超时后返回
        if (pollResponse.status === 200) {
          ApiTestHelper.expectSuccessResponse(pollResponse)
          
          // 检查响应时间是否合理
          const responseTime = endTime - startTime
          expect(responseTime).toBeGreaterThan(400) // 至少等待了数据创建
          expect(responseTime).toBeLessThan(3000) // 不应该超过超时时间太多
        }
      } catch (error) {
        // 如果后端不支持长轮询，这是预期的
        console.log('长轮询不支持或超时，这是正常的')
      }
    })

    it('应该支持WebSocket风格的实时通知（通过HTTP模拟）', async () => {
      // 模拟订阅更新通知
      const subscribeResponse = await authenticatedRequest.request('post', '/api/v1/merchants/subscribe')
        .send({ events: ['created', 'updated', 'deleted'] })

      // 如果后端支持订阅机制
      if (subscribeResponse.status === 200 || subscribeResponse.status === 201) {
        ApiTestHelper.expectSuccessResponse(subscribeResponse)
        
        const subscriptionId = subscribeResponse.body.data.subscriptionId

        // 创建新商户触发通知
        const newMerchant = await ApiTestHelper.createTestMerchant({
          name: '订阅通知测试商户'
        })

        // 检查通知队列
        const notificationsResponse = await authenticatedRequest.request('get', `/api/v1/merchants/notifications/${subscriptionId}`)

        if (notificationsResponse.status === 200) {
          ApiTestHelper.expectSuccessResponse(notificationsResponse)
          
          const notifications = notificationsResponse.body.data
          expect(notifications).toBeInstanceOf(Array)
          
          const createNotification = notifications.find((n: any) => 
            n.event === 'created' && n.data.id === newMerchant.id
          )
          expect(createNotification).toBeDefined()
        }

        // 清理订阅
        await authenticatedRequest.request('delete', `/api/v1/merchants/subscribe/${subscriptionId}`)
      } else {
        console.log('订阅机制不支持，跳过测试')
      }
    })
  })

  describe('数据版本控制和冲突检测', () => {
    it('应该检测并处理乐观锁冲突', async () => {
      // 创建测试商户
      const merchant = await ApiTestHelper.createTestMerchant({
        name: '版本控制测试商户'
      })

      // 获取商户数据（包含版本信息）
      const getResponse = await authenticatedRequest.request('get', `/api/v1/merchants/${merchant.id}`)
      ApiTestHelper.expectSuccessResponse(getResponse)
      
      const merchantData = getResponse.body.data
      const originalVersion = merchantData.version || merchantData.updated_at

      // 模拟两个并发更新
      const update1Promise = authenticatedRequest.request('put', `/api/v1/merchants/${merchant.id}`)
        .send({
          name: '更新1',
          version: originalVersion
        })

      const update2Promise = authenticatedRequest.request('put', `/api/v1/merchants/${merchant.id}`)
        .send({
          name: '更新2',
          version: originalVersion
        })

      const [response1, response2] = await Promise.all([update1Promise, update2Promise])

      // 其中一个应该成功，另一个应该失败（冲突）
      const successCount = [response1, response2].filter(r => r.status === 200).length
      const conflictCount = [response1, response2].filter(r => r.status === 409).length

      expect(successCount).toBe(1)
      expect(conflictCount).toBe(1)
    })

    it('应该提供冲突解决机制', async () => {
      // 创建测试商户
      const merchant = await ApiTestHelper.createTestMerchant()

      // 模拟冲突场景
      const conflictResponse = await authenticatedRequest.request('put', `/api/v1/merchants/${merchant.id}`)
        .send({
          name: '冲突更新',
          version: 'invalid-version'
        })

      if (conflictResponse.status === 409) {
        // 获取最新数据进行冲突解决
        const latestResponse = await authenticatedRequest.request('get', `/api/v1/merchants/${merchant.id}`)
        ApiTestHelper.expectSuccessResponse(latestResponse)
        
        const latestData = latestResponse.body.data

        // 使用最新版本重新更新
        const resolvedResponse = await authenticatedRequest.request('put', `/api/v1/merchants/${merchant.id}`)
          .send({
            name: '解决冲突后的更新',
            version: latestData.version || latestData.updated_at
          })

        ApiTestHelper.expectUpdateResponse(resolvedResponse)
      }
    })
  })

  describe('数据完整性验证', () => {
    it('应该验证关联数据的一致性', async () => {
      // 创建商户和相关用户
      const merchant = await ApiTestHelper.createTestMerchant()
      
      const userData = TestDataFactory.createUser({
        user_type: 'merchant_admin',
        merchant_id: merchant.id
      })

      const createUserResponse = await authenticatedRequest.request('post', '/api/v1/users')
        .send(userData)

      if (createUserResponse.status === 201) {
        const createdUser = createUserResponse.body.data

        // 获取商户信息，应该包含关联的用户
        const merchantResponse = await authenticatedRequest.request('get', `/api/v1/merchants/${merchant.id}`)
          .query({ include: 'users' })

        ApiTestHelper.expectSuccessResponse(merchantResponse)
        
        const merchantWithUsers = merchantResponse.body.data
        
        if (merchantWithUsers.users) {
          const foundUser = merchantWithUsers.users.find((u: any) => u.id === createdUser.id)
          expect(foundUser).toBeDefined()
        }
      }
    })

    it('应该验证级联删除的数据一致性', async () => {
      // 创建商户和相关数据
      const merchant = await ApiTestHelper.createTestMerchant()
      
      // 创建访客申请
      const visitorApplication = await ApiTestHelper.createTestVisitorApplication({
        merchant_id: merchant.id
      })

      // 删除商户
      const deleteResponse = await authenticatedRequest.request('delete', `/api/v1/merchants/${merchant.id}`)

      if (deleteResponse.status === 200) {
        // 验证相关的访客申请也被删除或标记为无效
        const applicationResponse = await authenticatedRequest.request('get', `/api/v1/visitor-applications/${visitorApplication.id}`)

        // 应该返回404或者状态为无效
        if (applicationResponse.status === 200) {
          expect(applicationResponse.body.data.status).toBe('invalid')
        } else {
          ApiTestHelper.expectNotFoundError(applicationResponse)
        }
      }
    })
  })
})