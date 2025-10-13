/**
 * 数据同步测试辅助工具
 * 专门用于测试前后端数据一致性和同步机制
 */

import { ApiTestHelper } from './api-test-helper.js'
import { TestDataFactory } from './test-data-factory.js'

export interface DataSyncTestOptions {
  pollInterval?: number
  maxWaitTime?: number
  retryAttempts?: number
}

export interface DataChangeEvent {
  type: 'created' | 'updated' | 'deleted'
  entity: string
  entityId: string | number
  timestamp: string
  data?: any
}

export interface CacheValidationResult {
  isValid: boolean
  expectedData: any
  actualData: any
  differences: string[]
}

/**
 * 数据同步测试辅助类
 */
export class DataSyncTestHelper {
  private authenticatedRequest: any
  private options: DataSyncTestOptions

  constructor(authenticatedRequest: any, options: DataSyncTestOptions = {}) {
    this.authenticatedRequest = authenticatedRequest
    this.options = {
      pollInterval: 500,
      maxWaitTime: 10000,
      retryAttempts: 3,
      ...options
    }
  }

  /**
   * 验证数据创建后的即时可见性
   */
  async validateImmediateVisibility(
    createFn: () => Promise<any>,
    getFn: (id: string | number) => Promise<any>
  ): Promise<boolean> {
    // 执行创建操作
    const createResult = await createFn()
    const entityId = createResult.id

    // 立即尝试获取创建的数据
    const getResult = await getFn(entityId)
    
    return Boolean(getResult && getResult.id === entityId)
  }

  /**
   * 验证数据更新后的一致性
   */
  async validateUpdateConsistency(
    entityId: string | number,
    updateFn: () => Promise<any>,
    getFn: (id: string | number) => Promise<any>,
    expectedChanges: Record<string, any>
  ): Promise<CacheValidationResult> {
    // 执行更新操作
    const updateResult = await updateFn()
    
    // 立即获取更新后的数据
    const getResult = await getFn(entityId)
    
    const differences: string[] = []
    let isValid = true

    // 验证每个预期的变更
    for (const [key, expectedValue] of Object.entries(expectedChanges)) {
      const actualValue = getResult[key]
      if (actualValue !== expectedValue) {
        differences.push(`${key}: expected ${expectedValue}, got ${actualValue}`)
        isValid = false
      }
    }

    return {
      isValid,
      expectedData: expectedChanges,
      actualData: getResult,
      differences
    }
  }

  /**
   * 验证数据删除后的状态
   */
  async validateDeletionConsistency(
    entityId: string | number,
    deleteFn: () => Promise<any>,
    getFn: (id: string | number) => Promise<any>
  ): Promise<boolean> {
    // 执行删除操作
    await deleteFn()
    
    try {
      // 尝试获取已删除的数据
      const getResult = await getFn(entityId)
      
      // 如果能获取到数据，检查是否标记为已删除
      if (getResult) {
        return getResult.status === 'deleted' || getResult.deleted_at !== null
      }
      
      return false
    } catch (error: any) {
      // 如果返回404，说明删除成功
      return error.status === 404 || error.response?.status === 404
    }
  }

