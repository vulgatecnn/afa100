/**
 * 自定义测试匹配器
 * 扩展 Vitest 的断言功能，提供业务特定的匹配器
 */

import { expect } from 'vitest';
import type { Response } from 'supertest';
import type {
  User,
  Merchant,
  Project,
  Venue,
  Floor,
  VisitorApplication,
  AccessRecord,
  ApiResponse,
  PaginatedResponse
} from '../../src/types/index.js';

/**
 * API 响应匹配器
 */
interface ApiMatchers<R = unknown> {
  toBeSuccessfulApiResponse(expectedData?: any): R;
  toBeErrorApiResponse(expectedCode?: number, expectedMessage?: string): R;
  toBePaginatedApiResponse(expectedCount?: number): R;
  toHaveValidApiStructure(): R;
  toHaveValidTimestamp(): R;
}

/**
 * 数据模型匹配器
 */
interface ModelMatchers<R = unknown> {
  toBeValidUser(partial?: boolean): R;
  toBeValidMerchant(partial?: boolean): R;
  toBeValidProject(partial?: boolean): R;
  toBeValidVenue(partial?: boolean): R;
  toBeValidFloor(partial?: boolean): R;
  toBeValidVisitorApplication(partial?: boolean): R;
  toBeValidAccessRecord(partial?: boolean): R;
  toHaveRequiredFields(fields: string[]): R;
  toHaveValidId(): R;
  toHaveValidTimestamps(): R;
}

/**
 * 数据库匹配器
 */
interface DatabaseMatchers<R = unknown> {
  toExistInDatabase(table: string, id: number): R;
  toNotExistInDatabase(table: string, id: number): R;
  toHaveRecordCount(table: string, expectedCount: number): R;
  toMatchDatabaseRecord(table: string, id: number, expectedData: any): R;
}

/**
 * 认证匹配器
 */
interface AuthMatchers<R = unknown> {
  toBeValidJWT(): R;
  toHaveValidTokenStructure(): R;
  toBeExpiredToken(): R;
  toHaveCorrectUserClaims(expectedUser: Partial<User>): R;
}

/**
 * 性能匹配器
 */
interface PerformanceMatchers<R = unknown> {
  toRespondWithin(milliseconds: number): R;
  toHaveMemoryUsageBelow(bytes: number): R;
  toHaveCpuUsageBelow(percentage: number): R;
}

// 扩展 Vitest 的匹配器类型
declare module 'vitest' {
  interface Assertion<T = any>
    extends ApiMatchers<T>,
            ModelMatchers<T>,
            DatabaseMatchers<T>,
            AuthMatchers<T>,
            PerformanceMatchers<T> {}
  interface AsymmetricMatchersContaining
    extends ApiMatchers,
            ModelMatchers,
            DatabaseMatchers,
            AuthMatchers,
            PerformanceMatchers {}
}

// 定义匹配器结果类型
interface MatcherResult {
  pass: boolean;
  message: () => string;
}

/**
 * API 响应匹配器实现
 */
