/**
 * 小程序组件测试工具 - 专门用于测试小程序组件
 * 修复版本：正确绑定 this 上下文
 */

import { MiniprogramApiTestHelper } from './api-test-helper'

/**
 * 组件测试上下文
 */
interface ComponentTestContext {
  data: Record<string, any>
  properties: Record<string, any>
  setData: (newData: Record<string, any>, callback?: () => void) => void
  triggerEvent: (eventName: string, detail?: any, options?: any) => void
  selectComponent: (selector: string) => ComponentTestContext | null
  selectAllComponents: (selector: string) => ComponentTestContext[]
  [key: string]: any
}

/**
 * 组件生命周期类型
 */
type ComponentLifecycle = 'created' | 'attached' | 'ready' | 'moved' | 'detached' | 'error'

/**
 * 组件事件类型
 */
interface ComponentEvent {
  type: string
  target: {
    id?: string
    dataset: Record<string, any>
  }
  currentTarget: {
    id?: string
    dataset: Record<string, any>
  }
  detail: Record<string, any>
  timeStamp: number
}

/**
 * 组件属性定义
 */
interface ComponentProperty {
  type: any
  value?: any
  observer?: string | ((newVal: any, oldVal: any, changedPath: string) => void)
}

/**
 * 小程序组件测试辅助类
 */
export class ComponentTestHelper {
  /**
   * 创建组件测试上下文
   * 修复：正确绑定 this 上下文，使方法可以访问 data 和 properties
   */
  static createComponentContext(
    initialData: Record<string, any> = {},
    properties: Record<string, any> = {},
    methods: Record<string, Function> = {}
  ): ComponentTestContext {
    const context: ComponentTestContext = {
      data: { ...initialData },
      properties: { ...properties },
      setData: vi.fn(function(this: ComponentTestContext, newData: Record<string, any>, callback?: () => void) {
        // 关键修复：更新 context.data 而不是闭包中的局部变量
        Object.assign(context.data, newData)
        if (callback) {
          setTimeout(callback, 0)
        }
      }),
      triggerEvent: vi.fn((eventName: string, detail?: any, options?: any) => {
        console.log(`组件触发事件: ${eventName}`, { detail, options })
      }),
      selectComponent: vi.fn((selector: string) => {
        console.log(`选择组件: ${selector}`)
        return null
      }),
      selectAllComponents: vi.fn((selector: string) => {
        console.log(`选择所有组件: ${selector}`)
        return []
      })
    }

    // 关键修复：将 methods 绑定到 context，使 this 指向 context
    Object.entries(methods).forEach(([key, method]) => {
      context[key] = method.bind(context)
    })

    return context
  }

  /**
   * 模拟组件生命周期
   */
  static async simulateComponentLifecycle(
    componentContext: ComponentTestContext,
    lifecycle: ComponentLifecycle,
    params?: any
  ): Promise<void> {
    const lifecycleMethod = componentContext[lifecycle]
    
    if (typeof lifecycleMethod === 'function') {
      await lifecycleMethod.call(componentContext, params)
    }
  }

  /**
   * 模拟组件事件
   */
  static async simulateComponentEvent(
    componentContext: ComponentTestContext,
    eventName: string,
    eventData: Partial<ComponentEvent> = {}
  ): Promise<void> {
    const eventHandler = componentContext[eventName]
    
    if (typeof eventHandler === 'function') {
      const mockEvent: ComponentEvent = {
        type: eventName,
        target: { dataset: {}, ...eventData.target },
        currentTarget: { dataset: {}, ...eventData.currentTarget },
        detail: {},
        timeStamp: Date.now(),
        ...eventData
      }
      
      await eventHandler.call(componentContext, mockEvent)
    }
  }

  /**
   * 模拟属性变化
   */
  static async simulatePropertyChange(
    componentContext: ComponentTestContext,
    propertyName: string,
    newValue: any,
    oldValue?: any
  ): Promise<void> {
    const oldVal = oldValue !== undefined ? oldValue : componentContext.properties[propertyName]
    componentContext.properties[propertyName] = newValue
    
    // 触发属性观察器
    const observer = componentContext[`_${propertyName}Observer`]
    if (typeof observer === 'function') {
      await observer.call(componentContext, newValue, oldVal, propertyName)
    }
  }

  /**
   * 验证组件数据
   */
  static expectComponentData(
    componentContext: ComponentTestContext,
    expectedData: Record<string, any>
  ): void {
    Object.entries(expectedData).forEach(([key, expectedValue]) => {
      expect(componentContext.data[key]).toEqual(expectedValue)
    })
  }

