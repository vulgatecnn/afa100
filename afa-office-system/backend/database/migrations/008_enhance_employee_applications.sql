-- 增强员工申请表字段
-- 添加新的字段以支持更完整的员工申请信息

-- 添加邮箱字段
ALTER TABLE employee_applications ADD COLUMN email TEXT;

-- 添加预期入职日期字段
ALTER TABLE employee_applications ADD COLUMN start_date DATE;

-- 添加紧急联系人关系字段
ALTER TABLE employee_applications ADD COLUMN emergency_relationship TEXT;

-- 添加拒绝原因字段
ALTER TABLE employee_applications ADD COLUMN rejection_reason TEXT;

-- 创建新的索引
CREATE INDEX IF NOT EXISTS idx_employee_applications_email ON employee_applications(email);
CREATE INDEX IF NOT EXISTS idx_employee_applications_start_date ON employee_applications(start_date);