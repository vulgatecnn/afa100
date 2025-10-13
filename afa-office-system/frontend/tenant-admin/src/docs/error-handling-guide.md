# 错误处理和用户反馈系统使用指南

## 概述

本系统提供了统一的错误处理、用户反馈和网络状态监控功能，旨在提升用户体验和系统稳定性。

## 核心功能

### 1. 统一错误处理

- **错误分类**: 网络错误、认证错误、权限错误、验证错误、业务错误、系统错误
- **错误级别**: 信息、警告、错误、严重
- **自动重试**: 支持可重试错误的自动重试机制
- **错误上下文**: 记录错误发生时的上下文信息

### 2. 用户友好反馈

- **多种消息类型**: 成功、信息、警告、错误
- **智能提示**: 根据错误类型提供解决建议
- **可配置显示**: 支持自定义显示时长和样式
- **反馈收集**: 用户可以提交错误报告和建议

### 3. 网络状态监控

- **实时监控**: 监控网络连接状态变化
- **质量评估**: 评估网络连接质量
- **离线处理**: 离线状态下的用户提示和功能限制
- **自动恢复**: 网络恢复时的自动处理

## 使用方法

### 基础使用

```tsx
import { useError } from '../contexts/ErrorContext'

function MyComponent() {
  const { handleError, showSuccess, isOnline } = useError()

  const handleApiCall = async () => {
    try {
      const result = await apiCall()
      showSuccess('操作成功')
    } catch (error) {
      handleError(error, { operation: 'apiCall' })
    }
  }

  return (
    <div>
      <p>网络状态: {isOnline ? '在线' : '离线'}</p>
      <button onClick={handleApiCall}>执行操作</button>
    </div>
  )
}
```

### 错误处理 Hook

```tsx
import { useErrorHandler } from '../hooks/useErrorHandler'

function MyComponent() {
  const {
    handleError,
    showSuccess,
    showInfo,
    showWarning,
    showError,
    retryOperation
  } = useErrorHandler({
    enableAutoRetry: true,
    maxRetries: 3
  })

  // 处理错误
  const handleApiError = (error: any) => {
    handleError(error, {
      operation: 'fetchData',
      userId: 123
    })
  }

  // 重试操作
  const retryApiCall = async () => {
    try {
      const result = await retryOperation(async () => {
        return await fetch('/api/data')
      })
      showSuccess('数据获取成功')
    } catch (error) {
      handleError(error)
    }
  }
}
```

### 网络状态监控

```tsx
import { useNetworkStatus } from '../hooks/useNetworkStatus'

function NetworkIndicator() {
  const {
    isOnline,
    networkStatus,
    checkConnection,
    getSuggestions
  } = useNetworkStatus()

  const suggestions = getSuggestions()

  return (
    <div>
      <p>状态: {isOnline ? '在线' : '离线'}</p>
      {suggestions.length > 0 && (
        <ul>
          {suggestions.map((suggestion, index) => (
            <li key={index}>{suggestion}</li>
          ))}
        </ul>
      )}
      <button onClick={checkConnection}>检查连接</button>
    </div>
  )
}
```

## 组件使用

### ErrorBoundary 错误边界

```tsx
import { ErrorBoundary } from '../components/ErrorBoundary'

function App() {
  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        console.error('应用错误:', error, errorInfo)
      }}
    >
      <MyApplication />
    </ErrorBoundary>
  )
}
```

### NetworkStatus 网络状态指示器

```tsx
import { NetworkStatus } from '../components/NetworkStatus'

function Layout() {
  return (
    <div>
      <Header />
      <Content />
      <NetworkStatus position="topRight" showDetails={true} />
    </div>
  )
}
```

### FeedbackModal 反馈模态框

```tsx
import { FeedbackModal } from '../components/FeedbackModal'

function MyComponent() {
  const [showFeedback, setShowFeedback] = useState(false)

  const handleFeedbackSubmit = (feedback) => {
    console.log('用户反馈:', feedback)
    // 发送到服务器
  }

  return (
    <div>
      <button onClick={() => setShowFeedback(true)}>
        反馈问题
      </button>
      
      <FeedbackModal
        open={showFeedback}
        onCancel={() => setShowFeedback(false)}
        onSubmit={handleFeedbackSubmit}
        initialType="bug"
      />
    </div>
  )
}
```

## 全局配置

### ErrorProvider 配置

```tsx
import { ErrorProvider } from '../contexts/ErrorContext'

function App() {
  return (
    <ErrorProvider
      showNetworkStatus={true}
      enableAutoRetry={true}
      enableUserFeedback={true}
    >
      <Router>
        <Routes>
          {/* 路由配置 */}
        </Routes>
      </Router>
    </ErrorProvider>
  )
}
```