  /**
   * 模拟并发操作并检测冲突
   */
  async simulateConcurrentOperations(
    entityId: string | number,
    operations: Array<() => Promise<any>>
  ): Promise<{
    successCount: number
    conflictCount: number
    results: any[]
  }> {
    // 并发执行所有操作
    const results = await Promise.allSettled(operations.map(op => op()))
    
    let successCount = 0
    let conflictCount = 0
    const processedResults: any[] = []

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        const response = result.value
        if (response.status >= 200 && response.status < 300) {
          successCount++
        } else if (response.status === 409) {
          conflictCount++
        }
        processedResults.push(response)
      } else {
        // 处理rejected的promise
        const error = result.reason
        if (error.status === 409 || error.response?.status === 409) {
          conflictCount++
        }
        processedResults.push(error)
      }
    })

    return {
      successCount,
      conflictCount,
      results: processedResults
    }
  }

  /**
   * 验证ETag机制
   */
  async validateETagMechanism(
    entityId: string | number,
    getFn: (id: string | number) => Promise<any>,
    updateFn: (etag: string) => Promise<any>
  ): Promise<{
    etagSupported: boolean
    etagChanged: boolean
    conditionalRequestWorked: boolean
  }> {
    // 首次获取数据
    const firstResponse = await getFn(entityId)
    const firstETag = firstResponse.headers?.etag

    if (!firstETag) {
      return {
        etagSupported: false,
        etagChanged: false,
        conditionalRequestWorked: false
      }
    }

    // 执行更新操作
    await updateFn(firstETag)

    // 再次获取数据
    const secondResponse = await getFn(entityId)
    const secondETag = secondResponse.headers?.etag

    const etagChanged = firstETag !== secondETag

    // 测试条件请求
    let conditionalRequestWorked = false
    try {
      const conditionalResponse = await this.authenticatedRequest.request('get', `/api/v1/test/${entityId}`)
        .set('If-None-Match', secondETag)
      
      conditionalRequestWorked = conditionalResponse.status === 304
    } catch (error) {
      // 如果不支持条件请求，这是正常的
    }

    return {
      etagSupported: true,
      etagChanged,
      conditionalRequestWorked
    }
  }

  /**
   * 测试增量数据获取
   */
  async testIncrementalDataFetch(
    baseUrl: string,
    createDataFn: () => Promise<any>
  ): Promise<{
    incrementalSupported: boolean
    newDataIncluded: boolean
    oldDataExcluded: boolean
  }> {
    // 记录开始时间
    const startTime = new Date().toISOString()
    
    // 等待确保时间戳不同
    await this.delay(100)
    
    // 创建新数据
    const newData = await createDataFn()
    
    try {
      // 请求增量数据
      const incrementalResponse = await this.authenticatedRequest.request('get', baseUrl)
        .query({ since: startTime })
      
      if (incrementalResponse.status !== 200) {
        return {
          incrementalSupported: false,
          newDataIncluded: false,
          oldDataExcluded: false
        }
      }

      const incrementalData = incrementalResponse.body.data.items || incrementalResponse.body.data
      
      if (!Array.isArray(incrementalData)) {
        return {
          incrementalSupported: false,
          newDataIncluded: false,
          oldDataExcluded: false
        }
      }

      // 检查新数据是否包含在增量结果中
      const newDataIncluded = incrementalData.some((item: any) => item.id === newData.id)
      
      // 检查是否只包含新数据（这个检查可能需要根据具体实现调整）
      const oldDataExcluded = incrementalData.every((item: any) => 
        new Date(item.created_at || item.updated_at) >= new Date(startTime)
      )

      return {
        incrementalSupported: true,
        newDataIncluded,
        oldDataExcluded
      }
    } catch (error) {
      return {
        incrementalSupported: false,
        newDataIncluded: false,
        oldDataExcluded: false
      }
    }
  }

  /**
   * 测试长轮询机制
   */
  async testLongPolling(
    pollUrl: string,
    triggerChangeFn: () => Promise<any>,
    timeout: number = 5000
  ): Promise<{
    longPollingSupported: boolean
    responseTime: number
    dataReceived: boolean
  }> {
    const startTime = Date.now()
    
    // 启动长轮询请求
    const pollPromise = this.authenticatedRequest.request('get', pollUrl)
      .query({ timeout: timeout })
    
    // 延迟触发数据变更
    setTimeout(async () => {
      try {
        await triggerChangeFn()
      } catch (error) {
        console.warn('触发数据变更失败:', error)
      }
    }, 1000)

    try {
      const pollResponse = await pollPromise
      const endTime = Date.now()
      const responseTime = endTime - startTime

      return {
        longPollingSupported: pollResponse.status === 200,
        responseTime,
        dataReceived: pollResponse.body && Object.keys(pollResponse.body).length > 0
      }
    } catch (error: any) {
      const endTime = Date.now()
      const responseTime = endTime - startTime

      return {
        longPollingSupported: false,
        responseTime,
        dataReceived: false
      }
    }
  }

  /**
   * 验证关联数据的一致性
   */
  async validateRelationalConsistency(
    parentEntity: any,
    childEntities: any[],
    getParentWithChildrenFn: (parentId: string | number) => Promise<any>
  ): Promise<{
    allChildrenPresent: boolean
    childrenDataCorrect: boolean
    missingChildren: any[]
    incorrectChildren: any[]
  }> {
    const parentWithChildren = await getParentWithChildrenFn(parentEntity.id)
    const actualChildren = parentWithChildren.children || parentWithChildren.items || []

    const missingChildren: any[] = []
    const incorrectChildren: any[] = []

    // 检查每个预期的子实体
    for (const expectedChild of childEntities) {
      const actualChild = actualChildren.find((child: any) => child.id === expectedChild.id)
      
      if (!actualChild) {
        missingChildren.push(expectedChild)
      } else {
        // 验证子实体数据的正确性
        const hasIncorrectData = Object.keys(expectedChild).some(key => {
          if (key === 'id') return false // 跳过ID比较
          return actualChild[key] !== expectedChild[key]
        })
        
        if (hasIncorrectData) {
          incorrectChildren.push({
            expected: expectedChild,
            actual: actualChild
          })
        }
      }
    }

    return {
      allChildrenPresent: missingChildren.length === 0,
      childrenDataCorrect: incorrectChildren.length === 0,
      missingChildren,
      incorrectChildren
    }
  }

  /**
   * 等待条件满足
   */
  async waitForCondition(
    conditionFn: () => Promise<boolean>,
    maxWaitTime: number = this.options.maxWaitTime!,
    pollInterval: number = this.options.pollInterval!
  ): Promise<boolean> {
    const startTime = Date.now()
    
    while (Date.now() - startTime < maxWaitTime) {
      try {
        const result = await conditionFn()
        if (result) {
          return true
        }
      } catch (error) {
        // 忽略条件检查中的错误，继续等待
      }
      
      await this.delay(pollInterval)
    }
    
    return false
  }

  /**
   * 延迟执行
   */
  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * 生成测试数据变更事件
   */
  createDataChangeEvent(
    type: 'created' | 'updated' | 'deleted',
    entity: string,
    entityId: string | number,
    data?: any
  ): DataChangeEvent {
    return {
      type,
      entity,
      entityId,
      timestamp: new Date().toISOString(),
      data
    }
  }

  /**
   * 验证数据变更事件的完整性
   */
  validateDataChangeEvent(
    event: DataChangeEvent,
    expectedType: string,
    expectedEntity: string,
    expectedId: string | number
  ): boolean {
    return (
      event.type === expectedType &&
      event.entity === expectedEntity &&
      event.entityId.toString() === expectedId.toString() &&
      event.timestamp &&
      new Date(event.timestamp).getTime() > 0
    )
  }

  /**
   * 创建数据同步测试场景
   */
  static async createTestScenario(
    authenticatedRequest: any,
    scenarioType: 'merchant_crud' | 'visitor_flow' | 'user_management'
  ): Promise<DataSyncTestHelper> {
    const helper = new DataSyncTestHelper(authenticatedRequest)
    
    switch (scenarioType) {
      case 'merchant_crud':
        // 为商户CRUD操作准备测试环境
        break
      
      case 'visitor_flow':
        // 为访客流程准备测试环境
        break
      
      case 'user_management':
        // 为用户管理准备测试环境
        break
    }
    
    return helper
  }
}

export default DataSyncTestHelper