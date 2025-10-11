-- AFA办公小程序数据库结构
-- 创建时间: 2024-01-01
-- 版本: 1.0.0

-- 启用外键约束
PRAGMA foreign_keys = ON;

-- 用户表
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    open_id TEXT UNIQUE,                    -- 微信openId
    union_id TEXT,                          -- 微信unionId
    phone TEXT,                             -- 手机号
    name TEXT NOT NULL,                     -- 姓名
    avatar TEXT,                            -- 头像URL
    user_type TEXT NOT NULL CHECK(user_type IN ('tenant_admin', 'merchant_admin', 'employee', 'visitor')),
    status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'inactive', 'pending')),
    merchant_id INTEGER,                    -- 所属商户ID
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (merchant_id) REFERENCES merchants(id) ON DELETE SET NULL
);

-- 商户表
CREATE TABLE IF NOT EXISTS merchants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,                     -- 商户名称
    code TEXT UNIQUE NOT NULL,              -- 商户编码
    contact TEXT,                           -- 联系人
    phone TEXT,                             -- 联系电话
    email TEXT,                             -- 邮箱
    address TEXT,                           -- 地址
    status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
    settings TEXT,                          -- JSON格式的设置信息
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 项目表
CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE NOT NULL,              -- 项目编码
    name TEXT NOT NULL,                     -- 项目名称
    description TEXT,                       -- 项目描述
    status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 场地表
CREATE TABLE IF NOT EXISTS venues (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,           -- 所属项目ID
    code TEXT NOT NULL,                     -- 场地编码
    name TEXT NOT NULL,                     -- 场地名称
    description TEXT,                       -- 场地描述
    status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    UNIQUE(project_id, code)
);

-- 楼层表
CREATE TABLE IF NOT EXISTS floors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    venue_id INTEGER NOT NULL,             -- 所属场地ID
    code TEXT NOT NULL,                     -- 楼层编码
    name TEXT NOT NULL,                     -- 楼层名称
    description TEXT,                       -- 楼层描述
    status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (venue_id) REFERENCES venues(id) ON DELETE CASCADE,
    UNIQUE(venue_id, code)
);

-- 权限表
CREATE TABLE IF NOT EXISTS permissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE NOT NULL,              -- 权限代码
    name TEXT NOT NULL,                     -- 权限名称
    description TEXT,                       -- 权限描述
    resource_type TEXT NOT NULL CHECK(resource_type IN ('project', 'venue', 'floor')),
    resource_id INTEGER NOT NULL,           -- 资源ID
    actions TEXT NOT NULL,                  -- JSON格式的操作列表
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 商户权限关联表
CREATE TABLE IF NOT EXISTS merchant_permissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    merchant_id INTEGER NOT NULL,          -- 商户ID
    permission_code TEXT NOT NULL,          -- 权限代码
    granted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    granted_by INTEGER,                     -- 授权人ID
    FOREIGN KEY (merchant_id) REFERENCES merchants(id) ON DELETE CASCADE,
    FOREIGN KEY (permission_code) REFERENCES permissions(code) ON DELETE CASCADE,
    FOREIGN KEY (granted_by) REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE(merchant_id, permission_code)
);

-- 角色表
CREATE TABLE IF NOT EXISTS roles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    merchant_id INTEGER,                    -- 所属商户ID (NULL表示系统角色)
    name TEXT NOT NULL,                     -- 角色名称
    description TEXT,                       -- 角色描述
    permissions TEXT,                       -- JSON格式的权限代码列表
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (merchant_id) REFERENCES merchants(id) ON DELETE CASCADE
);

-- 用户角色关联表
CREATE TABLE IF NOT EXISTS user_roles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,              -- 用户ID
    role_id INTEGER NOT NULL,              -- 角色ID
    assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    assigned_by INTEGER,                    -- 分配人ID
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE(user_id, role_id)
);

