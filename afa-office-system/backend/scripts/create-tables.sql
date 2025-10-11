-- AFA办公小程序数据库表结构创建脚本
-- 在对应的数据库中执行此脚本

-- 用户表
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL COMMENT '用户姓名',
  `email` VARCHAR(255) UNIQUE NOT NULL COMMENT '邮箱地址',
  `phone` VARCHAR(20) COMMENT '手机号码',
  `password_hash` VARCHAR(255) NOT NULL COMMENT '密码哈希',
  `user_type` ENUM('tenant_admin', 'merchant_admin', 'merchant_employee') NOT NULL COMMENT '用户类型',
  `status` ENUM('active', 'inactive', 'pending') DEFAULT 'pending' COMMENT '用户状态',
  `merchant_id` INT NULL COMMENT '所属商户ID',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX `idx_email` (`email`),
  INDEX `idx_user_type` (`user_type`),
  INDEX `idx_merchant_id` (`merchant_id`),
  INDEX `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户表';

-- 商户表
CREATE TABLE IF NOT EXISTS `merchants` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(200) NOT NULL COMMENT '商户名称',
  `code` VARCHAR(50) UNIQUE NOT NULL COMMENT '商户编码',
  `contact_person` VARCHAR(100) NOT NULL COMMENT '联系人',
  `phone` VARCHAR(20) NOT NULL COMMENT '联系电话',
  `email` VARCHAR(255) COMMENT '联系邮箱',
  `status` ENUM('active', 'inactive', 'pending') DEFAULT 'pending' COMMENT '商户状态',
  `settings` JSON COMMENT '商户配置信息',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX `idx_code` (`code`),
  INDEX `idx_status` (`status`),
  INDEX `idx_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='商户表';

-- 空间表（支持层级结构）
CREATE TABLE IF NOT EXISTS `spaces` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(200) NOT NULL COMMENT '空间名称',
  `type` ENUM('project', 'venue', 'floor', 'room') NOT NULL COMMENT '空间类型',
  `code` VARCHAR(50) UNIQUE NOT NULL COMMENT '空间编码',
  `parent_id` INT NULL COMMENT '父级空间ID',
  `status` ENUM('active', 'inactive') DEFAULT 'active' COMMENT '空间状态',
  `description` TEXT COMMENT '空间描述',
  `capacity` INT COMMENT '容量',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX `idx_type` (`type`),
  INDEX `idx_parent_id` (`parent_id`),
  INDEX `idx_status` (`status`),
  INDEX `idx_code` (`code`),
  FOREIGN KEY (`parent_id`) REFERENCES `spaces`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='空间表';

-- 商户空间关联表
CREATE TABLE IF NOT EXISTS `merchant_spaces` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `merchant_id` INT NOT NULL COMMENT '商户ID',
  `space_id` INT NOT NULL COMMENT '空间ID',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  UNIQUE KEY `uk_merchant_space` (`merchant_id`, `space_id`),
  FOREIGN KEY (`merchant_id`) REFERENCES `merchants`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`space_id`) REFERENCES `spaces`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='商户空间关联表';

-- 访客申请表
CREATE TABLE IF NOT EXISTS `visitor_applications` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `visitor_name` VARCHAR(100) NOT NULL COMMENT '访客姓名',
  `phone` VARCHAR(20) NOT NULL COMMENT '访客手机号',
  `company` VARCHAR(200) COMMENT '访客公司',
  `purpose` VARCHAR(500) NOT NULL COMMENT '访问目的',
  `visit_date` DATETIME NOT NULL COMMENT '访问日期',
  `duration` INT NOT NULL DEFAULT 1 COMMENT '访问时长（小时）',
  `status` ENUM('pending', 'approved', 'rejected', 'expired', 'used') DEFAULT 'pending' COMMENT '申请状态',
  `qr_code` VARCHAR(255) COMMENT '二维码数据',
  `merchant_id` INT NOT NULL COMMENT '被访问商户ID',
  `applicant_id` INT NOT NULL COMMENT '申请人ID（商户员工）',
  `approved_by` INT NULL COMMENT '审批人ID',
  `rejected_reason` VARCHAR(500) COMMENT '拒绝原因',
  `usage_count` INT DEFAULT 0 COMMENT '使用次数',
  `max_usage` INT DEFAULT 1 COMMENT '最大使用次数',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX `idx_status` (`status`),
  INDEX `idx_merchant_id` (`merchant_id`),
  INDEX `idx_applicant_id` (`applicant_id`),
  INDEX `idx_visit_date` (`visit_date`),
  INDEX `idx_phone` (`phone`),
  FOREIGN KEY (`merchant_id`) REFERENCES `merchants`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`applicant_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`approved_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='访客申请表';

