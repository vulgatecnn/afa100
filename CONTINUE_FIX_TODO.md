# 继续修复 TODO 清单

## 📅 创建时间
**2025-10-15 10:20**

---

## 🎯 当前状态

- ✅ 已修复: 6个测试
- 🟡 进行中: 阶段1 - 组件测试
- ⏳ 剩余: 61个测试需要修复

---

## 📋 详细 TODO 清单

### 🔥 优先级1: 完成阶段1 - 组件测试修复

#### ☐ 任务 1.1: 修复 qr-code.test.ts 的 .methods. 调用

**预计时间**: 10分钟  
**影响**: 10个测试  
**难度**: ⭐ 简单

**步骤**:
```bash
# 1. 备份文件
cd afa-office-system/miniprogram/tests/unit/components
cp qr-code.test.ts qr-code.test.ts.bak

# 2. 查找所有 .methods. 调用
grep -n "\.methods\." qr-code.test.ts

# 3. 使用编辑器批量替换
# 查找: .methods.
# 替换为: .

# 4. 验证修复
cd ../../..
pnpm test -- qr-code.test.ts
```

**预期结果**: 
- 从10个失败 → 约6-8个失败
- 改进2-4个测试

---

#### ☐ 任务 1.2: 修复 status-badge.test.ts 的 getStatusConfig 调用

**预计时间**: 5分钟  
**影响**: 1个测试  
**难度**: ⭐ 简单

**位置**: 第354-365行

**修改**:
```typescript
// ❌ 修改前
expect(statusBadgeComponent.methods.getStatusConfig('pending')).toEqual({...});
expect(statusBadgeComponent.methods.getStatusConfig('approved')).toEqual({...});
expect(statusBadgeComponent.methods.getStatusConfig('rejected')).toEqual({...});

// ✅ 修改后
expect(statusBadgeComponent.getStatusConfig('pending')).toEqual({...});
expect(statusBadgeComponent.getStatusConfig('approved')).toEqual({...});
expect(statusBadgeComponent.getStatusConfig('rejected')).toEqual({...});
```

**验证**:
```bash
cd afa-office-system/miniprogram
pnpm test -- status-badge.test.ts
```

---

#### ☐ 任务 1.3: 修复测试数据结构 - properties 格式

**预计时间**: 30-45分钟  
**影响**: 约20个测试  
**难度**: ⭐⭐ 中等

**问题**: 测试使用了小程序属性定义格式，但 `createMockComponent` 期望简单键值对

**需要修改的文件**:
1. `form-field.test.ts` - 约10处
2. `status-badge.test.ts` - 约8处
3. `qr-code.test.ts` - 约5处

**修改模式**:
```typescript
// ❌ 错误格式（小程序定义格式）
const component = createMockComponent({
  properties: {
    status: { type: String, value: 'pending' },
    text: { type: String, value: '' },
    disabled: { type: Boolean, value: false }
  }
});

// ✅ 正确格式（测试期望格式）
const component = createMockComponent({
  properties: {
    status: 'pending',
    text: '',
    disabled: false
  }
});
```

**批量修改策略**:

**文件1: form-field.test.ts**
```typescript
// 需要修改的位置（示例）：
// 第18-49行: 组件初始化测试
// 第270-316行: 表单验证测试
// 第371-425行: 正则表达式验证
// 第475-507行: 综合验证测试
// 第531-573行: 样式计算测试
// 第684-739行: 不同字段类型测试
```

**文件2: status-badge.test.ts**
```typescript
// 需要修改的位置（示例）：
// 第218-243行: 样式计算测试
// 第247-276行: 圆角样式测试
// 第282-306行: 点击事件测试
// 第310-331行: 禁用点击测试
// 第407-431行: 显示文本测试
// 第435-459行: 自定义文本测试
// 第463-485行: 状态值显示测试
// 第491-537行: 条件渲染测试
```

**验证**:
```bash
# 验证单个文件
pnpm test -- form-field.test.ts
pnpm test -- status-badge.test.ts
pnpm test -- qr-code.test.ts

# 验证所有组件测试
pnpm test -- tests/unit/components/
```

---

#### ☐ 任务 1.4: 验证阶段1修复效果

**预计时间**: 10分钟  
**目标**: 组件测试通过率 ≥ 80%

**验证命令**:
```bash
cd afa-office-system/miniprogram
pnpm test -- tests/unit/components/ --reporter=verbose
```

**成功标准**:
- [ ] form-field.test.ts: ≥ 15/20 通过
- [ ] status-badge.test.ts: ≥ 12/16 通过
- [ ] qr-code.test.ts: ≥ 8/10 通过
- [ ] 总通过率: ≥ 80% (37/46)

---

### 🟡 优先级2: 修复商户管理端超时设置

#### ☐ 任务 2: 删除 employeeService.test.ts 的超时设置

**预计时间**: 5分钟  
**影响**: 3个测试  
**难度**: ⭐ 简单

**文件**: `afa-office-system/frontend/merchant-admin/src/services/__tests__/employeeService.test.ts`

**修改位置**:
- 第516行
- 第536行
- 第556行

**修改内容**:
```typescript
// ❌ 修改前
it('应该成功批量导入员工', async () => {
  // ... 测试代码
}, 10000) // 增加超时时间

// ✅ 修改后
it('应该成功批量导入员工', async () => {
  // ... 测试代码
})
```

**验证**:
```bash
cd afa-office-system/frontend/merchant-admin
pnpm test -- employeeService.test.ts
```

