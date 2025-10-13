-- 集成测试数据库表结构创建脚本
-- 专门用于集成测试环境，包含完整的业务表结构

-- 删除已存在的表（按依赖关系逆序）
DROP TABLE IF EXISTS `merchant_permissions`;
DROP TABLE IF EXISTS `user_permissions`;
DROP TABLE IF EXISTS `access_records`;
DROP TABLE IF EXISTS `passcodes`;
DROP TABLE IF EXISTS `visitor_applications`;
DROP TABLE IF EXISTS `floors`;
DROP TABLE IF EXISTS `venues`;
DROP TABLE IF EXISTS `projects`;
DROP TABLE IF EXISTS `users`;
DROP TABLE IF EXISTS `merchants`;
DROP TABLE IF EXISTS `permissions`;

-- 用户表
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL COMMENT '用户姓名',
  `phone` VARCHAR(20) UNIQUE COMMENT '手机号码',
  `open_id` VARCHAR(100) UNIQUE COMMENT '微信OpenID',
  `union_id` VARCHAR(100) COMMENT '微信UnionID',
  `avatar` VARCHAR(500) COMMENT '头像URL',
  `user_type` ENUM('tenant_admin', 'merchant_admin', 'employee', 'visitor') NOT NULL COMMENT '用户类型',
  `status` ENUM('active', 'inactive', 'pending') DEFAULT 'active' COMMENT '用户状态',
  `merchant_id` INT NULL COMMENT '所属商户ID',
  `password` VARCHAR(255) COMMENT '密码（可选，主要用于管理员）',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX `idx_phone` (`phone`),
  INDEX `idx_open_id` (`open_id`),
  INDEX `idx_user_type` (`user_type`),
  INDEX `idx_merchant_id` (`merchant_id`),
  INDEX `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户表';

-- 商户表
CREATE TABLE IF NOT EXISTS `merchants` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(200) NOT NULL COMMENT '商户名称',
  `code` VARCHAR(50) UNIQUE NOT NULL COMMENT '商户编码',
  `contact` VARCHAR(100) COMMENT '联系人',
  `phone` VARCHAR(20) COMMENT '联系电话',
  `email` VARCHAR(255) COMMENT '联系邮箱',
  `address` VARCHAR(500) COMMENT '地址',
  `status` ENUM('active', 'inactive') DEFAULT 'active' COMMENT '商户状态',
  `settings` JSON COMMENT '商户配置信息',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX `idx_code` (`code`),
  INDEX `idx_status` (`status`),
  INDEX `idx_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='商户表';

