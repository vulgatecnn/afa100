-- MySQL测试环境种子数据
-- 用于初始化测试数据库的基础数据

-- 插入测试项目数据
INSERT INTO projects (code, name, description, status, created_at, updated_at) VALUES
('PRJ001', '测试项目1', '用于测试的项目1', 'active', NOW(), NOW()),
('PRJ002', '测试项目2', '用于测试的项目2', 'active', NOW(), NOW()),
('PRJ003', '测试项目3', '用于测试的项目3', 'inactive', NOW(), NOW());

-- 插入测试场地数据
INSERT INTO venues (project_id, code, name, description, status, created_at, updated_at) VALUES
(1, 'VEN001', '测试场地1', '项目1的测试场地1', 'active', NOW(), NOW()),
(1, 'VEN002', '测试场地2', '项目1的测试场地2', 'active', NOW(), NOW()),
(2, 'VEN003', '测试场地3', '项目2的测试场地1', 'active', NOW(), NOW());

-- 插入测试楼层数据
INSERT INTO floors (venue_id, code, name, description, status, created_at, updated_at) VALUES
(1, 'FL001', '1楼', '场地1的1楼', 'active', NOW(), NOW()),
(1, 'FL002', '2楼', '场地1的2楼', 'active', NOW(), NOW()),
(2, 'FL003', '1楼', '场地2的1楼', 'active', NOW(), NOW()),
(3, 'FL004', '1楼', '场地3的1楼', 'active', NOW(), NOW());

-- 插入测试商户数据
INSERT INTO merchants (name, code, contact, phone, email, address, status, created_at, updated_at) VALUES
('测试商户1', 'MCH001', '张三', '13800138001', 'merchant1@test.com', '测试地址1', 'active', NOW(), NOW()),
('测试商户2', 'MCH002', '李四', '13800138002', 'merchant2@test.com', '测试地址2', 'active', NOW(), NOW()),
('测试商户3', 'MCH003', '王五', '13800138003', 'merchant3@test.com', '测试地址3', 'inactive', NOW(), NOW());

-- 插入测试用户数据
INSERT INTO users (open_id, union_id, phone, name, avatar, user_type, status, merchant_id, password, created_at, updated_at) VALUES
('openid001', 'unionid001', '13900139001', '租务管理员', NULL, 'tenant_admin', 'active', NULL, '$2b$10$hash1', NOW(), NOW()),
('openid002', 'unionid002', '13900139002', '商户管理员1', NULL, 'merchant_admin', 'active', 1, '$2b$10$hash2', NOW(), NOW()),
('openid003', 'unionid003', '13900139003', '商户管理员2', NULL, 'merchant_admin', 'active', 2, '$2b$10$hash3', NOW(), NOW()),
('openid004', 'unionid004', '13900139004', '员工1', NULL, 'employee', 'active', 1, '$2b$10$hash4', NOW(), NOW()),
('openid005', 'unionid005', '13900139005', '员工2', NULL, 'employee', 'active', 1, '$2b$10$hash5', NOW(), NOW()),
('openid006', 'unionid006', '13900139006', '访客1', NULL, 'visitor', 'active', NULL, '$2b$10$hash6', NOW(), NOW());

-- 插入测试权限数据
INSERT INTO permissions (code, name, description, resource_type, resource_id, actions, created_at) VALUES
('PROJ001_ACCESS', '项目1访问权限', '可以访问项目1', 'project', 1, '["read", "write"]', NOW()),
('PROJ002_ACCESS', '项目2访问权限', '可以访问项目2', 'project', 2, '["read"]', NOW()),
('VEN001_ACCESS', '场地1访问权限', '可以访问场地1', 'venue', 1, '["read", "write"]', NOW()),
('VEN002_ACCESS', '场地2访问权限', '可以访问场地2', 'venue', 2, '["read"]', NOW()),
('FL001_ACCESS', '楼层1访问权限', '可以访问楼层1', 'floor', 1, '["read", "write"]', NOW());

-- 插入测试访客申请数据
INSERT INTO visitor_applications (
  applicant_id, merchant_id, visitee_id, visitor_name, visitor_phone, visitor_company,
  visit_purpose, visit_type, scheduled_time, duration, status, approved_by, approved_at,
  passcode, passcode_expiry, usage_limit, usage_count, created_at, updated_at
) VALUES
(6, 1, 4, '测试访客1', '13700137001', '测试公司1', '业务洽谈', 'business', DATE_ADD(NOW(), INTERVAL 1 HOUR), 120, 'approved', 2, NOW(), 'PASS001', DATE_ADD(NOW(), INTERVAL 1 DAY), 3, 0, NOW(), NOW()),
(6, 1, 4, '测试访客2', '13700137002', '测试公司2', '技术交流', 'technical', DATE_ADD(NOW(), INTERVAL 2 HOUR), 90, 'pending', NULL, NULL, NULL, NULL, 1, 0, NOW(), NOW()),
(6, 2, 5, '测试访客3', '13700137003', '测试公司3', '参观访问', 'visit', DATE_ADD(NOW(), INTERVAL 3 HOUR), 60, 'rejected', 3, NOW(), NULL, NULL, 1, 0, NOW(), NOW());

