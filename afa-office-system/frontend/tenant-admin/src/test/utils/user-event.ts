import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'

// 创建一个预配置的userEvent实例
export const createUserEvent = () => {
  return userEvent.setup({
    // 设置合理的延迟以模拟真实用户交互
    delay: null,
    // 跳过悬停事件以提高测试速度
    skipHover: true,
    // 跳过点击时的悬停事件
    skipClick: false,
    // 设置指针事件
    pointerEventsCheck: 0
  })
}

// 导出默认配置的userEvent
export const user = createUserEvent()

// 重新导出userEvent类型
export type { UserEvent } from '@testing-library/user-event'