-- 项目表
CREATE TABLE IF NOT EXISTS `projects` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `code` VARCHAR(50) UNIQUE NOT NULL COMMENT '项目编码',
  `name` VARCHAR(200) NOT NULL COMMENT '项目名称',
  `description` TEXT COMMENT '项目描述',
  `status` ENUM('active', 'inactive') DEFAULT 'active' COMMENT '项目状态',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX `idx_code` (`code`),
  INDEX `idx_status` (`status`),
  INDEX `idx_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='项目表';

-- 场地表
CREATE TABLE IF NOT EXISTS `venues` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `project_id` INT NOT NULL COMMENT '所属项目ID',
  `code` VARCHAR(50) UNIQUE NOT NULL COMMENT '场地编码',
  `name` VARCHAR(200) NOT NULL COMMENT '场地名称',
  `description` TEXT COMMENT '场地描述',
  `status` ENUM('active', 'inactive') DEFAULT 'active' COMMENT '场地状态',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX `idx_project_id` (`project_id`),
  INDEX `idx_code` (`code`),
  INDEX `idx_status` (`status`),
  INDEX `idx_name` (`name`),
  FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='场地表';

-- 楼层表
CREATE TABLE IF NOT EXISTS `floors` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `venue_id` INT NOT NULL COMMENT '所属场地ID',
  `code` VARCHAR(50) UNIQUE NOT NULL COMMENT '楼层编码',
  `name` VARCHAR(200) NOT NULL COMMENT '楼层名称',
  `description` TEXT COMMENT '楼层描述',
  `status` ENUM('active', 'inactive') DEFAULT 'active' COMMENT '楼层状态',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX `idx_venue_id` (`venue_id`),
  INDEX `idx_code` (`code`),
  INDEX `idx_status` (`status`),
  INDEX `idx_name` (`name`),
  FOREIGN KEY (`venue_id`) REFERENCES `venues`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='楼层表';

-- 访客申请表
CREATE TABLE IF NOT EXISTS `visitor_applications` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `applicant_id` INT NOT NULL COMMENT '申请人ID',
  `merchant_id` INT NOT NULL COMMENT '被访问商户ID',
  `visitee_id` INT COMMENT '被访问人ID',
  `visitor_name` VARCHAR(100) NOT NULL COMMENT '访客姓名',
  `visitor_phone` VARCHAR(20) NOT NULL COMMENT '访客手机号',
  `visitor_company` VARCHAR(200) COMMENT '访客公司',
  `visit_purpose` VARCHAR(500) NOT NULL COMMENT '访问目的',
  `visit_type` VARCHAR(50) COMMENT '访问类型',
  `scheduled_time` DATETIME NOT NULL COMMENT '预约时间',
  `duration` INT NOT NULL DEFAULT 1 COMMENT '访问时长（小时）',
  `status` ENUM('pending', 'approved', 'rejected', 'expired', 'completed') DEFAULT 'pending' COMMENT '申请状态',
  `approved_by` INT NULL COMMENT '审批人ID',
  `approved_at` DATETIME NULL COMMENT '审批时间',
  `rejection_reason` VARCHAR(500) COMMENT '拒绝原因',
  `passcode` VARCHAR(100) COMMENT '通行码',
  `passcode_expiry` DATETIME COMMENT '通行码过期时间',
  `usage_limit` INT DEFAULT 1 COMMENT '使用次数限制',
  `usage_count` INT DEFAULT 0 COMMENT '已使用次数',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX `idx_applicant_id` (`applicant_id`),
  INDEX `idx_merchant_id` (`merchant_id`),
  INDEX `idx_visitee_id` (`visitee_id`),
  INDEX `idx_status` (`status`),
  INDEX `idx_scheduled_time` (`scheduled_time`),
  INDEX `idx_visitor_phone` (`visitor_phone`),
  INDEX `idx_passcode` (`passcode`),
  FOREIGN KEY (`applicant_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`merchant_id`) REFERENCES `merchants`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`visitee_id`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`approved_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='访客申请表';

-- 通行码表
CREATE TABLE IF NOT EXISTS `passcodes` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL COMMENT '用户ID',
  `code` VARCHAR(100) UNIQUE NOT NULL COMMENT '通行码',
  `type` ENUM('employee', 'visitor') NOT NULL COMMENT '通行码类型',
  `status` ENUM('active', 'expired', 'revoked') DEFAULT 'active' COMMENT '通行码状态',
  `expiry_time` DATETIME COMMENT '过期时间',
  `usage_limit` INT DEFAULT 1 COMMENT '使用次数限制',
  `usage_count` INT DEFAULT 0 COMMENT '已使用次数',
  `permissions` JSON COMMENT '权限配置',
  `application_id` INT COMMENT '关联的申请ID',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX `idx_user_id` (`user_id`),
  INDEX `idx_code` (`code`),
  INDEX `idx_type` (`type`),
  INDEX `idx_status` (`status`),
  INDEX `idx_expiry_time` (`expiry_time`),
  INDEX `idx_application_id` (`application_id`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`application_id`) REFERENCES `visitor_applications`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='通行码表';

-- 通行记录表
CREATE TABLE IF NOT EXISTS `access_records` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL COMMENT '用户ID',
  `passcode_id` INT COMMENT '通行码ID',
  `device_id` VARCHAR(100) NOT NULL COMMENT '设备ID',
  `device_type` VARCHAR(50) COMMENT '设备类型',
  `direction` ENUM('in', 'out') NOT NULL COMMENT '通行方向',
  `result` ENUM('success', 'failed') NOT NULL COMMENT '通行结果',
  `fail_reason` VARCHAR(500) COMMENT '失败原因',
  `project_id` INT COMMENT '项目ID',
  `venue_id` INT COMMENT '场地ID',
  `floor_id` INT COMMENT '楼层ID',
  `timestamp` DATETIME NOT NULL COMMENT '通行时间',
  INDEX `idx_user_id` (`user_id`),
  INDEX `idx_passcode_id` (`passcode_id`),
  INDEX `idx_device_id` (`device_id`),
  INDEX `idx_result` (`result`),
  INDEX `idx_timestamp` (`timestamp`),
  INDEX `idx_project_id` (`project_id`),
  INDEX `idx_venue_id` (`venue_id`),
  INDEX `idx_floor_id` (`floor_id`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`passcode_id`) REFERENCES `passcodes`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`venue_id`) REFERENCES `venues`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`floor_id`) REFERENCES `floors`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='通行记录表';

-- 权限表
CREATE TABLE IF NOT EXISTS `permissions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `code` VARCHAR(100) UNIQUE NOT NULL COMMENT '权限代码',
  `name` VARCHAR(200) NOT NULL COMMENT '权限名称',
  `description` VARCHAR(500) COMMENT '权限描述',
  `resource_type` ENUM('project', 'venue', 'floor') NOT NULL COMMENT '资源类型',
  `resource_id` INT NOT NULL COMMENT '资源ID',
  `actions` JSON NOT NULL COMMENT '允许的操作',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  INDEX `idx_code` (`code`),
  INDEX `idx_resource` (`resource_type`, `resource_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='权限表';

-- 用户权限关联表
CREATE TABLE IF NOT EXISTS `user_permissions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL COMMENT '用户ID',
  `permission_id` INT NOT NULL COMMENT '权限ID',
  `granted_by` INT NOT NULL COMMENT '授权人ID',
  `granted_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '授权时间',
  UNIQUE KEY `uk_user_permission` (`user_id`, `permission_id`),
  INDEX `idx_user_id` (`user_id`),
  INDEX `idx_permission_id` (`permission_id`),
  INDEX `idx_granted_by` (`granted_by`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`permission_id`) REFERENCES `permissions`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`granted_by`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户权限关联表';

-- 商户权限关联表
CREATE TABLE IF NOT EXISTS `merchant_permissions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `merchant_id` INT NOT NULL COMMENT '商户ID',
  `permission_id` INT NOT NULL COMMENT '权限ID',
  `granted_by` INT NOT NULL COMMENT '授权人ID',
  `granted_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '授权时间',
  UNIQUE KEY `uk_merchant_permission` (`merchant_id`, `permission_id`),
  INDEX `idx_merchant_id` (`merchant_id`),
  INDEX `idx_permission_id` (`permission_id`),
  INDEX `idx_granted_by` (`granted_by`),
  FOREIGN KEY (`merchant_id`) REFERENCES `merchants`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`permission_id`) REFERENCES `permissions`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`granted_by`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='商户权限关联表';

-- 添加用户表的商户外键约束
ALTER TABLE `users` ADD CONSTRAINT `fk_users_merchant` 
FOREIGN KEY (`merchant_id`) REFERENCES `merchants`(`id`) ON DELETE SET NULL;