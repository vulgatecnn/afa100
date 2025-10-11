# 测试执行日志优化需求文档

## 介绍

当前运行 `pnpm test` 时产生大量控制台输出信息，包括详细的测试执行过程、错误堆栈、覆盖率报告等，这些信息占用了大量上下文空间，影响AI助手的工作效率。需要优化测试脚本的输出策略，将详细日志写入文件，控制台只显示关键摘要信息，并提供AI可以轻松读取的错误日志文件。

## 需求

### 需求 1: 控制台输出优化

**用户故事:** 作为开发者，我希望 `pnpm test` 的控制台输出更加简洁，详细信息保存到文件中，这样既能快速了解测试结果，又不会产生过多的控制台噪音。

#### 验收标准

1. WHEN 运行 `pnpm test` 时 THEN 控制台 SHALL 只显示测试进度和最终摘要
2. WHEN 测试失败时 THEN 控制台 SHALL 显示失败测试数量和错误日志文件路径
3. WHEN 测试成功时 THEN 控制台 SHALL 显示通过测试数量和总执行时间
4. WHEN 需要详细信息时 THEN 开发者 SHALL 能够通过 `--verbose` 参数查看完整输出

### 需求 2: 详细日志文件化

**用户故事:** 作为开发者，我希望测试的详细执行信息、错误堆栈、覆盖率详情等都能保存到日志文件中，方便后续分析和调试。

#### 验收标准

1. WHEN 运行测试时 THEN 系统 SHALL 将完整的测试输出写入 `logs/test-execution.log`
2. WHEN 测试失败时 THEN 系统 SHALL 将错误详情写入 `logs/test-errors.log`
3. WHEN 生成覆盖率报告时 THEN 系统 SHALL 将详细报告保存到 `logs/coverage-detailed.log`
4. WHEN 测试完成时 THEN 系统 SHALL 保留原始的vitest输出到日志文件中

### 需求 3: AI可读的错误报告

**用户故事:** 作为AI助手，我希望能够快速读取和分析测试失败信息，而不需要解析大量的控制台输出，以便为开发者提供准确的问题诊断。

#### 验收标准

1. WHEN 测试失败时 THEN 系统 SHALL 生成简洁的错误摘要文件 `logs/errors-summary.txt`
2. WHEN 生成错误摘要时 THEN 文件 SHALL 包含失败测试的文件名、测试名称和简要错误描述
3. WHEN AI需要详细信息时 THEN AI SHALL 能够读取 `logs/test-errors.log` 获取完整错误堆栈
4. WHEN 测试完成时 THEN 系统 SHALL 在控制台输出错误摘要文件的路径

### 需求 4: 测试脚本参数控制

**用户故事:** 作为开发者，我希望能够通过不同的参数控制测试输出的详细程度，在调试时查看完整信息，在日常开发时保持简洁。

#### 验收标准

1. WHEN 使用 `pnpm test` 时 THEN 系统 SHALL 使用简洁输出模式
2. WHEN 使用 `pnpm test:verbose` 时 THEN 系统 SHALL 显示完整的控制台输出
3. WHEN 使用 `pnpm test:silent` 时 THEN 系统 SHALL 只显示最终结果
4. WHEN 使用 `pnpm test:debug` 时 THEN 系统 SHALL 显示详细调试信息

### 需求 5: 覆盖率报告优化

**用户故事:** 作为开发者，我希望覆盖率报告的详细信息保存到文件中，控制台只显示关键的覆盖率数据，避免大量表格输出占用屏幕空间。

#### 验收标准

1. WHEN 运行 `pnpm test:coverage` 时 THEN 控制台 SHALL 只显示总体覆盖率百分比
2. WHEN 覆盖率测试完成时 THEN 详细报告 SHALL 保存到 `logs/coverage-detailed.txt`
3. WHEN 覆盖率低于阈值时 THEN 控制台 SHALL 显示警告和详细报告文件路径
4. WHEN 需要查看详细覆盖率时 THEN 开发者 SHALL 能够查看保存的日志文件

### 需求 6: 日志文件管理

**用户故事:** 作为开发者，我希望测试日志文件能够自动管理，避免占用过多磁盘空间，同时方便AI助手读取最新的错误信息。

#### 验收标准

1. WHEN 运行测试时 THEN 系统 SHALL 自动创建 `logs` 目录（如果不存在）
2. WHEN 新测试开始时 THEN 系统 SHALL 覆盖之前的日志文件（保持最新）
3. WHEN 测试失败时 THEN 错误日志文件 SHALL 保持可读的文本格式
4. WHEN AI需要分析错误时 THEN 日志文件 SHALL 包含足够的上下文信息