**预期结果**: 3个测试从超时失败 → 通过

---

### 🟢 优先级3: 修复小程序工具函数边界条件

#### ☐ 任务 3.1: 修复 date.test.ts (1个测试)

**预计时间**: 10分钟  
**文件**: `afa-office-system/miniprogram/tests/unit/utils/date.test.ts`

**问题**: `DateUtils.format(null)` 和 `DateUtils.format(undefined)` 抛出错误

**修改文件**: `afa-office-system/miniprogram/src/utils/date.ts`

```typescript
// 在 DateUtils.format 方法开头添加
static format(date: Date | string | null | undefined, format?: string): string {
  // 添加空值检查
  if (!date || date === null || date === undefined) {
    return '';
  }
  
  // ... 原有逻辑
}
```

---

#### ☐ 任务 3.2: 修复 storage.test.ts (2个测试)

**预计时间**: 10分钟  
**文件**: `afa-office-system/miniprogram/tests/unit/utils/storage.test.ts`

**问题**: 错误消息不匹配

**解决方案**: 更新测试断言或修改实现的错误消息，使其一致

---

#### ☐ 任务 3.3: 修复 notification.test.ts (1个测试)

**预计时间**: 10分钟  
**文件**: `afa-office-system/miniprogram/tests/unit/services/notification.test.ts`

**问题**: 长文本没有被正确截断（105 > 104）

**修改文件**: 通知服务实现

```typescript
// 确保文本长度限制
const maxLength = 104;
if (content.length > maxLength) {
  content = content.substring(0, maxLength);
}
```

---

#### ☐ 任务 3.4: 修复 api.test.ts (1个测试)

**预计时间**: 10分钟  
**文件**: `afa-office-system/miniprogram/tests/unit/services/api.test.ts`

**问题**: 并发请求返回的ID不正确

**解决方案**: 检查Mock实现，确保每个请求返回正确的ID

---

### ✅ 优先级4: 运行完整测试并生成报告

#### ☐ 任务 4: 验证所有修复并生成报告

**预计时间**: 15分钟

**步骤**:
```bash
# 1. 运行完整测试
cd d:\vulgate\code\kiro\afa100
pnpm test

# 2. 生成覆盖率报告
cd afa-office-system/miniprogram
pnpm test:coverage

cd ../frontend/merchant-admin
pnpm test:coverage

# 3. 创建最终报告
# 更新 FIX_PROGRESS_REPORT.md
# 创建 FIX_COMPLETION_REPORT.md
```

---

## 📊 预期成果

### 修复前后对比

| 模块 | 修复前 | 修复后 | 改进 |
|------|--------|--------|------|
| **小程序组件** | 3/46 | 37/46 | +34 ✅ |
| **商户管理端** | 59/62 | 62/62 | +3 ✅ |
| **小程序工具** | 未知 | 预计+5 | +5 ✅ |
| **总计** | 500/603 | 542/603 | **+42** ✅ |
| **通过率** | 82.9% | **89.9%** | +7% 📈 |

---

## ⏱️ 时间规划

| 任务 | 预计时间 | 累计时间 |
|------|---------|---------|
| 1.1 qr-code修复 | 10分钟 | 10分钟 |
| 1.2 getStatusConfig | 5分钟 | 15分钟 |
| 1.3 数据结构修复 | 45分钟 | 60分钟 |
| 1.4 验证阶段1 | 10分钟 | 70分钟 |
| 2. 超时设置 | 5分钟 | 75分钟 |
| 3. 工具函数 | 40分钟 | 115分钟 |
| 4. 最终验证 | 15分钟 | **130分钟** |

**总预计时间**: 约2小时10分钟

---

## 🎯 执行顺序

### 第一轮（快速胜利）- 30分钟
1. ✅ 任务1.1: qr-code.test.ts
2. ✅ 任务1.2: getStatusConfig
3. ✅ 任务2: 超时设置

**预期**: 修复约14个测试

### 第二轮（核心修复）- 60分钟
4. ✅ 任务1.3: 数据结构修复
5. ✅ 任务1.4: 验证阶段1

**预期**: 修复约20个测试

### 第三轮（完善细节）- 40分钟
6. ✅ 任务3.1-3.4: 工具函数
7. ✅ 任务4: 最终验证

**预期**: 修复约5个测试，完成所有验证

---

## 📝 执行检查清单

### 开始前
- [ ] 确保所有文件已备份
- [ ] Git状态干净或已提交
- [ ] 了解每个任务的目标

### 执行中
- [ ] 每完成一个任务就标记
- [ ] 每个任务后运行验证命令
- [ ] 记录遇到的问题

### 完成后
- [ ] 所有任务都已标记完成
- [ ] 运行完整测试套件
- [ ] 生成最终报告
- [ ] 更新文档

---

## 🚀 立即开始

**下一步**: 执行任务1.1 - 修复 qr-code.test.ts

```bash
cd afa-office-system/miniprogram/tests/unit/components
cp qr-code.test.ts qr-code.test.ts.bak
# 然后使用编辑器查找替换 .methods. → .
```

---

## 📞 需要帮助？

如果遇到问题，参考：
- `FIX_PROGRESS_REPORT.md` - 当前进度
- `FINAL_FIX_SUMMARY.md` - 详细修复指南
- `TEST_FIX_ACTION_PLAN.md` - 完整行动计划

---

**创建时间**: 2025-10-15 10:20  
**预计完成**: 2025-10-15 12:30  
**状态**: 🟡 进行中