-- 插入测试员工申请数据
INSERT INTO employee_applications (
  applicantId, merchantId, name, phone, department, position, idCard, email,
  startDate, emergencyContact, emergencyPhone, emergencyRelationship,
  status, approvedBy, approvedAt, rejectionReason, createdAt, updatedAt
) VALUES
(4, 1, '新员工1', '13600136001', '技术部', '开发工程师', '110101199001011001', 'emp1@test.com', DATE_ADD(NOW(), INTERVAL 7 DAY), '紧急联系人1', '13500135001', '父亲', 'approved', 2, NOW(), NULL, NOW(), NOW()),
(5, 1, '新员工2', '13600136002', '市场部', '市场专员', '110101199001011002', 'emp2@test.com', DATE_ADD(NOW(), INTERVAL 14 DAY), '紧急联系人2', '13500135002', '母亲', 'pending', NULL, NULL, NULL, NOW(), NOW()),
(6, 2, '新员工3', '13600136003', '财务部', '会计', '110101199001011003', 'emp3@test.com', DATE_ADD(NOW(), INTERVAL 21 DAY), '紧急联系人3', '13500135003', '配偶', 'rejected', 3, NOW(), '资格不符', NOW(), NOW());

-- 插入测试通行码数据
INSERT INTO passcodes (user_id, code, type, status, expiry_time, usage_limit, usage_count, permissions, application_id, created_at, updated_at) VALUES
(4, 'EMP001', 'employee', 'active', DATE_ADD(NOW(), INTERVAL 30 DAY), 100, 5, '["project:1", "venue:1", "floor:1"]', NULL, NOW(), NOW()),
(5, 'EMP002', 'employee', 'active', DATE_ADD(NOW(), INTERVAL 30 DAY), 100, 2, '["project:1", "venue:1"]', NULL, NOW(), NOW()),
(6, 'VIS001', 'visitor', 'active', DATE_ADD(NOW(), INTERVAL 1 DAY), 3, 1, '["venue:1", "floor:1"]', 1, NOW(), NOW()),
(6, 'VIS002', 'visitor', 'expired', DATE_SUB(NOW(), INTERVAL 1 DAY), 1, 1, '["venue:2"]', NULL, NOW(), NOW());

-- 插入测试通行记录数据
INSERT INTO access_records (
  user_id, passcode_id, device_id, device_type, direction, result, fail_reason,
  project_id, venue_id, floor_id, timestamp
) VALUES
(4, 1, 'DEVICE001', 'card_reader', 'in', 'success', NULL, 1, 1, 1, DATE_SUB(NOW(), INTERVAL 2 HOUR)),
(4, 1, 'DEVICE001', 'card_reader', 'out', 'success', NULL, 1, 1, 1, DATE_SUB(NOW(), INTERVAL 1 HOUR)),
(5, 2, 'DEVICE002', 'qr_scanner', 'in', 'success', NULL, 1, 1, NULL, DATE_SUB(NOW(), INTERVAL 3 HOUR)),
(6, 3, 'DEVICE001', 'face_recognition', 'in', 'success', NULL, 1, 1, 1, DATE_SUB(NOW(), INTERVAL 4 HOUR)),
(6, 4, 'DEVICE002', 'qr_scanner', 'in', 'failed', '通行码已过期', 1, 2, NULL, DATE_SUB(NOW(), INTERVAL 30 MINUTE));

-- 更新统计信息（如果需要）
-- 这些语句可能需要根据实际的表结构进行调整
UPDATE merchants SET settings = JSON_OBJECT(
  'maxEmployees', 50,
  'maxVisitors', 20,
  'workingHours', JSON_OBJECT('start', '09:00', 'end', '18:00'),
  'allowWeekendAccess', true
) WHERE id IN (1, 2, 3);

-- 插入一些测试配置数据（如果有配置表的话）
-- INSERT INTO system_configs (key, value, description, created_at, updated_at) VALUES
-- ('passcode_default_duration', '86400', '默认通行码有效期（秒）', NOW(), NOW()),
-- ('passcode_default_usage_limit', '10', '默认通行码使用次数限制', NOW(), NOW()),
-- ('visitor_approval_timeout', '3600', '访客申请审批超时时间（秒）', NOW(), NOW());

-- 提交事务
COMMIT;