-- 通行码表
CREATE TABLE IF NOT EXISTS `passcodes` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `code` VARCHAR(64) UNIQUE NOT NULL COMMENT '通行码',
  `user_id` INT NOT NULL COMMENT '用户ID',
  `type` ENUM('employee', 'visitor') NOT NULL COMMENT '通行码类型',
  `status` ENUM('active', 'expired', 'used', 'disabled') DEFAULT 'active' COMMENT '通行码状态',
  `valid_from` DATETIME NOT NULL COMMENT '有效开始时间',
  `valid_until` DATETIME NOT NULL COMMENT '有效结束时间',
  `usage_count` INT DEFAULT 0 COMMENT '使用次数',
  `max_usage` INT DEFAULT 1 COMMENT '最大使用次数',
  `qr_code_data` TEXT COMMENT '二维码数据',
  `visitor_application_id` INT NULL COMMENT '关联的访客申请ID',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX `idx_code` (`code`),
  INDEX `idx_user_id` (`user_id`),
  INDEX `idx_type` (`type`),
  INDEX `idx_status` (`status`),
  INDEX `idx_valid_period` (`valid_from`, `valid_until`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`visitor_application_id`) REFERENCES `visitor_applications`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='通行码表';

-- 通行记录表
CREATE TABLE IF NOT EXISTS `access_records` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL COMMENT '用户ID',
  `passcode_id` INT NOT NULL COMMENT '通行码ID',
  `device_id` VARCHAR(100) NOT NULL COMMENT '设备ID',
  `location` VARCHAR(200) NOT NULL COMMENT '通行位置',
  `result` ENUM('success', 'failed', 'denied') NOT NULL COMMENT '通行结果',
  `failure_reason` VARCHAR(500) COMMENT '失败原因',
  `access_time` DATETIME NOT NULL COMMENT '通行时间',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '记录创建时间',
  INDEX `idx_user_id` (`user_id`),
  INDEX `idx_passcode_id` (`passcode_id`),
  INDEX `idx_device_id` (`device_id`),
  INDEX `idx_result` (`result`),
  INDEX `idx_access_time` (`access_time`),
  INDEX `idx_location` (`location`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`passcode_id`) REFERENCES `passcodes`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='通行记录表';

-- 权限表
CREATE TABLE IF NOT EXISTS `permissions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) UNIQUE NOT NULL COMMENT '权限名称',
  `description` VARCHAR(500) COMMENT '权限描述',
  `resource` VARCHAR(100) NOT NULL COMMENT '资源名称',
  `action` VARCHAR(50) NOT NULL COMMENT '操作名称',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  INDEX `idx_resource_action` (`resource`, `action`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='权限表';

-- 用户权限关联表
CREATE TABLE IF NOT EXISTS `user_permissions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL COMMENT '用户ID',
  `permission_id` INT NOT NULL COMMENT '权限ID',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  UNIQUE KEY `uk_user_permission` (`user_id`, `permission_id`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`permission_id`) REFERENCES `permissions`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户权限关联表';

-- 添加外键约束
ALTER TABLE `users` ADD CONSTRAINT `fk_users_merchant` 
FOREIGN KEY (`merchant_id`) REFERENCES `merchants`(`id`) ON DELETE SET NULL;