-- 访客申请表
CREATE TABLE IF NOT EXISTS visitor_applications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    applicant_id INTEGER NOT NULL,         -- 申请人ID
    merchant_id INTEGER NOT NULL,          -- 被访商户ID
    visitee_id INTEGER,                     -- 被访人ID
    visitor_name TEXT NOT NULL,            -- 访客姓名
    visitor_phone TEXT NOT NULL,           -- 访客电话
    visitor_company TEXT,                  -- 访客公司
    visit_purpose TEXT NOT NULL,           -- 访问目的
    visit_type TEXT,                       -- 访问类型
    scheduled_time DATETIME NOT NULL,      -- 预约时间
    duration INTEGER NOT NULL DEFAULT 4,   -- 访问时长(小时)
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected', 'expired', 'completed')),
    approved_by INTEGER,                    -- 审批人ID
    approved_at DATETIME,                  -- 审批时间
    rejection_reason TEXT,                 -- 拒绝原因
    passcode TEXT,                         -- 生成的通行码
    passcode_expiry DATETIME,              -- 通行码过期时间
    usage_limit INTEGER DEFAULT 10,        -- 使用次数限制
    usage_count INTEGER DEFAULT 0,         -- 已使用次数
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (applicant_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (merchant_id) REFERENCES merchants(id) ON DELETE CASCADE,
    FOREIGN KEY (visitee_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL
);

-- 通行码表
CREATE TABLE IF NOT EXISTS passcodes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,              -- 用户ID
    code TEXT UNIQUE NOT NULL,             -- 通行码内容
    type TEXT NOT NULL CHECK(type IN ('employee', 'visitor')),
    status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'expired', 'revoked')),
    expiry_time DATETIME,                  -- 过期时间
    usage_limit INTEGER,                   -- 使用次数限制
    usage_count INTEGER DEFAULT 0,         -- 已使用次数
    permissions TEXT,                      -- JSON格式的权限代码列表
    application_id INTEGER,               -- 关联的访客申请ID
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (application_id) REFERENCES visitor_applications(id) ON DELETE SET NULL
);

-- 通行记录表
CREATE TABLE IF NOT EXISTS access_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,              -- 用户ID
    passcode_id INTEGER,                   -- 通行码ID
    device_id TEXT NOT NULL,               -- 设备ID
    device_type TEXT,                      -- 设备类型
    direction TEXT NOT NULL CHECK(direction IN ('in', 'out')),
    result TEXT NOT NULL CHECK(result IN ('success', 'failed')),
    fail_reason TEXT,                      -- 失败原因
    project_id INTEGER,                    -- 项目ID
    venue_id INTEGER,                      -- 场地ID
    floor_id INTEGER,                      -- 楼层ID
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (passcode_id) REFERENCES passcodes(id) ON DELETE SET NULL,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL,
    FOREIGN KEY (venue_id) REFERENCES venues(id) ON DELETE SET NULL,
    FOREIGN KEY (floor_id) REFERENCES floors(id) ON DELETE SET NULL
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_users_open_id ON users(open_id);
CREATE INDEX IF NOT EXISTS idx_users_merchant_id ON users(merchant_id);
CREATE INDEX IF NOT EXISTS idx_users_user_type ON users(user_type);
CREATE INDEX IF NOT EXISTS idx_merchants_code ON merchants(code);
CREATE INDEX IF NOT EXISTS idx_merchants_status ON merchants(status);
CREATE INDEX IF NOT EXISTS idx_venues_project_id ON venues(project_id);
CREATE INDEX IF NOT EXISTS idx_floors_venue_id ON floors(venue_id);
CREATE INDEX IF NOT EXISTS idx_permissions_code ON permissions(code);
CREATE INDEX IF NOT EXISTS idx_permissions_resource ON permissions(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_merchant_permissions_merchant_id ON merchant_permissions(merchant_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_visitor_applications_merchant_id ON visitor_applications(merchant_id);
CREATE INDEX IF NOT EXISTS idx_visitor_applications_status ON visitor_applications(status);
CREATE INDEX IF NOT EXISTS idx_visitor_applications_scheduled_time ON visitor_applications(scheduled_time);
CREATE INDEX IF NOT EXISTS idx_passcodes_user_id ON passcodes(user_id);
CREATE INDEX IF NOT EXISTS idx_passcodes_code ON passcodes(code);
CREATE INDEX IF NOT EXISTS idx_passcodes_status ON passcodes(status);
CREATE INDEX IF NOT EXISTS idx_access_records_user_id ON access_records(user_id);
CREATE INDEX IF NOT EXISTS idx_access_records_device_id ON access_records(device_id);
CREATE INDEX IF NOT EXISTS idx_access_records_timestamp ON access_records(timestamp);