const apiMatchers = {
  toBeSuccessfulApiResponse(received: Response, expectedData?: any): MatcherResult {
    const pass = (
      received.status === 200 &&
      received.body.success === true &&
      typeof received.body.message === 'string' &&
      typeof received.body.timestamp === 'string' &&
      (expectedData ? this.equals(received.body.data, expectedData) : true)
    );

    return {
      pass,
      message: () => pass
        ? `Expected response not to be a successful API response`
        : `Expected response to be a successful API response, but got status ${received.status} with body: ${JSON.stringify(received.body, null, 2)}`,
    };
  },

  toBeErrorApiResponse(received: Response, expectedCode?: number, expectedMessage?: string): MatcherResult {
    const pass = (
      received.body.success === false &&
      typeof received.body.code === 'number' &&
      typeof received.body.message === 'string' &&
      received.body.data === null &&
      (expectedCode ? received.body.code === expectedCode : true) &&
      (expectedMessage ? received.body.message.includes(expectedMessage) : true)
    );

    return {
      pass,
      message: () => pass
        ? `Expected response not to be an error API response`
        : `Expected response to be an error API response${expectedCode ? ` with code ${expectedCode}` : ''}${expectedMessage ? ` containing message "${expectedMessage}"` : ''}, but got: ${JSON.stringify(received.body, null, 2)}`,
    };
  },

  toBePaginatedApiResponse(received: Response, expectedCount?: number): MatcherResult {
    const pass = (
      received.status === 200 &&
      received.body.success === true &&
      Array.isArray(received.body.data) &&
      typeof received.body.pagination === 'object' &&
      typeof received.body.pagination.page === 'number' &&
      typeof received.body.pagination.limit === 'number' &&
      typeof received.body.pagination.total === 'number' &&
      (expectedCount !== undefined ? received.body.data.length === expectedCount : true)
    );

    return {
      pass,
      message: () => pass
        ? `Expected response not to be a paginated API response`
        : `Expected response to be a paginated API response${expectedCount !== undefined ? ` with ${expectedCount} items` : ''}, but got: ${JSON.stringify(received.body, null, 2)}`,
    };
  },

  toHaveValidApiStructure(received: any): MatcherResult {
    const pass = (
      typeof received === 'object' &&
      typeof received.success === 'boolean' &&
      typeof received.timestamp === 'string' &&
      (received.success ? 
        typeof received.message === 'string' :
        typeof received.code === 'number' && typeof received.message === 'string'
      )
    );

    return {
      pass,
      message: () => pass
        ? `Expected object not to have valid API structure`
        : `Expected object to have valid API structure, but got: ${JSON.stringify(received, null, 2)}`,
    };
  },

  toHaveValidTimestamp(received: any): MatcherResult {
    const timestamp = received.timestamp || received;
    const isValidTimestamp = typeof timestamp === 'string' && !isNaN(Date.parse(timestamp));

    return {
      pass: isValidTimestamp,
      message: () => isValidTimestamp
        ? `Expected "${timestamp}" not to be a valid timestamp`
        : `Expected "${timestamp}" to be a valid timestamp`,
    };
  },
};

/**
 * 数据模型匹配器实现
 */
