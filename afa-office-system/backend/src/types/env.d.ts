/**
 * 环境变量类型声明文件
 * 为 process.env 提供完整的类型定义
 */

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      // 服务器配置
      PORT?: string;
      NODE_ENV?: 'development' | 'production' | 'test';
      
      // 数据库类型配置
      DB_TYPE?: 'mysql' | 'sqlite';
      
      // MySQL应用数据库配置（生产环境主数据库）
      APP_DB_TYPE?: 'mysql';
      APP_DB_HOST?: string;
      APP_DB_PORT?: string;
      APP_DB_USER?: string;
      APP_DB_PASSWORD?: string;
      APP_DB_NAME?: string;
      APP_DB_CONNECTION_LIMIT?: string;
      APP_DB_ACQUIRE_TIMEOUT?: string;
      APP_DB_TIMEOUT?: string;
      
      // MySQL测试数据库配置（测试环境）
      TEST_DB_TYPE?: 'mysql';
      TEST_DB_HOST?: string;
      TEST_DB_PORT?: string;
      TEST_DB_USER?: string;
      TEST_DB_PASSWORD?: string;
      TEST_DB_NAME?: string;
      TEST_DB_CONNECTION_LIMIT?: string;
      TEST_DB_ACQUIRE_TIMEOUT?: string;
      TEST_DB_TIMEOUT?: string;
      
      // MySQL管理员配置（仅用于初始化和管理）
      MYSQL_ADMIN_HOST?: string;
      MYSQL_ADMIN_PORT?: string;
      MYSQL_ADMIN_USER?: string;
      MYSQL_ADMIN_PASSWORD?: string;
      
      // SQLite数据库配置（向后兼容）
      DB_PATH?: string;
      DB_TEST_PATH?: string;
      
      // JWT配置
      JWT_SECRET?: string;
      JWT_EXPIRES_IN?: string;
      JWT_REFRESH_EXPIRES_IN?: string;
      
      // 微信小程序配置
      WECHAT_APP_ID?: string;
      WECHAT_APP_SECRET?: string;
      
      // 日志配置
      LOG_LEVEL?: 'error' | 'warn' | 'info' | 'debug' | 'verbose';
      LOG_FILE?: string;
      
      // CORS配置
      CORS_ORIGIN?: string;
      
      // 通行码配置
      PASSCODE_DEFAULT_DURATION?: string;
      PASSCODE_DEFAULT_USAGE_LIMIT?: string;
      PASSCODE_REFRESH_INTERVAL?: string;
      
      // 文件上传配置
      UPLOAD_MAX_FILE_SIZE?: string;
      UPLOAD_DIR?: string;
      
      // 安全配置
      BCRYPT_ROUNDS?: string;
      MAX_LOGIN_ATTEMPTS?: string;
      LOCKOUT_DURATION?: string;
      SESSION_TIMEOUT?: string;
      
      // 速率限制配置
      RATE_LIMIT_WINDOW_MS?: string;
      RATE_LIMIT_MAX?: string;
      
      // 通知配置
      ENABLE_SMS?: string;
      ENABLE_EMAIL?: string;
      ENABLE_PUSH?: string;
      
      // 监控配置
      ENABLE_HEALTH_CHECK?: string;
      ENABLE_METRICS?: string;
      METRICS_INTERVAL?: string;
      
      // 缓存配置
      CACHE_TTL?: string;
      CACHE_MAX_SIZE?: string;
      
      // 分页配置
      DEFAULT_PAGE_LIMIT?: string;
      MAX_PAGE_LIMIT?: string;
      
      // 测试环境标识
      VITEST?: string;
      
      // 其他常用环境变量
      TZ?: string;
      HOME?: string;
      USER?: string;
      PATH?: string;
      
      // 部署相关
      DOCKER?: string;
      KUBERNETES?: string;
      DEPLOYMENT_ENV?: string;
      
      // 第三方服务配置
      REDIS_URL?: string;
      REDIS_HOST?: string;
      REDIS_PORT?: string;
      REDIS_PASSWORD?: string;
      
      // 邮件服务配置
      SMTP_HOST?: string;
      SMTP_PORT?: string;
      SMTP_USER?: string;
      SMTP_PASSWORD?: string;
      SMTP_FROM?: string;
      
      // 短信服务配置
      SMS_PROVIDER?: string;
      SMS_API_KEY?: string;
      SMS_API_SECRET?: string;
      
      // 对象存储配置
      OSS_PROVIDER?: string;
      OSS_ACCESS_KEY?: string;
      OSS_SECRET_KEY?: string;
      OSS_BUCKET?: string;
      OSS_REGION?: string;
      OSS_ENDPOINT?: string;
      
      // 监控和日志服务
      SENTRY_DSN?: string;
      ELASTIC_APM_SERVER_URL?: string;
      ELASTIC_APM_SECRET_TOKEN?: string;
      
      // API版本控制
      API_VERSION?: string;
      API_PREFIX?: string;
      
      // 设备集成配置
      DEVICE_API_ENDPOINT?: string;
      DEVICE_API_KEY?: string;
      DEVICE_WEBHOOK_SECRET?: string;
      
      // 人脸识别服务配置
      FACE_RECOGNITION_API_URL?: string;
      FACE_RECOGNITION_API_KEY?: string;
      
      // 二维码服务配置
      QR_CODE_SERVICE_URL?: string;
      QR_CODE_EXPIRY_MINUTES?: string;
      
      // 健康码验证服务
      HEALTH_CODE_API_URL?: string;
      HEALTH_CODE_API_KEY?: string;
      
      // 体温检测配置
      TEMPERATURE_THRESHOLD?: string;
      TEMPERATURE_CHECK_ENABLED?: string;
      
      // 访客管理配置
      VISITOR_AUTO_APPROVAL?: string;
      VISITOR_MAX_DURATION?: string;
      VISITOR_ADVANCE_BOOKING_DAYS?: string;
      
      // 员工管理配置
      EMPLOYEE_PROBATION_DAYS?: string;
      EMPLOYEE_MAX_DEVICES?: string;
      
      // 商户管理配置
      MERCHANT_MAX_EMPLOYEES?: string;
      MERCHANT_MAX_VISITORS?: string;
      MERCHANT_TRIAL_DAYS?: string;
      
      // 权限管理配置
      PERMISSION_CACHE_TTL?: string;
      ROLE_HIERARCHY_ENABLED?: string;
      
      // 审计日志配置
      AUDIT_LOG_ENABLED?: string;
      AUDIT_LOG_RETENTION_DAYS?: string;
      
      // 性能监控配置
      PERFORMANCE_MONITORING?: string;
      SLOW_QUERY_THRESHOLD?: string;
      
      // 备份配置
      BACKUP_ENABLED?: string;
      BACKUP_SCHEDULE?: string;
      BACKUP_RETENTION_DAYS?: string;
      
      // 集群配置
      CLUSTER_MODE?: string;
      CLUSTER_NODES?: string;
      
      // 负载均衡配置
      LOAD_BALANCER_ENABLED?: string;
      LOAD_BALANCER_STRATEGY?: string;
      
      // 容器化配置
      CONTAINER_NAME?: string;
      CONTAINER_VERSION?: string;
      
      // CI/CD配置
      CI?: string;
      BUILD_NUMBER?: string;
      GIT_COMMIT?: string;
      GIT_BRANCH?: string;
      
      // 调试配置
      DEBUG?: string;
      VERBOSE?: string;
      TRACE?: string;
    }
  }
}

export {};