## API 集成

### 与 API 客户端集成

```tsx
import { ApiService } from '../services/api'

// API 服务已经集成了错误处理
const fetchUsers = async () => {
  try {
    const users = await ApiService.users.getUsers()
    return users
  } catch (error) {
    // 错误已经被自动处理和显示
    throw error
  }
}
```

## 错误类型和处理策略

### 网络错误 (1xxx)
- **1001**: 网络连接失败 - 自动重试
- **1002**: 请求超时 - 自动重试
- **1003**: 连接被拒绝 - 显示错误信息

### 认证错误 (2xxx)
- **2001**: 用户名或密码错误 - 显示提示
- **2002**: 登录过期 - 自动跳转登录页
- **2003**: 令牌无效 - 清除本地存储

### 权限错误 (3xxx)
- **3001**: 权限不足 - 显示权限提示
- **3002**: 资源访问被拒绝 - 显示访问限制

### 验证错误 (4xxx)
- **4001**: 输入数据无效 - 显示验证提示
- **4002**: 缺少必填字段 - 高亮必填项

### 业务错误 (5xxx)
- **5001**: 资源不存在 - 显示资源错误
- **5002**: 资源已存在 - 显示重复提示

### 系统错误 (6xxx)
- **6001**: 服务器内部错误 - 自动重试
- **6003**: 服务不可用 - 显示维护提示

## 最佳实践

### 1. 错误处理

```tsx
// ✅ 好的做法
try {
  const result = await apiCall()
  showSuccess('操作成功')
} catch (error) {
  handleError(error, {
    operation: 'specificOperation',
    context: { userId, resourceId }
  })
}

// ❌ 避免的做法
try {
  const result = await apiCall()
} catch (error) {
  console.error(error) // 用户看不到错误信息
}
```

### 2. 用户反馈

```tsx
// ✅ 提供具体的成功信息
showSuccess('用户创建成功')

// ❌ 模糊的信息
showSuccess('操作完成')
```

### 3. 网络处理

```tsx
// ✅ 检查网络状态
if (!isOnline) {
  showWarning('当前离线，部分功能不可用')
  return
}

// ✅ 使用重试机制
const result = await retryOperation(apiCall)
```

## 配置选项

### ErrorHandler 配置

```typescript
interface ErrorHandlerOptions {
  enableAutoRetry?: boolean      // 启用自动重试
  enableUserFeedback?: boolean   // 启用用户反馈
  showNetworkStatus?: boolean    // 显示网络状态
  maxRetries?: number           // 最大重试次数
}
```

### 网络监控配置

```typescript
interface NetworkMonitorOptions {
  checkInterval?: number        // 检查间隔 (ms)
  timeoutDuration?: number     // 超时时间 (ms)
  enableSpeedTest?: boolean    // 启用速度测试
}
```

## 故障排除

### 常见问题

1. **错误消息不显示**
   - 检查是否正确包装了 ErrorProvider
   - 确认 Ant Design 样式已正确加载

2. **网络状态不更新**
   - 检查浏览器是否支持 online/offline 事件
   - 确认网络监控已正确初始化

3. **重试机制不工作**
   - 检查错误是否被标记为可重试
   - 确认重试配置是否正确

### 调试技巧

```tsx
// 启用详细日志
const errorHandler = new SimpleErrorHandler()
errorHandler.handleError(error, { debug: true })

// 检查网络状态
console.log('网络状态:', errorHandler.getNetworkStatus())
```

## 扩展和自定义

### 自定义错误处理

```tsx
const customErrorHandler = (error: any) => {
  // 自定义错误处理逻辑
  if (error.code === 'CUSTOM_ERROR') {
    // 特殊处理
    return
  }
  
  // 使用默认处理
  handleError(error)
}
```

### 自定义消息样式

```tsx
// 自定义通知样式
notification.config({
  placement: 'topRight',
  duration: 4.5,
  rtl: false,
})
```

## 性能考虑

1. **错误处理**: 避免在错误处理中执行耗时操作
2. **网络监控**: 合理设置检查间隔，避免过于频繁
3. **消息显示**: 控制同时显示的消息数量
4. **内存管理**: 及时清理事件监听器和定时器

## 安全考虑

1. **敏感信息**: 不在错误消息中暴露敏感信息
2. **错误报告**: 过滤敏感数据后再发送错误报告
3. **用户输入**: 验证和清理用户反馈内容
4. **网络请求**: 使用 HTTPS 传输错误报告

## 更新日志

### v1.0.0
- 初始版本发布
- 基础错误处理功能
- 网络状态监控
- 用户反馈系统

### 未来计划
- 错误分析和统计
- 智能错误预测
- 多语言支持
- 更多自定义选项