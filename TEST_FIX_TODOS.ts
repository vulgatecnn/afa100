/**
 * 测试修复待办事项
 * 这个文件包含所有待办任务，IDE会在TODO面板中显示
 */

// TODO: [优先级1] 任务1.1 - 修复 qr-code.test.ts 的 .methods. 调用 (10分钟)
// 文件: afa-office-system/miniprogram/tests/unit/components/qr-code.test.ts
// 操作: 查找替换 .methods. → .
// 验证: cd afa-office-system/miniprogram && pnpm test -- qr-code.test.ts

// TODO: [优先级1] 任务1.2 - 修复 status-badge.test.ts 的 getStatusConfig 调用 (5分钟)
// 文件: afa-office-system/miniprogram/tests/unit/components/status-badge.test.ts
// 位置: 第354-365行
// 修改: statusBadgeComponent.methods.getStatusConfig → statusBadgeComponent.getStatusConfig

// TODO: [优先级1] 任务1.3 - 修复测试数据结构 properties 格式 (45分钟)
// 文件: form-field.test.ts, status-badge.test.ts, qr-code.test.ts
// 修改: { type: String, value: 'xxx' } → 'xxx'
// 影响: 约20个测试

// TODO: [优先级1] 任务1.4 - 验证阶段1修复效果 (10分钟)
// 目标: 组件测试通过率 ≥ 80%
// 命令: pnpm test -- tests/unit/components/

// TODO: [优先级2] 任务2 - 修复商户管理端超时设置 (5分钟)
// 文件: afa-office-system/frontend/merchant-admin/src/services/__tests__/employeeService.test.ts
// 位置: 第516、536、556行
// 修改: 删除 , 10000) // 增加超时时间

// TODO: [优先级3] 任务3.1 - 修复 date.test.ts 边界条件 (10分钟)
// 文件: afa-office-system/miniprogram/src/utils/date.ts
// 修改: 在 format 方法开头添加空值检查

// TODO: [优先级3] 任务3.2 - 修复 storage.test.ts 错误消息 (10分钟)
// 文件: afa-office-system/miniprogram/tests/unit/utils/storage.test.ts
// 修改: 更新错误消息断言

// TODO: [优先级3] 任务3.3 - 修复 notification.test.ts 文本长度 (10分钟)
// 修改: 添加文本长度限制为104字符

// TODO: [优先级3] 任务3.4 - 修复 api.test.ts 并发请求 (10分钟)
// 文件: afa-office-system/miniprogram/tests/unit/services/api.test.ts
// 修改: 修复Mock返回的ID

// TODO: [优先级4] 任务4 - 运行完整测试并生成报告 (15分钟)
// 命令: cd d:\vulgate\code\kiro\afa100 && pnpm test
// 目标: 通过率从82.9%提升到89.9%

// FIXME: 当前测试通过率: 82.9% (500/603)
// FIXME: 目标通过率: 89.9% (542/603)
// FIXME: 需要修复: 42个测试

// NOTE: 总预计时间: 约2小时10分钟
// NOTE: 预期成果: +42个测试通过，通过率提升7%

export {};
