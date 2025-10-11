import { setupServer } from 'msw/node'
import { handlers } from './handlers'

// 设置MSW服务器用于测试环境
export const server = setupServer(...handlers)