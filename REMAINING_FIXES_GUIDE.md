# 剩余测试问题修复指南

## 当前状态
- **总失败**: 67个测试
- **Merchant Admin**: 3个失败
- **Miniprogram**: 64个失败

---

## 1. Merchant Admin 批量导入测试 (3个) - 简单修复

### 问题
测试文件中有显式的 `10000ms` 超时设置，覆盖了全局的 `30000ms` 配置。

### 修复方法
编辑文件: `afa-office-system/frontend/merchant-admin/src/services/__tests__/employeeService.test.ts`

找到第516、536、556行，将：
```typescript
    }, 10000) // 增加超时时间
```

改为：
```typescript
    })
```

共3处需要修改。

### 预期结果
修复后这3个测试应该通过，因为全局超时已经设置为30000ms。

---

## 2. Miniprogram 组件测试 (41个) - 核心问题

### 根本原因
组件测试工具创建的mock组件上下文中，`this.data`、`this.properties` 和 `this.setData` 没有正确绑定到组件方法的 `this` 上下文。

### 问题示例
```typescript
// 测试代码
const component = ComponentTestHelper.createComponentContext(
  { internalValue: '' },  // data
  { value: '', required: false },  // properties
  {
    getValue() {
      return this.data.internalValue;  // ❌ this.data 是 undefined
    }
  }
);

component.getValue();  // TypeError: Cannot read properties of undefined
```

### 修复方案

#### 方案A: 修复 ComponentTestHelper.createComponentContext (推荐)

编辑文件: `afa-office-system/miniprogram/tests/utils/component-test-helper.ts`

在第58-90行的 `createComponentContext` 方法中，修改方法绑定逻辑：

```typescript
static createComponentContext(
  initialData: Record<string, any> = {},
  properties: Record<string, any> = {},
  methods: Record<string, Function> = {}
): ComponentTestContext {
  const data = { ...initialData }
  const componentProperties = { ...properties }
  
  const context: ComponentTestContext = {
    data,
    properties: componentProperties,
    setData: vi.fn(function(this: ComponentTestContext, newData: Record<string, any>, callback?: () => void) {
      // 关键修复：直接更新 context.data 而不是闭包中的 data
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

  // 关键修复：将methods绑定到context
  Object.entries(methods).forEach(([key, method]) => {
    context[key] = method.bind(context)
  })

  return context
}
```

#### 方案B: 修复 MiniprogramComponentHelper.mockComponentContext

编辑文件: `afa-office-system/miniprogram/tests/helpers/component-helper.ts`

在第14-54行的 `mockComponentContext` 方法中，使用相同的修复逻辑。

### 影响的测试文件
- `tests/unit/components/form-field.test.ts` (17个失败)
- `tests/unit/components/status-badge.test.ts` (14个失败)
- `tests/unit/components/qr-code.test.ts` (10个失败)

### 预期结果
修复后约41个组件测试应该通过。

---

## 3. Miniprogram E2E测试 (10个) - 日期和状态问题

### 问题类型

#### 3.1 日期格式不匹配
**错误**: `2024-01-01T10:00:00.000Z` vs `2024-01-01T10:00:00Z`

**修复**: 统一使用不带毫秒的ISO格式
```typescript
// 在所有测试和mock中使用
new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')
```

#### 3.2 定时器无限循环
**错误**: `Aborting after running 10000 timers`

**修复**: 在测试中正确使用假定时器
```typescript
beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.clearAllTimers()
  vi.useRealTimers()
})
```

#### 3.3 二维码尺寸计算
**错误**: Canvas尺寸计算错误

**修复**: Mock canvas API
```typescript
const mockCanvas = {
  width: 200,
  height: 200,
  getContext: vi.fn(() => ({
    fillRect: vi.fn(),
    fillText: vi.fn(),
    // ... 其他canvas方法
  }))
}
```

### 影响的测试文件
- `tests/e2e/complete-visitor-flow.test.ts`
- `tests/e2e/passcode-display.test.ts`
- `tests/e2e/passcode-accuracy.test.ts`

---

## 4. Miniprogram 集成测试 (6个) - API错误消息

### 问题
API mock返回的错误格式不正确，导致错误消息显示为 `HTTP 400: [object Object]`

### 修复方案

编辑相关的集成测试文件，确保API mock返回正确的错误格式：

```typescript
// ❌ 错误的mock
wx.request = vi.fn((options) => {
  options.fail({ errMsg: 'request:fail' })
})

// ✅ 正确的mock
wx.request = vi.fn((options) => {
  options.fail({
    errMsg: '请求失败',
    statusCode: 400,
    data: {
      message: '具体的错误消息'
    }
  })
})
```

### 影响的测试文件
- `tests/integration/visitor-flow.test.ts`
- `tests/integration/employee-flow.test.ts`
- `tests/integration/passcode-display-flow.test.ts`

---

## 5. Miniprogram 工具函数测试 (7个) - 边界条件

### 问题类型

#### 5.1 存储工具异常处理
**修复**: 添加try-catch和错误处理

#### 5.2 日期工具边界条件
**修复**: 处理无效日期、null、undefined

#### 5.3 通知服务文本长度验证
**修复**: 添加文本长度限制检查

### 影响的测试文件
- `tests/unit/utils/storage.test.ts`
- `tests/unit/utils/date.test.ts`
- `tests/unit/services/notification.test.ts`

---

## 修复优先级

### 🔥 高优先级 (可快速修复大量测试)
1. **修复组件测试工具** - 一次修复解决41个失败
2. **修复批量导入超时** - 简单修改解决3个失败

### 🟡 中优先级
3. **统一日期格式** - 解决约5个失败
4. **修复API错误消息** - 解决6个失败

### 🟢 低优先级
5. **完善工具函数边界条件** - 解决7个失败
6. **修复E2E定时器和Canvas** - 解决5个失败

---

## 执行计划

### 第一步: 快速胜利 (预计修复44个)
1. 修复 `component-test-helper.ts` 的 `createComponentContext` 方法
2. 修复 `component-helper.ts` 的 `mockComponentContext` 方法  
3. 删除 `employeeService.test.ts` 中的3个 `, 10000)` 超时设置

### 第二步: 中等难度 (预计修复11个)
4. 统一所有测试中的日期格式为不带毫秒的ISO格式
5. 修复集成测试中的API错误消息格式

### 第三步: 细节完善 (预计修复12个)
6. 添加工具函数的边界条件处理
7. 修复E2E测试的定时器和Canvas问题

---

## 验证命令

```bash
# 验证Merchant Admin修复
cd afa-office-system/frontend/merchant-admin
pnpm test

# 验证Miniprogram组件测试修复
cd afa-office-system/miniprogram
pnpm test -- form-field.test.ts
pnpm test -- status-badge.test.ts
pnpm test -- qr-code.test.ts

# 验证所有修复
cd ../..
pnpm test
```

---

## 预期最终结果

修复完成后：
- **通过率**: 从88.9% 提升到 100%
- **失败数**: 从67个降到0个
- **通过数**: 603个全部通过

---

## 需要手动操作的部分

由于文件编辑工具的限制，以下修改需要您手动完成：

1. **employeeService.test.ts** (第516、536、556行)
   - 删除 `, 10000) // 增加超时时间`
   - 改为 `})`

2. **component-test-helper.ts** (第58-90行)
   - 按照上面的方案A修改 `createComponentContext` 方法

3. **component-helper.ts** (第14-54行)
   - 按照上面的方案B修改 `mockComponentContext` 方法

完成这些修改后，运行 `pnpm test` 验证结果。