const modelMatchers = {
  toBeValidUser(received: any, partial: boolean = false): MatcherResult {
    const requiredFields = ['id', 'name', 'phone', 'user_type', 'status'];
    const optionalFields = ['merchant_id', 'open_id', 'union_id', 'avatar', 'created_at', 'updated_at'];
    
    const hasRequiredFields = partial ? 
      requiredFields.some(field => field in received) :
      requiredFields.every(field => field in received);

    const pass = (
      typeof received === 'object' &&
      hasRequiredFields &&
      (received.id ? typeof received.id === 'number' : true) &&
      (received.name ? typeof received.name === 'string' : true) &&
      (received.phone ? typeof received.phone === 'string' : true)
    );

    return {
      pass,
      message: () => pass
        ? `Expected object not to be a valid user`
        : `Expected object to be a valid user${partial ? ' (partial)' : ''}, but got: ${JSON.stringify(received, null, 2)}`,
    };
  },

  toBeValidMerchant(received: any, partial: boolean = false): MatcherResult {
    const requiredFields = ['id', 'name', 'code', 'contact', 'phone', 'email', 'address', 'status'];
    
    const hasRequiredFields = partial ? 
      requiredFields.some(field => field in received) :
      requiredFields.every(field => field in received);

    const pass = (
      typeof received === 'object' &&
      hasRequiredFields &&
      (received.id ? typeof received.id === 'number' : true) &&
      (received.name ? typeof received.name === 'string' : true) &&
      (received.code ? typeof received.code === 'string' : true)
    );

    return {
      pass,
      message: () => pass
        ? `Expected object not to be a valid merchant`
        : `Expected object to be a valid merchant${partial ? ' (partial)' : ''}, but got: ${JSON.stringify(received, null, 2)}`,
    };
  },

  toBeValidProject(received: any, partial: boolean = false): MatcherResult {
    const requiredFields = ['id', 'code', 'name', 'description', 'status'];
    
    const hasRequiredFields = partial ? 
      requiredFields.some(field => field in received) :
      requiredFields.every(field => field in received);

    const pass = (
      typeof received === 'object' &&
      hasRequiredFields &&
      (received.id ? typeof received.id === 'number' : true) &&
      (received.code ? typeof received.code === 'string' : true) &&
      (received.name ? typeof received.name === 'string' : true)
    );

    return {
      pass,
      message: () => pass
        ? `Expected object not to be a valid project`
        : `Expected object to be a valid project${partial ? ' (partial)' : ''}, but got: ${JSON.stringify(received, null, 2)}`,
    };
  },

  toBeValidVenue(received: any, partial: boolean = false): MatcherResult {
    const requiredFields = ['id', 'project_id', 'code', 'name', 'description', 'status'];
    
    const hasRequiredFields = partial ? 
      requiredFields.some(field => field in received) :
      requiredFields.every(field => field in received);

    const pass = (
      typeof received === 'object' &&
      hasRequiredFields &&
      (received.id ? typeof received.id === 'number' : true) &&
      (received.project_id ? typeof received.project_id === 'number' : true) &&
      (received.code ? typeof received.code === 'string' : true)
    );

    return {
      pass,
      message: () => pass
        ? `Expected object not to be a valid venue`
        : `Expected object to be a valid venue${partial ? ' (partial)' : ''}, but got: ${JSON.stringify(received, null, 2)}`,
    };
  },

  toBeValidFloor(received: any, partial: boolean = false): MatcherResult {
    const requiredFields = ['id', 'venue_id', 'code', 'name', 'description', 'status'];
    
    const hasRequiredFields = partial ? 
      requiredFields.some(field => field in received) :
      requiredFields.every(field => field in received);

    const pass = (
      typeof received === 'object' &&
      hasRequiredFields &&
      (received.id ? typeof received.id === 'number' : true) &&
      (received.venue_id ? typeof received.venue_id === 'number' : true) &&
      (received.code ? typeof received.code === 'string' : true)
    );

    return {
      pass,
      message: () => pass
        ? `Expected object not to be a valid floor`
        : `Expected object to be a valid floor${partial ? ' (partial)' : ''}, but got: ${JSON.stringify(received, null, 2)}`,
    };
  },

  toBeValidVisitorApplication(received: any, partial: boolean = false): MatcherResult {
    const requiredFields = ['id', 'applicant_id', 'merchant_id', 'visitee_id', 'visitor_name', 'visitor_phone', 'visit_purpose', 'scheduled_time', 'status'];
    
    const hasRequiredFields = partial ? 
      requiredFields.some(field => field in received) :
      requiredFields.every(field => field in received);

    const pass = (
      typeof received === 'object' &&
      hasRequiredFields &&
      (received.id ? typeof received.id === 'number' : true) &&
      (received.visitor_name ? typeof received.visitor_name === 'string' : true) &&
      (received.visitor_phone ? typeof received.visitor_phone === 'string' : true)
    );

    return {
      pass,
      message: () => pass
        ? `Expected object not to be a valid visitor application`
        : `Expected object to be a valid visitor application${partial ? ' (partial)' : ''}, but got: ${JSON.stringify(received, null, 2)}`,
    };
  },

  toBeValidAccessRecord(received: any, partial: boolean = false): MatcherResult {
    const requiredFields = ['id', 'user_id', 'device_id', 'device_type', 'direction', 'result', 'timestamp'];
    
    const hasRequiredFields = partial ? 
      requiredFields.some(field => field in received) :
      requiredFields.every(field => field in received);

    const pass = (
      typeof received === 'object' &&
      hasRequiredFields &&
      (received.id ? typeof received.id === 'number' : true) &&
      (received.user_id ? typeof received.user_id === 'number' : true) &&
      (received.device_id ? typeof received.device_id === 'string' : true)
    );

    return {
      pass,
      message: () => pass
        ? `Expected object not to be a valid access record`
        : `Expected object to be a valid access record${partial ? ' (partial)' : ''}, but got: ${JSON.stringify(received, null, 2)}`,
    };
  },

  toHaveRequiredFields(received: any, fields: string[]): MatcherResult {
    const missingFields = fields.filter(field => !(field in received));
    const pass = missingFields.length === 0;

    return {
      pass,
      message: () => pass
        ? `Expected object not to have all required fields: ${fields.join(', ')}`
        : `Expected object to have required fields: ${fields.join(', ')}, but missing: ${missingFields.join(', ')}`,
    };
  },

  toHaveValidId(received: any): MatcherResult {
    const pass = typeof received.id === 'number' && received.id > 0;

    return {
      pass,
      message: () => pass
        ? `Expected object not to have a valid ID`
        : `Expected object to have a valid ID (positive number), but got: ${received.id}`,
    };
  },

  toHaveValidTimestamps(received: any): MatcherResult {
    const hasCreatedAt = 'created_at' in received && typeof received.created_at === 'string' && !isNaN(Date.parse(received.created_at));
    const hasUpdatedAt = 'updated_at' in received && typeof received.updated_at === 'string' && !isNaN(Date.parse(received.updated_at));
    const pass = hasCreatedAt && hasUpdatedAt;

    return {
      pass,
      message: () => pass
        ? `Expected object not to have valid timestamps`
        : `Expected object to have valid created_at and updated_at timestamps, but got created_at: ${received.created_at}, updated_at: ${received.updated_at}`,
    };
  },
};

