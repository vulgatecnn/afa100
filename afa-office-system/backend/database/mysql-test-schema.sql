-- AFA办公小程序MySQL测试数据库结构
-- 专为MySQL优化的版本，用于单元测试和集成测试

-- 商户表 (必须在用户表之前创建，因为用户表有外键引用)
CREATE TABLE IF NOT EXISTS `merchants` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(200) NOT NULL,
    `code` VARCHAR(50) UNIQUE NOT NULL,
    `contact` VARCHAR(100),
    `phone` VARCHAR(20),
    `email` VARCHAR(100),
    `address` TEXT,
    `status` ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
    `settings` JSON,
    `subscription` JSON,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_code` (`code`),
    INDEX `idx_status` (`status`),
    INDEX `idx_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 用户表
CREATE TABLE IF NOT EXISTS `users` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `open_id` VARCHAR(255) UNIQUE,
    `union_id` VARCHAR(255),
    `phone` VARCHAR(20),
    `name` VARCHAR(100) NOT NULL,
    `avatar` TEXT,
    `user_type` ENUM('tenant_admin', 'merchant_admin', 'employee', 'visitor') NOT NULL,
    `role` VARCHAR(50),
    `status` ENUM('active', 'inactive', 'pending') NOT NULL DEFAULT 'active',
    `permissions` JSON,
    `merchant_id` INT,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_merchant_id` (`merchant_id`),
    INDEX `idx_user_type` (`user_type`),
    INDEX `idx_status` (`status`),
    INDEX `idx_open_id` (`open_id`),
    INDEX `idx_role` (`role`),
    FOREIGN KEY (`merchant_id`) REFERENCES `merchants`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 项目表
CREATE TABLE IF NOT EXISTS `projects` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `code` VARCHAR(50) UNIQUE NOT NULL,
    `name` VARCHAR(200) NOT NULL,
    `description` TEXT,
    `status` ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_code` (`code`),
    INDEX `idx_status` (`status`),
    INDEX `idx_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 场地表
CREATE TABLE IF NOT EXISTS `venues` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `project_id` INT NOT NULL,
    `code` VARCHAR(50) NOT NULL,
    `name` VARCHAR(200) NOT NULL,
    `description` TEXT,
    `status` ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_project_id` (`project_id`),
    INDEX `idx_code` (`code`),
    INDEX `idx_status` (`status`),
    UNIQUE KEY `uk_project_code` (`project_id`, `code`),
    FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 楼层表