  /**
   * 验证组件属性
   */
  static expectComponentProperties(
    componentContext: ComponentTestContext,
    expectedProperties: Record<string, any>
  ): void {
    Object.entries(expectedProperties).forEach(([key, expectedValue]) => {
      expect(componentContext.properties[key]).toEqual(expectedValue)
    })
  }

  /**
   * 验证组件事件触发
   */
  static expectComponentEvent(
    componentContext: ComponentTestContext,
    eventName: string,
    expectedDetail?: any,
    callIndex = 0
  ): void {
    const triggerEventMock = componentContext.triggerEvent as any
    expect(triggerEventMock).toHaveBeenCalled()
    
    const calls = triggerEventMock.mock.calls.filter(call => call[0] === eventName)
    expect(calls.length).toBeGreaterThan(callIndex)
    
    if (expectedDetail !== undefined) {
      expect(calls[callIndex][1]).toEqual(expectedDetail)
    }
  }

  /**
   * 验证setData调用
   */
  static expectSetDataCall(
    componentContext: ComponentTestContext,
    expectedData: Record<string, any>,
    callIndex = 0
  ): void {
    const setDataMock = componentContext.setData as any
    expect(setDataMock).toHaveBeenCalled()
    
    if (callIndex < setDataMock.mock.calls.length) {
      const actualCall = setDataMock.mock.calls[callIndex][0]
      expect(actualCall).toMatchObject(expectedData)
    }
  }

  /**
   * 测试组件完整生命周期
   */
  static async testComponentLifecycle(
    componentContext: ComponentTestContext
  ): Promise<void> {
    // created
    await this.simulateComponentLifecycle(componentContext, 'created')
    
    // attached
    await this.simulateComponentLifecycle(componentContext, 'attached')
    
    // ready
    await this.simulateComponentLifecycle(componentContext, 'ready')
    
    // detached
    await this.simulateComponentLifecycle(componentContext, 'detached')
  }

  /**
   * 创建组件测试套件
   */
  static createComponentTestSuite(
    componentName: string,
    componentFactory: () => ComponentTestContext,
    testCases: Array<{
      name: string
      test: (componentContext: ComponentTestContext) => Promise<void>
    }>
  ): void {
    describe(`组件: ${componentName}`, () => {
      let componentContext: ComponentTestContext

      beforeEach(() => {
        // 设置微信API Mock
        MiniprogramApiTestHelper.setupWxApiMocks()
        componentContext = componentFactory()
      })

      afterEach(() => {
        // 重置Mock
        MiniprogramApiTestHelper.resetMocks()
        vi.clearAllMocks()
      })

      testCases.forEach(({ name, test }) => {
        it(name, async () => {
          await test(componentContext)
        })
      })
    })
  }

  /**
   * 测试组件属性验证
   */
  static testComponentProperties(
    componentContext: ComponentTestContext,
    propertyTests: Array<{
      propertyName: string
      validValues: any[]
      invalidValues?: any[]
      expectedBehavior: (value: any) => void
      description: string
    }>
  ): void {
    propertyTests.forEach(({ propertyName, validValues, invalidValues = [], expectedBehavior, description }) => {
      describe(`属性 ${propertyName}`, () => {
        validValues.forEach(value => {
          it(`${description} - 有效值: ${JSON.stringify(value)}`, async () => {
            await this.simulatePropertyChange(componentContext, propertyName, value)
            expectedBehavior(value)
          })
        })

        invalidValues.forEach(value => {
          it(`${description} - 无效值: ${JSON.stringify(value)}`, async () => {
            await this.simulatePropertyChange(componentContext, propertyName, value)
            // 这里可以验证错误处理逻辑
          })
        })
      })
    })
  }

  /**
   * 测试组件方法
   */
  static async testComponentMethods(
    componentContext: ComponentTestContext,
    methodTests: Array<{
      methodName: string
      params?: any[]
      expectedResult?: any
      expectedSideEffects?: () => void
      description: string
    }>
  ): Promise<void> {
    for (const { methodName, params = [], expectedResult, expectedSideEffects, description } of methodTests) {
      const method = componentContext[methodName]
      
      if (typeof method === 'function') {
        const result = await method.apply(componentContext, params)
        
        if (expectedResult !== undefined) {
          expect(result).toEqual(expectedResult)
        }
        
        if (expectedSideEffects) {
          expectedSideEffects()
        }
        
        console.log(`✓ ${description}`)
      }
    }
  }

