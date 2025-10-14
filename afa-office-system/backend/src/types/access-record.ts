/**
 * 通行记录相关类型定义
 */

// 通行方向
export type AccessDirection = 'in' | 'out';

// 通行结果
export type AccessResult = 'success' | 'failed';

// 通行记录基础接口
export interface AccessRecord {
  id: number;
  user_id: number;
  passcode_id: number | null;
  device_id: string;
  device_type?: string | null;
  direction: AccessDirection;
  result: AccessResult;
  fail_reason?: string | null;
  project_id?: number | null;
  venue_id?: number | null;
  floor_id?: number | null;
  timestamp: string;
  created_at: string;
  updated_at: string;
}

// API 层创建通行记录数据
export interface CreateAccessRecordApiData {
  userId: number;
  passcodeId?: number | null | undefined;
  deviceId: string;
  deviceType?: string | null | undefined;
  direction: AccessDirection;
  result: AccessResult;
  failReason?: string | null | undefined;
  projectId?: number | null | undefined;
  venueId?: number | null | undefined;
  floorId?: number | null | undefined;
  timestamp: string;
}

// 数据库层创建通行记录数据
export interface CreateAccessRecordData {
  user_id: number;
  passcode_id?: number | null | undefined;
  device_id: string;
  device_type?: string | null | undefined;
  direction: AccessDirection;
  result: AccessResult;
  fail_reason?: string | null | undefined;
  project_id?: number | null | undefined;
  venue_id?: number | null | undefined;
  floor_id?: number | null | undefined;
  timestamp: string;
}

// 通行记录查询参数
export interface AccessRecordQuery {
  page: number;
  limit: number;
  userId?: number;
  deviceId?: string;
  result?: AccessResult;
  startDate?: string;
  endDate?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// 通行统计查询参数
export interface AccessStatsQuery {
  startDate: string;
  endDate: string;
  merchantId?: number;
  deviceId?: string;
}

// 通行统计结果
export interface AccessStats {
  total: number;
  success: number;
  failed: number;
  byHour: Array<{
    hour: number;
    count: number;
  }>;
  byDevice: Array<{
    deviceId: string;
    count: number;
  }>;
}

// API 到数据库数据转换函数
export function convertApiToDbAccessRecord(apiData: CreateAccessRecordApiData): CreateAccessRecordData {
  return {
    user_id: apiData.userId,
    passcode_id: apiData.passcodeId ?? null,
    device_id: apiData.deviceId,
    device_type: apiData.deviceType ?? null,
    direction: apiData.direction,
    result: apiData.result,
    fail_reason: apiData.failReason ?? null,
    project_id: apiData.projectId ?? null,
    venue_id: apiData.venueId ?? null,
    floor_id: apiData.floorId ?? null,
    timestamp: apiData.timestamp
  };
}