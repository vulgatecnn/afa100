// 配置文件统一导出
// 导出所有配置相关的模块和类型

// 应用配置
export { appConfig } from './app.config.js';

// 环境变量配置
export { 
  EnvironmentLoader,
  getEnvironmentConfig,
  loadEnvironmentConfig,
  type EnvironmentConfig,
  type DatabaseConnectionConfig,
  type DatabaseAdminConfig
} from './env-loader.js';

// 数据库配置
export { 
  dbConfig,
  getCurrentDbConfig,
  getPoolConfig,
  getPerformanceConfig,
  validateDatabaseConfig
} from './database.config.js';

// 数据库配置管理器
export { DatabaseConfigManager } from './database-config-manager.js';
export { MySQLConfigManager } from './mysql-config-manager.js';

// 导出配置相关的类型
export type {
  EnvConfig
} from '../types/index.js';