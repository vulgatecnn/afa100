-- AFA办公小程序数据库和用户创建脚本
-- 使用root用户执行此脚本

-- 创建应用数据库
CREATE DATABASE IF NOT EXISTS `afa_office` 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

-- 创建测试数据库
CREATE DATABASE IF NOT EXISTS `afa_office_test` 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

-- 创建应用用户
CREATE USER IF NOT EXISTS 'afa_app_user'@'localhost' IDENTIFIED BY 'afa_app_2024';
CREATE USER IF NOT EXISTS 'afa_app_user'@'%' IDENTIFIED BY 'afa_app_2024';

-- 创建测试用户
CREATE USER IF NOT EXISTS 'afa_test_user'@'localhost' IDENTIFIED BY 'afa_test_2024';
CREATE USER IF NOT EXISTS 'afa_test_user'@'%' IDENTIFIED BY 'afa_test_2024';

-- 授予应用用户对应用数据库的完整权限
GRANT ALL PRIVILEGES ON `afa_office`.* TO 'afa_app_user'@'localhost';
GRANT ALL PRIVILEGES ON `afa_office`.* TO 'afa_app_user'@'%';

-- 授予测试用户对测试数据库的完整权限
GRANT ALL PRIVILEGES ON `afa_office_test`.* TO 'afa_test_user'@'localhost';
GRANT ALL PRIVILEGES ON `afa_office_test`.* TO 'afa_test_user'@'%';

-- 刷新权限
FLUSH PRIVILEGES;

-- 显示创建的数据库
SHOW DATABASES LIKE 'afa_office%';

-- 显示创建的用户
SELECT User, Host FROM mysql.user WHERE User LIKE 'afa_%';