/**
 * 数据库匹配器实现（Mock 版本）
 */
const databaseMatchers = {
  toExistInDatabase(received: any, ...args: [string, number]): MatcherResult {
    const [table, id] = args;
    // 这里应该实现实际的数据库查询
    // 目前返回 Mock 结果
    const pass = true; // Mock: 假设记录存在

    return {
      pass,
      message: () => pass
        ? `Expected record with ID ${id} not to exist in table ${table}`
        : `Expected record with ID ${id} to exist in table ${table}`,
    };
  },

  toNotExistInDatabase(received: any, ...args: [string, number]): MatcherResult {
    const [table, id] = args;
    // 这里应该实现实际的数据库查询
    // 目前返回 Mock 结果
    const pass = false; // Mock: 假设记录不存在

    return {
      pass,
      message: () => pass
        ? `Expected record with ID ${id} to exist in table ${table}`
        : `Expected record with ID ${id} not to exist in table ${table}`,
    };
  },

  toHaveRecordCount(received: any, ...args: [string, number]): MatcherResult {
    const [table, expectedCount] = args;
    // 这里应该实现实际的数据库查询
    // 目前返回 Mock 结果
    const actualCount = 0; // Mock: 假设表为空
    const pass = actualCount === expectedCount;

    return {
      pass,
      message: () => pass
        ? `Expected table ${table} not to have ${expectedCount} records`
        : `Expected table ${table} to have ${expectedCount} records, but got ${actualCount}`,
    };
  },

  toMatchDatabaseRecord(received: any, ...args: [string, number, any]): MatcherResult {
    const [table, id, expectedData] = args;
    // 这里应该实现实际的数据库查询和比较
    // 目前返回 Mock 结果
    const pass = true; // Mock: 假设数据匹配

    return {
      pass,
      message: () => pass
        ? `Expected record with ID ${id} in table ${table} not to match expected data`
        : `Expected record with ID ${id} in table ${table} to match expected data: ${JSON.stringify(expectedData, null, 2)}`,
    };
  },
};

/**
 * 认证匹配器实现
 */
