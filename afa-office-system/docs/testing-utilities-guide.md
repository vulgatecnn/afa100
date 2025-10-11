# Hook 和小程序测试工具使用指南

本文档介绍了为 AFA 办公小程序项目开发的专用测试工具，包括 React Hook 测试工具、小程序页面/组件测试工具和错误场景测试工具。

## 目录

1. [React Hook 测试工具](#react-hook-测试工具)
2. [小程序页面测试工具](#小程序页面测试工具)
3. [小程序组件测试工具](#小程序组件测试工具)
4. [错误场景测试工具](#错误场景测试工具)
5. [最佳实践](#最佳实践)

## React Hook 测试工具

### 概述

`HookTestHelper` 提供了专门用于测试 React Hook 的工具集，支持状态管理、异步操作、副作用和性能测试。

### 基础用法

```typescript
import { HookTestHelper, withHookTestEnvironment } from '../utils/hook-test-helper'

// 测试简单的状态Hook
it('应该正确管理状态', withHookTestEnvironment(async (helper) => {
  const result = helper.renderHook(() => useCounter(5))
  
  // 验证初始状态
  expect(result.result.current.count).toBe(5)
  
  // 测试状态变化
  await act(() => {
    result.result.current.increment()
  })
  
  expect(result.result.current.count).toBe(6)
}))
```

### 高级功能

#### 1. 异步Hook测试

```typescript
await helper.testAsyncHook(
  () => useAsyncData('/api/test'),
  async (result) => {
    // 验证加载状态
    expect(result.result.current.loading).toBe(true)
    
    // 等待数据加载完成
    await result.waitForValueToChange(
      (current) => current.loading,
      3000
    )
    
    // 验证最终状态
    expect(result.result.current.data).toBeDefined()
  }
)
```

#### 2. 错误处理测试

```typescript
await helper.testHookErrorHandling(
  () => useAsyncData('/api/error'),
  [
    {
      trigger: async () => {
        // 触发错误的操作
      },
      expectedError: '网络错误',
      description: '应该正确处理网络错误'
    }
  ]
)
```

#### 3. 性能测试

```typescript
await helper.testHookPerformance(
  () => useCounter(),
  [
    {
      action: async () => {
        // 执行性能测试的操作
      },
      maxExecutionTime: 100, // 100ms
      description: 'Hook操作应该在100ms内完成'
    }
  ]
)
```

### Hook测试模式

```typescript
import { HookTestPatterns } from '../utils/hook-test-helper'

// 测试状态Hook模式
await HookTestPatterns.testStateHook(
  () => {
    const [value, setValue] = useState('initial')
    return [value, setValue]
  },
  'initial',
  'updated'
)

// 测试异步Hook模式
await HookTestPatterns.testAsyncHook(
  () => useAsyncData('/api/test'),
  mockAsyncOperation
)
```

## 小程序页面测试工具

### 概述

`PageTestHelper` 提供了专门用于测试小程序页面的工具集，支持生命周期、事件处理、网络请求和状态管理测试。

### 基础用法

```typescript
import { PageTestHelper, withPageTestEnvironment } from '../utils/page-test-helper'

// 创建页面测试上下文
function createTestPage() {
  return PageTestHelper.createPageContext(
    // 初始数据
    { username: '', loading: false },
    // 页面方法
    {
      onLoad(options) {
        this.setData({ username: options.username || '' })
      },
      
      async onSubmit() {
        this.setData({ loading: true })
        // 处理提交逻辑
      }
    }
  )
}

it('应该正确处理页面加载', withPageTestEnvironment(async (helper) => {
  const pageContext = createTestPage()
  
  // 模拟页面加载
  await helper.simulatePageLifecycle(pageContext, 'onLoad', {
    username: 'testuser'
  })
  
  // 验证页面数据
  helper.expectPageData(pageContext, {
    username: 'testuser'
  })
}))
```

### 高级功能

#### 1. 生命周期测试

```typescript
// 测试完整生命周期
await helper.testPageLifecycle(pageContext, { id: '123' })

// 测试特定生命周期
await helper.simulatePageLifecycle(pageContext, 'onShow')
```

#### 2. 事件处理测试

```typescript
// 模拟用户事件
await helper.simulatePageEvent(pageContext, 'onButtonTap', {
  target: { dataset: { id: '123' } }
})

// 模拟表单输入
await helper.simulateFormInput(pageContext, 'username', 'newvalue')
```

#### 3. 网络请求测试

```typescript
// 测试成功场景
await helper.simulateNetworkScenario(
  pageContext,
  'success',
  async () => {
    await helper.simulatePageEvent(pageContext, 'onSubmit')
  }
)

// 测试错误场景
await helper.simulateNetworkScenario(
  pageContext,
  'error',
  async () => {
    await helper.simulatePageEvent(pageContext, 'onSubmit')
  }
)
```

#### 4. 页面状态验证

```typescript
// 验证成功反馈
helper.expectPageSuccess(pageContext, '操作成功')

// 验证错误处理
helper.expectPageError(pageContext, '操作失败')

// 验证加载状态
helper.expectPageLoading(pageContext, true, '加载中...')
```

### 页面测试套件

```typescript
PageTestHelper.createPageTestSuite(
  '登录页面',
  () => createLoginPage(),
  [
    {
      name: '应该正确初始化',
      test: async (pageContext) => {
        expect(pageContext.data.username).toBe('')
      }
    },
    {
      name: '应该处理用户输入',
      test: async (pageContext) => {
        await PageTestHelper.simulateFormInput(pageContext, 'username', 'test')
        expect(pageContext.data.username).toBe('test')
      }
    }
  ]
)
```

## 小程序组件测试工具

### 概述

`ComponentTestHelper` 提供了专门用于测试小程序组件的工具集，支持属性变化、事件触发、生命周期和插槽测试。

### 基础用法

```typescript
import { ComponentTestHelper, withComponentTestEnvironment } from '../utils/component-test-helper'

// 创建组件测试上下文
function createTestComponent() {
  return ComponentTestHelper.createComponentContext(
    // 初始数据
    { visible: false },
    // 组件属性
    { title: '测试标题', size: 'medium' },
    // 组件方法
    {
      attached() {
        this.setData({ visible: true })
      },
      
      onTap() {
        this.triggerEvent('tap', { id: this.properties.id })
      }
    }
  )
}

it('应该正确处理组件生命周期', withComponentTestEnvironment(async (helper) => {
  const componentContext = createTestComponent()
  
  // 模拟attached生命周期
  await helper.simulateComponentLifecycle(componentContext, 'attached')
  
  // 验证组件数据
  helper.expectComponentData(componentContext, {
    visible: true
  })
}))
```

### 高级功能

#### 1. 属性变化测试

```typescript
// 模拟属性变化
await helper.simulatePropertyChange(componentContext, 'title', '新标题')

// 验证属性更新
helper.expectComponentProperties(componentContext, {
  title: '新标题'
})
```

#### 2. 事件触发测试

```typescript
// 模拟组件事件
await helper.simulateComponentEvent(componentContext, 'onTap')

// 验证事件触发
helper.expectComponentEvent(componentContext, 'tap', {
  id: componentContext.properties.id
})
```

#### 3. 属性验证测试

```typescript
helper.testComponentProperties(componentContext, [
  {
    propertyName: 'size',
    validValues: ['small', 'medium', 'large'],
    expectedBehavior: (value) => {
      expect(componentContext.properties.size).toBe(value)
    },
    description: '应该正确设置size属性'
  }
])
```

#### 4. 组件方法测试

```typescript
await helper.testComponentMethods(componentContext, [
  {
    methodName: 'validate',
    expectedResult: true,
    description: '验证方法应该返回true'
  },
  {
    methodName: 'reset',
    expectedSideEffects: () => {
      expect(componentContext.data.value).toBe('')
    },
    description: '重置方法应该清空数据'
  }
])
```

### 组件测试套件

```typescript
ComponentTestHelper.createComponentTestSuite(
  '用户卡片组件',
  () => createUserCardComponent(),
  [
    {
      name: '应该正确初始化',
      test: async (componentContext) => {
        expect(componentContext.data.visible).toBe(false)
      }
    },
    {
      name: '应该处理点击事件',
      test: async (componentContext) => {
        await ComponentTestHelper.simulateComponentEvent(componentContext, 'onTap')
        ComponentTestHelper.expectComponentEvent(componentContext, 'tap')
      }
    }
  ]
)
```

## 错误场景测试工具

### 概述

`ErrorScenarioHelper` 和 `MiniprogramErrorScenarioHelper` 提供了专门用于测试各种错误情况和边界条件的工具集。

### 前端错误场景测试

```typescript
import { ErrorScenarioHelper, withErrorScenarioTesting } from '../utils/error-scenario-helper'

it('应该测试网络错误场景', withErrorScenarioTesting(async (helper) => {
  await helper.testNetworkErrorScenarios(
    async () => {
      return apiService.getData()
    },
    async (error) => {
      // 验证错误处理
      expect(error).toBeDefined()
    }
  )
}))
```

### 小程序错误场景测试

```typescript
import { MiniprogramErrorScenarioHelper, withMiniprogramErrorScenarioTesting } from '../utils/error-scenario-helper'

it('应该测试微信API错误', withMiniprogramErrorScenarioTesting(async (helper) => {
  await helper.testWxApiErrorScenarios(
    async (apiName) => {
      return wx[apiName]()
    },
    async (error) => {
      // 验证错误处理
      expect(error.errCode).toBeDefined()
    }
  )
}))
```

### 自定义错误场景

```typescript
const errorScenario = helper.createErrorScenario(
  ErrorScenarioType.VALIDATION_ERROR,
  '测试表单验证错误',
  async () => {
    // 设置场景
  },
  async () => {
    // 触发错误
    throw new Error('验证失败')
  },
  async () => {
    // 验证预期行为
    expect(errorMessage).toContain('验证失败')
  }
)

await helper.executeErrorScenario(errorScenario)
```

### 边界条件测试

```typescript
await helper.testBoundaryConditions(
  async (testData) => {
    return processData(testData)
  },
  [
    {
      name: '空字符串',
      data: '',
      expectedBehavior: '应该返回默认值'
    },
    {
      name: 'null值',
      data: null,
      expectedBehavior: '应该抛出错误'
    }
  ]
)
```

## 最佳实践

### 1. 测试组织

```typescript
describe('功能模块测试', () => {
  describe('正常场景', () => {
    // 正常功能测试
  })
  
  describe('错误场景', () => {
    // 错误处理测试
  })
  
  describe('边界条件', () => {
    // 边界条件测试
  })
})
```

### 2. Mock 管理

```typescript
beforeEach(() => {
  // 设置Mock
  vi.clearAllMocks()
  setupApiMocks()
})

afterEach(() => {
  // 清理Mock
  resetAllMocks()
})
```

### 3. 异步测试

```typescript
// 使用 waitFor 等待异步操作
await waitFor(() => {
  expect(screen.getByText('加载完成')).toBeInTheDocument()
})

// 使用 act 包装状态更新
await act(async () => {
  result.current.updateData()
})
```

### 4. 错误处理测试

```typescript
// 总是测试错误场景
it('应该处理API错误', async () => {
  mockApiError()
  
  try {
    await apiCall()
    expect(true).toBe(false) // 不应该到达这里
  } catch (error) {
    expect(error.message).toBeDefined()
  }
})
```

### 5. 性能测试

```typescript
// 测试关键操作的性能
it('应该在合理时间内完成', async () => {
  const startTime = performance.now()
  
  await performOperation()
  
  const duration = performance.now() - startTime
  expect(duration).toBeLessThan(1000) // 1秒内完成
})
```

### 6. 内存泄漏测试

```typescript
// 测试资源清理
it('应该正确清理资源', async () => {
  const resources = []
  
  try {
    // 创建资源
    for (let i = 0; i < 100; i++) {
      resources.push(createResource())
    }
    
    // 使用资源
    await useResources(resources)
  } finally {
    // 清理资源
    resources.forEach(resource => resource.cleanup())
  }
})
```

## 总结

这些测试工具提供了全面的测试支持，涵盖了：

- **React Hook 测试**：状态管理、异步操作、副作用、性能测试
- **小程序页面测试**：生命周期、事件处理、网络请求、状态管理
- **小程序组件测试**：属性变化、事件触发、生命周期、插槽测试
- **错误场景测试**：网络错误、表单验证、边界条件、并发错误

通过使用这些工具，可以确保代码质量，提高测试覆盖率，并建立可靠的测试体系。

## 相关文件

- `frontend/src/test/utils/hook-test-helper.ts` - React Hook 测试工具
- `miniprogram/tests/utils/page-test-helper.ts` - 小程序页面测试工具
- `miniprogram/tests/utils/component-test-helper.ts` - 小程序组件测试工具
- `frontend/src/test/utils/error-scenario-helper.ts` - 前端错误场景测试工具
- `miniprogram/tests/utils/error-scenario-helper.ts` - 小程序错误场景测试工具
- `frontend/src/test/examples/` - 前端测试示例
- `miniprogram/tests/examples/` - 小程序测试示例