CREATE TABLE IF NOT EXISTS `floors` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `venue_id` INT NOT NULL,
    `code` VARCHAR(50) NOT NULL,
    `name` VARCHAR(200) NOT NULL,
    `description` TEXT,
    `status` ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_venue_id` (`venue_id`),
    INDEX `idx_code` (`code`),
    INDEX `idx_status` (`status`),
    UNIQUE KEY `uk_venue_code` (`venue_id`, `code`),
    FOREIGN KEY (`venue_id`) REFERENCES `venues`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 权限表
CREATE TABLE IF NOT EXISTS `permissions` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `code` VARCHAR(100) UNIQUE NOT NULL,
    `name` VARCHAR(200) NOT NULL,
    `description` TEXT,
    `resource_type` ENUM('project', 'venue', 'floor') NOT NULL,
    `resource_id` INT NOT NULL,
    `actions` JSON NOT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_code` (`code`),
    INDEX `idx_resource` (`resource_type`, `resource_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 商户权限关联表
CREATE TABLE IF NOT EXISTS `merchant_permissions` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `merchant_id` INT NOT NULL,
    `permission_code` VARCHAR(100) NOT NULL,
    `granted_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `granted_by` INT,
    INDEX `idx_merchant_id` (`merchant_id`),
    INDEX `idx_permission_code` (`permission_code`),
    INDEX `idx_granted_by` (`granted_by`),
    UNIQUE KEY `uk_merchant_permission` (`merchant_id`, `permission_code`),
    FOREIGN KEY (`merchant_id`) REFERENCES `merchants`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`permission_code`) REFERENCES `permissions`(`code`) ON DELETE CASCADE,
    FOREIGN KEY (`granted_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 角色表
CREATE TABLE IF NOT EXISTS `roles` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `merchant_id` INT,
    `name` VARCHAR(100) NOT NULL,
    `description` TEXT,
    `permissions` JSON,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_merchant_id` (`merchant_id`),
    INDEX `idx_name` (`name`),
    FOREIGN KEY (`merchant_id`) REFERENCES `merchants`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 用户角色关联表
CREATE TABLE IF NOT EXISTS `user_roles` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT NOT NULL,
    `role_id` INT NOT NULL,
    `assigned_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `assigned_by` INT,
    INDEX `idx_user_id` (`user_id`),
    INDEX `idx_role_id` (`role_id`),
    INDEX `idx_assigned_by` (`assigned_by`),
    UNIQUE KEY `uk_user_role` (`user_id`, `role_id`),
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`assigned_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 访客申请表
CREATE TABLE IF NOT EXISTS `visitor_applications` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `applicant_id` INT NOT NULL,
    `merchant_id` INT NOT NULL,
    `visitee_id` INT,
    `visitor_name` VARCHAR(100) NOT NULL,
    `visitor_phone` VARCHAR(20) NOT NULL,
    `visitor_company` VARCHAR(200),
    `visit_purpose` TEXT NOT NULL,
    `visit_type` ENUM('business', 'personal', 'interview', 'meeting'),
    `scheduled_time` TIMESTAMP NOT NULL,
    `duration` INT NOT NULL DEFAULT 4,
    `status` ENUM('pending', 'approved', 'rejected', 'expired', 'completed') NOT NULL DEFAULT 'pending',
    `approved_by` INT,
    `approved_at` TIMESTAMP NULL,
    `rejection_reason` TEXT,
    `passcode` VARCHAR(20),
    `passcode_expiry` TIMESTAMP NULL,
    `usage_limit` INT DEFAULT 10,
    `usage_count` INT DEFAULT 0,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_applicant_id` (`applicant_id`),
    INDEX `idx_merchant_id` (`merchant_id`),
    INDEX `idx_visitee_id` (`visitee_id`),
    INDEX `idx_status` (`status`),
    INDEX `idx_scheduled_time` (`scheduled_time`),
    INDEX `idx_passcode` (`passcode`),
    FOREIGN KEY (`applicant_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`merchant_id`) REFERENCES `merchants`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`visitee_id`) REFERENCES `users`(`id`) ON DELETE SET NULL,
    FOREIGN KEY (`approved_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 通行码表
CREATE TABLE IF NOT EXISTS `passcodes` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT NOT NULL,
    `code` VARCHAR(50) UNIQUE NOT NULL,
    `type` ENUM('employee', 'visitor') NOT NULL,
    `status` ENUM('active', 'expired', 'revoked') NOT NULL DEFAULT 'active',
    `expiry_time` TIMESTAMP NULL,
    `usage_limit` INT,
    `usage_count` INT DEFAULT 0,
    `permissions` JSON,
    `application_id` INT,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_user_id` (`user_id`),
    INDEX `idx_code` (`code`),
    INDEX `idx_type` (`type`),
    INDEX `idx_status` (`status`),
    INDEX `idx_expiry_time` (`expiry_time`),
    INDEX `idx_application_id` (`application_id`),
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`application_id`) REFERENCES `visitor_applications`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 通行记录表
CREATE TABLE IF NOT EXISTS `access_records` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT NOT NULL,
    `passcode_id` INT,
    `device_id` VARCHAR(100) NOT NULL,
    `device_type` VARCHAR(50),
    `direction` ENUM('in', 'out') NOT NULL,
    `result` ENUM('success', 'failed') NOT NULL,
    `fail_reason` VARCHAR(200),
    `project_id` INT,
    `venue_id` INT,
    `floor_id` INT,
    `timestamp` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_user_id` (`user_id`),
    INDEX `idx_passcode_id` (`passcode_id`),
    INDEX `idx_device_id` (`device_id`),
    INDEX `idx_direction` (`direction`),
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 文件表
CREATE TABLE IF NOT EXISTS `files` (
    `id` VARCHAR(36) PRIMARY KEY,
    `original_name` VARCHAR(255) NOT NULL,
    `file_name` VARCHAR(255) NOT NULL,
    `mime_type` VARCHAR(100) NOT NULL,
    `size` BIGINT NOT NULL,
    `user_id` INT NOT NULL,
    `category` VARCHAR(50),
    `description` TEXT,
    `is_public` BOOLEAN NOT NULL DEFAULT FALSE,
    `file_path` VARCHAR(500) NOT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
    
    INDEX `idx_files_user_id` (`user_id`),
    INDEX `idx_files_mime_type` (`mime_type`),
    INDEX `idx_files_category` (`category`),
    INDEX `idx_files_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;