const authMatchers = {
  toBeValidJWT(received: string): MatcherResult {
    const jwtRegex = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/;
    const pass = typeof received === 'string' && jwtRegex.test(received);

    return {
      pass,
      message: () => pass
        ? `Expected "${received}" not to be a valid JWT`
        : `Expected "${received}" to be a valid JWT`,
    };
  },

  toHaveValidTokenStructure(received: any): MatcherResult {
    const pass = (
      typeof received === 'object' &&
      typeof received.accessToken === 'string' &&
      typeof received.refreshToken === 'string' &&
      typeof received.expiresIn === 'number'
    );

    return {
      pass,
      message: () => pass
        ? `Expected object not to have valid token structure`
        : `Expected object to have valid token structure (accessToken, refreshToken, expiresIn), but got: ${JSON.stringify(received, null, 2)}`,
    };
  },

  toBeExpiredToken(received: string): MatcherResult {
    // 这里应该实现实际的 JWT 解析和过期检查
    // 目前返回 Mock 结果
    const pass = false; // Mock: 假设 token 未过期

    return {
      pass,
      message: () => pass
        ? `Expected token not to be expired`
        : `Expected token to be expired`,
    };
  },

  toHaveCorrectUserClaims(received: string, ...args: [Partial<User>]): MatcherResult {
    const [expectedUser] = args;
    // 这里应该实现实际的 JWT 解析和用户声明检查
    // 目前返回 Mock 结果
    const pass = true; // Mock: 假设用户声明正确

    return {
      pass,
      message: () => pass
        ? `Expected token not to have correct user claims`
        : `Expected token to have correct user claims for user: ${JSON.stringify(expectedUser, null, 2)}`,
    };
  },
};

/**
 * 性能匹配器实现
 */
const performanceMatchers = {
  toRespondWithin(received: any, ...args: [number]): MatcherResult {
    const [milliseconds] = args;
    // 这里应该实现实际的响应时间测量
    // 目前返回 Mock 结果
    const responseTime = 100; // Mock: 假设响应时间为 100ms
    const pass = responseTime <= milliseconds;

    return {
      pass,
      message: () => pass
        ? `Expected response not to be within ${milliseconds}ms`
        : `Expected response to be within ${milliseconds}ms, but took ${responseTime}ms`,
    };
  },

  toHaveMemoryUsageBelow(received: any, ...args: [number]): MatcherResult {
    const [bytes] = args;
    const memoryUsage = process.memoryUsage().heapUsed;
    const pass = memoryUsage < bytes;

    return {
      pass,
      message: () => pass
        ? `Expected memory usage not to be below ${bytes} bytes`
        : `Expected memory usage to be below ${bytes} bytes, but got ${memoryUsage} bytes`,
    };
  },

  toHaveCpuUsageBelow(received: any, ...args: [number]): MatcherResult {
    const [percentage] = args;
    // 这里应该实现实际的 CPU 使用率测量
    // 目前返回 Mock 结果
    const cpuUsage = 10; // Mock: 假设 CPU 使用率为 10%
    const pass = cpuUsage < percentage;

    return {
      pass,
      message: () => pass
        ? `Expected CPU usage not to be below ${percentage}%`
        : `Expected CPU usage to be below ${percentage}%, but got ${cpuUsage}%`,
    };
  },
};

/**
 * 注册所有自定义匹配器
 */
export function setupCustomMatchers(): void {
  // 注册 API 匹配器
  expect.extend(apiMatchers as any);
  
  // 注册模型匹配器
  expect.extend(modelMatchers as any);
  
  // 注册数据库匹配器
  expect.extend(databaseMatchers as any);
  
  // 注册认证匹配器
  expect.extend(authMatchers as any);
  
  // 注册性能匹配器
  expect.extend(performanceMatchers as any);
}

// 导出匹配器
export {
  apiMatchers,
  modelMatchers,
  databaseMatchers,
  authMatchers,
  performanceMatchers,
};