  /**
   * 模拟子组件交互
   */
  static simulateChildComponentInteraction(
    componentContext: ComponentTestContext,
    childSelector: string,
    interaction: {
      method?: string
      params?: any[]
      event?: {
        name: string
        detail: any
      }
    }
  ): void {
    const childComponent = componentContext.selectComponent(childSelector)
    
    if (interaction.method && childComponent) {
      const method = childComponent[interaction.method]
      if (typeof method === 'function') {
        method.apply(childComponent, interaction.params || [])
      }
    }
    
    if (interaction.event) {
      // 模拟子组件触发事件
      const eventHandler = componentContext[`on${interaction.event.name}`]
      if (typeof eventHandler === 'function') {
        eventHandler.call(componentContext, {
          detail: interaction.event.detail
        })
      }
    }
  }

  /**
   * 验证组件样式类
   */
  static expectComponentClass(
    componentContext: ComponentTestContext,
    className: string,
    shouldHave: boolean = true
  ): void {
    const classes = componentContext.data.className || ''
    
    if (shouldHave) {
      expect(classes).toContain(className)
    } else {
      expect(classes).not.toContain(className)
    }
  }

  /**
   * 模拟组件错误场景
   */
  static async simulateComponentError(
    componentContext: ComponentTestContext,
    errorScenario: {
      trigger: () => Promise<void>
      expectedErrorHandling: () => void
      description: string
    }
  ): Promise<void> {
    try {
      await errorScenario.trigger()
    } catch (error) {
      // 验证错误处理
      errorScenario.expectedErrorHandling()
      console.log(`✓ ${errorScenario.description}`)
    }
  }

  /**
   * 等待组件状态变化
   */
  static async waitForComponentState(
    componentContext: ComponentTestContext,
    condition: (data: Record<string, any>) => boolean,
    timeout = 5000
  ): Promise<void> {
    const startTime = Date.now()
    
    while (Date.now() - startTime < timeout) {
      if (condition(componentContext.data)) {
        return
      }
      
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    
    throw new Error(`组件状态在 ${timeout}ms 内未满足条件`)
  }

  /**
   * 测试组件性能
   */
  static async testComponentPerformance(
    componentContext: ComponentTestContext,
    performanceTests: Array<{
      action: () => Promise<void>
      maxExecutionTime: number
      description: string
    }>
  ): Promise<void> {
    for (const { action, maxExecutionTime, description } of performanceTests) {
      const startTime = performance.now()
      
      await action()
      
      const executionTime = performance.now() - startTime
      expect(executionTime).toBeLessThan(maxExecutionTime)
      console.log(`✓ ${description} (${executionTime.toFixed(2)}ms)`)
    }
  }

  /**
   * 创建组件属性定义验证
   */
  static validateComponentPropertyDefinition(
    propertyDefinition: Record<string, ComponentProperty>,
    expectedProperties: string[]
  ): void {
    expectedProperties.forEach(propertyName => {
      expect(propertyDefinition).toHaveProperty(propertyName)
      
      const property = propertyDefinition[propertyName]
      expect(property).toHaveProperty('type')
      
      // 验证属性类型是否有效
      const validTypes = [String, Number, Boolean, Object, Array, null]
      expect(validTypes).toContain(property.type)
    })
  }

  /**
   * 模拟组件插槽内容
   */
  static simulateSlotContent(
    componentContext: ComponentTestContext,
    slotName: string,
    content: any
  ): void {
    const slotData = componentContext.data.slots || {}
    slotData[slotName] = content
    
    componentContext.setData({
      slots: slotData
    })
  }

  /**
   * 验证组件插槽渲染
   */
  static expectSlotContent(
    componentContext: ComponentTestContext,
    slotName: string,
    expectedContent: any
  ): void {
    const slotData = componentContext.data.slots || {}
    expect(slotData[slotName]).toEqual(expectedContent)
  }
}

/**
 * 组件测试装饰器
 */
export function withComponentTestEnvironment(
  testFn: (helper: typeof ComponentTestHelper) => Promise<void>
) {
  return async () => {
    // 设置小程序环境
    MiniprogramApiTestHelper.setupWxApiMocks()
    
    try {
      await testFn(ComponentTestHelper)
    } finally {
      // 清理环境
      MiniprogramApiTestHelper.resetMocks()
      vi.clearAllMocks()
    }
  }
}

export default ComponentTestHelper
