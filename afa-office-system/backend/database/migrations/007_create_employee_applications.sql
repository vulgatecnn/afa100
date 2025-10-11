-- 创建员工申请表
CREATE TABLE IF NOT EXISTS employee_applications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  applicant_id INTEGER NOT NULL,
  merchant_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  department TEXT,
  position TEXT,
  id_card TEXT,
  emergency_contact TEXT,
  emergency_phone TEXT,
  status TEXT CHECK(status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
  approved_by INTEGER,
  approved_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (applicant_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (merchant_id) REFERENCES merchants(id) ON DELETE CASCADE,
  FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_employee_applications_applicant_id ON employee_applications(applicant_id);
CREATE INDEX IF NOT EXISTS idx_employee_applications_merchant_id ON employee_applications(merchant_id);
CREATE INDEX IF NOT EXISTS idx_employee_applications_status ON employee_applications(status);
CREATE INDEX IF NOT EXISTS idx_employee_applications_created_at ON employee_applications(created_at);

-- 创建唯一约束，防止同一用户向同一商户重复申请
CREATE UNIQUE INDEX IF NOT EXISTS idx_employee_applications_unique_pending 
ON employee_applications(applicant_id, merchant_id) 
WHERE status IN ('pending', 'approved');