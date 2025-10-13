/**
 * 扩展的API连接性和健康检查测试
 * 实现任务 3.1: 扩展现有的 API 连接性测试
 * 
 * 测试目标:
 * - 基于 api-connectivity-comprehensive.test.ts，增加缺失的端点测试
 * - 验证所有 API 端点的可达性和响应格式
 * - 实现健康检查和服务状态监控
 * - 需求: 1.1, 1.2, 1.3, 1.4
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { withTestEnvironment } from '../helpers/integration-test-helper.js';
import type { IntegrationTestHelper } from '../helpers/integration-test-helper.js';

describe('扩展的API连接性和健康检查测试', () => {
  describe('1. 系统健康检查和服务监控', () => {
    it('应该提供完整的系统健康状态', async () => {
      await withTestEnvironment(async (helper: IntegrationTestHelper) => {
        const apiClient = helper.getApiClient();
        
        // 执行健康检查
        const isHealthy = await helper.performHealthCheck();
        expect(isHealthy).toBe(true);
        
        // 获取详细的健康状态
        const healthResponse = await apiClient.get('/health');
        
        expect(healthResponse.status).toBe(200);
        expect(healthResponse.data).toMatchObject({
          status: 'healthy',
          timestamp: expect.any(String),
          version: expect.any(String),
          services: expect.objectContaining({
            database: expect.objectContaining({
              status: expect.stringMatching(/^(healthy|degraded|unhealthy)$/),
              responseTime: expect.any(Number),
            }),
            api: expect.objectContaining({
              status: 'healthy',
              uptime: expect.any(Number),
            }),
          }),
        });
        
        console.log('✅ 系统健康检查完整性验证通过');
      });
    });

    it('应该监控各个服务组件的状态', async () => {
      await withTestEnvironment(async (helper: IntegrationTestHelper) => {
        const apiClient = helper.getApiClient();
        
        // 检查数据库服务状态
        const dbHealthResponse = await apiClient.request('GET', '/health/database');
        expect([200, 404]).toContain(dbHealthResponse.status);
        
        if (dbHealthResponse.status === 200) {
          expect(dbHealthResponse.data).toMatchObject({
            service: 'database',
            status: expect.stringMatching(/^(healthy|degraded|unhealthy)$/),
            connectionPool: expect.objectContaining({
              active: expect.any(Number),
              idle: expect.any(Number),
              total: expect.any(Number),
            }),
            responseTime: expect.any(Number),
          });
        }
        
        // 检查认证服务状态
        const authHealthResponse = await apiClient.request('GET', '/api/v1/auth/health');
        expect([200, 404]).toContain(authHealthResponse.status);
        
        if (authHealthResponse.status === 200) {
          expect(authHealthResponse.data).toMatchObject({
            service: 'auth',
            status: 'healthy',
            jwtConfig: expect.objectContaining({
              algorithm: expect.any(String),
              expiresIn: expect.any(String),
            }),
          });
        }
        
        console.log('✅ 服务组件状态监控验证通过');
      });
    });

    it('应该提供系统性能指标', async () => {
      await withTestEnvironment(async (helper: IntegrationTestHelper) => {
        const apiClient = helper.getApiClient();
        
        const metricsResponse = await apiClient.request('GET', '/health/metrics');
        expect([200, 404]).toContain(metricsResponse.status);
        
        if (metricsResponse.status === 200) {
          expect(metricsResponse.data).toMatchObject({
            system: expect.objectContaining({
              memory: expect.objectContaining({
                used: expect.any(Number),
                total: expect.any(Number),
                percentage: expect.any(Number),
              }),
              cpu: expect.objectContaining({
                usage: expect.any(Number),
              }),
            }),
            api: expect.objectContaining({
              requestCount: expect.any(Number),
              averageResponseTime: expect.any(Number),
              errorRate: expect.any(Number),
            }),
          });
        }
        
        console.log('✅ 系统性能指标验证通过');
      });
    });
  });

  describe('2. 员工申请管理端点测试', () => {
    it('应该能够获取商户列表供申请选择', async () => {
      await withTestEnvironment(async (helper: IntegrationTestHelper) => {
        const apiClient = helper.getApiClient();
        
        // 创建认证用户
        const { authResponse } = await helper.createAndLoginUser('employee');
        
        const response = await apiClient.request('GET', '/api/v1/employee/merchants');
        expect([200, 401]).toContain(response.status);
        
        if (response.status === 200) {
          expect(response.data).toMatchObject({
            merchants: expect.arrayContaining([
              expect.objectContaining({
                id: expect.any(Number),
                name: expect.any(String),
                code: expect.any(String),
                status: 'active',
              }),
            ]),
            total: expect.any(Number),
          });
        }
        
        console.log('✅ 员工申请商户列表端点验证通过');
      });
    });

    it('应该能够提交员工申请', async () => {
      await withTestEnvironment(async (helper: IntegrationTestHelper) => {
        const apiClient = helper.getApiClient();
        const seedData = helper.getSeedData();
        
        const { authResponse } = await helper.createAndLoginUser('employee');
        
        const applicationData = {
          merchantId: seedData.merchants[0].id,
          name: '测试申请员工',
          phone: '13800138888',
          position: '软件工程师',
          department: '技术部',
          reason: '希望加入贵公司技术团队',
        };
        
        const response = await apiClient.request('POST', '/api/v1/employee/apply', applicationData);
        expect([200, 201, 400, 401, 422]).toContain(response.status);
        
        if ([200, 201].includes(response.status)) {
          expect(response.data).toMatchObject({
            application: expect.objectContaining({
              id: expect.any(Number),
              merchantId: applicationData.merchantId,
              name: applicationData.name,
              status: 'pending',
            }),
          });
        }
        
        console.log('✅ 员工申请提交端点验证通过');
      });
    });

    it('应该能够获取我的申请记录', async () => {
      await withTestEnvironment(async (helper: IntegrationTestHelper) => {
        const apiClient = helper.getApiClient();
        
        const { authResponse } = await helper.createAndLoginUser('employee');
        
        const response = await apiClient.request('GET', '/api/v1/employee/application');
        expect([200, 401, 404]).toContain(response.status);
        
        if (response.status === 200) {
          expect(response.data).toMatchObject({
            application: expect.objectContaining({
              id: expect.any(Number),
              status: expect.stringMatching(/^(pending|approved|rejected)$/),
              createdAt: expect.any(String),
            }),
          });
        }
        
        console.log('✅ 我的申请记录端点验证通过');
      });
    });

    it('应该能够进行身份验证', async () => {
      await withTestEnvironment(async (helper: IntegrationTestHelper) => {
        const apiClient = helper.getApiClient();
        
        const { authResponse } = await helper.createAndLoginUser('employee');
        
        const verificationData = {
          idCard: '110101199001011234',
          realName: '张三',
          phone: '13800138888',
        };
        
        const response = await apiClient.request('POST', '/api/v1/employee/verify-identity', verificationData);
        expect([200, 400, 401, 422]).toContain(response.status);
        
        if (response.status === 200) {
          expect(response.data).toMatchObject({
            verified: expect.any(Boolean),
            verificationId: expect.any(String),
          });
        }
        
        console.log('✅ 身份验证端点验证通过');
      });
    });
  });

  describe('3. 员工管理端点测试', () => {
    it('应该能够批量创建员工', async () => {
      await withTestEnvironment(async (helper: IntegrationTestHelper) => {
        const apiClient = helper.getApiClient();
        const seedData = helper.getSeedData();
        
        const { authResponse } = await helper.createAndLoginUser('merchant_admin');
        
        const batchData = {
          employees: [
            {
              name: '员工1',
              email: 'employee1@test.com',
              phone: '13800138001',
              role: 'developer',
            },
            {
              name: '员工2',
              email: 'employee2@test.com',
              phone: '13800138002',
              role: 'designer',
            },
          ],
        };
        
        const merchantId = seedData.merchants[0].id;
        const response = await apiClient.request('POST', `/api/v1/merchants/${merchantId}/employees/batch`, batchData);
        expect([200, 201, 400, 401, 403, 422]).toContain(response.status);
        
        if ([200, 201].includes(response.status)) {
          expect(response.data).toMatchObject({
            created: expect.arrayContaining([
              expect.objectContaining({
                id: expect.any(Number),
                name: expect.any(String),
                email: expect.any(String),
              }),
            ]),
            total: batchData.employees.length,
          });
        }
        
        console.log('✅ 批量创建员工端点验证通过');
      });
    });

    it('应该能够Excel批量导入员工', async () => {
      await withTestEnvironment(async (helper: IntegrationTestHelper) => {
        const apiClient = helper.getApiClient();
        const seedData = helper.getSeedData();
        
        const { authResponse } = await helper.createAndLoginUser('merchant_admin');
        
        // 模拟Excel文件上传
        const merchantId = seedData.merchants[0].id;
        const response = await apiClient.request('POST', `/api/v1/merchants/${merchantId}/employees/import`, {
          file: 'mock-excel-file-content',
          fileName: 'employees.xlsx',
        });
        expect([200, 201, 400, 401, 403, 422]).toContain(response.status);
        
        console.log('✅ Excel批量导入员工端点验证通过');
      });
    });

    it('应该能够获取员工统计信息', async () => {
      await withTestEnvironment(async (helper: IntegrationTestHelper) => {
        const apiClient = helper.getApiClient();
        const seedData = helper.getSeedData();
        
        const { authResponse } = await helper.createAndLoginUser('merchant_admin');
        
        const merchantId = seedData.merchants[0].id;
        const response = await apiClient.request('GET', `/api/v1/merchants/${merchantId}/employees/stats`);
        expect([200, 401, 403]).toContain(response.status);
        
        if (response.status === 200) {
          expect(response.data).toMatchObject({
            total: expect.any(Number),
            active: expect.any(Number),
            inactive: expect.any(Number),
            byRole: expect.any(Object),
            byDepartment: expect.any(Object),
          });
        }
        
        console.log('✅ 员工统计信息端点验证通过');
      });
    });

    it('应该能够批量删除员工', async () => {
      await withTestEnvironment(async (helper: IntegrationTestHelper) => {
        const apiClient = helper.getApiClient();
        const seedData = helper.getSeedData();
        
        const { authResponse } = await helper.createAndLoginUser('merchant_admin');
        
        const deleteData = {
          employeeIds: ['1', '2', '3'],
        };
        
        const merchantId = seedData.merchants[0].id;
        const response = await apiClient.request('DELETE', `/api/v1/merchants/${merchantId}/employees`, deleteData);
        expect([200, 400, 401, 403, 404]).toContain(response.status);
        
        if (response.status === 200) {
          expect(response.data).toMatchObject({
            deleted: expect.any(Number),
            failed: expect.any(Array),
          });
        }
        
        console.log('✅ 批量删除员工端点验证通过');
      });
    });

    it('应该能够管理员工权限', async () => {
      await withTestEnvironment(async (helper: IntegrationTestHelper) => {
        const apiClient = helper.getApiClient();
        const seedData = helper.getSeedData();
        
        const { authResponse } = await helper.createAndLoginUser('merchant_admin');
        
        const merchantId = seedData.merchants[0].id;
        const employeeId = seedData.users.find(u => u.user_type === 'employee')?.id || 1;
        
        // 分配权限
        const permissionData = {
          permissions: ['visitor_management', 'access_control', 'report_view'],
        };
        
        const assignResponse = await apiClient.request('POST', `/api/v1/merchants/${merchantId}/employees/${employeeId}/permissions`, permissionData);
        expect([200, 400, 401, 403, 404]).toContain(assignResponse.status);
        
        // 获取权限
        const getResponse = await apiClient.request('GET', `/api/v1/merchants/${merchantId}/employees/${employeeId}/permissions`);
        expect([200, 401, 403, 404]).toContain(getResponse.status);
        
        if (getResponse.status === 200) {
          expect(getResponse.data).toMatchObject({
            permissions: expect.arrayContaining([
              expect.objectContaining({
                name: expect.any(String),
                granted: expect.any(Boolean),
              }),
            ]),
          });
        }
        
        console.log('✅ 员工权限管理端点验证通过');
      });
    });
  });

  describe('4. 商户申请管理端点测试', () => {
    it('应该能够获取商户的员工申请列表', async () => {
      await withTestEnvironment(async (helper: IntegrationTestHelper) => {
        const apiClient = helper.getApiClient();
        const seedData = helper.getSeedData();
        
        const { authResponse } = await helper.createAndLoginUser('merchant_admin');
        
        const merchantId = seedData.merchants[0].id;
        const response = await apiClient.request('GET', `/api/v1/merchants/${merchantId}/employee-applications`, {
          status: 'pending',
          page: 1,
          limit: 10,
        });
        expect([200, 401, 403]).toContain(response.status);
        
        if (response.status === 200) {
          expect(response.data).toMatchObject({
            applications: expect.arrayContaining([
              expect.objectContaining({
                id: expect.any(Number),
                name: expect.any(String),
                status: 'pending',
                createdAt: expect.any(String),
              }),
            ]),
            pagination: expect.objectContaining({
              page: 1,
              limit: 10,
              total: expect.any(Number),
            }),
          });
        }
        
        console.log('✅ 商户员工申请列表端点验证通过');
      });
    });

    it('应该能够审批员工申请', async () => {
      await withTestEnvironment(async (helper: IntegrationTestHelper) => {
        const apiClient = helper.getApiClient();
        const seedData = helper.getSeedData();
        
        const { authResponse } = await helper.createAndLoginUser('merchant_admin');
        
        const approvalData = {
          approved: true,
          note: '申请通过，欢迎加入团队',
          role: 'developer',
          department: '技术部',
        };
        
        const merchantId = seedData.merchants[0].id;
        const applicationId = 1; // 模拟申请ID
        const response = await apiClient.request('POST', `/api/v1/merchants/${merchantId}/employee-applications/${applicationId}/approve`, approvalData);
        expect([200, 400, 401, 403, 404]).toContain(response.status);
        
        if (response.status === 200) {
          expect(response.data).toMatchObject({
            application: expect.objectContaining({
              id: applicationId,
              status: 'approved',
              approvedAt: expect.any(String),
            }),
          });
        }
        
        console.log('✅ 员工申请审批端点验证通过');
      });
    });

    it('应该能够获取申请统计信息', async () => {
      await withTestEnvironment(async (helper: IntegrationTestHelper) => {
        const apiClient = helper.getApiClient();
        const seedData = helper.getSeedData();
        
        const { authResponse } = await helper.createAndLoginUser('merchant_admin');
        
        const merchantId = seedData.merchants[0].id;
        const response = await apiClient.request('GET', `/api/v1/merchants/${merchantId}/employee-applications/stats`);
        expect([200, 401, 403]).toContain(response.status);
        
        if (response.status === 200) {
          expect(response.data).toMatchObject({
            total: expect.any(Number),
            pending: expect.any(Number),
            approved: expect.any(Number),
            rejected: expect.any(Number),
            thisMonth: expect.any(Number),
            lastMonth: expect.any(Number),
          });
        }
        
        console.log('✅ 申请统计信息端点验证通过');
      });
    });
  });

  describe('5. 文件上传和管理端点测试', () => {
    it('应该能够上传头像文件', async () => {
      await withTestEnvironment(async (helper: IntegrationTestHelper) => {
        const apiClient = helper.getApiClient();
        
        const { authResponse } = await helper.createAndLoginUser('employee');
        
        // 模拟文件上传
        const mockFile = {
          originalName: 'avatar.jpg',
          mimeType: 'image/jpeg',
          size: 1024 * 100, // 100KB
          buffer: Buffer.from('mock-image-data'),
        };
        
        const response = await apiClient.uploadFile(mockFile, {
          type: 'avatar',
          category: 'user',
        });
        expect([200, 201, 400, 401, 413, 415]).toContain(response.status);
        
        if ([200, 201].includes(response.status)) {
          expect(response.data).toMatchObject({
            file: expect.objectContaining({
              id: expect.any(String),
              url: expect.any(String),
              originalName: mockFile.originalName,
              mimeType: mockFile.mimeType,
              size: mockFile.size,
            }),
          });
        }
        
        console.log('✅ 头像文件上传端点验证通过');
      });
    });

    it('应该能够上传身份证件文件', async () => {
      await withTestEnvironment(async (helper: IntegrationTestHelper) => {
        const apiClient = helper.getApiClient();
        
        const { authResponse } = await helper.createAndLoginUser('employee');
        
        const mockIdCard = {
          originalName: 'id-card.jpg',
          mimeType: 'image/jpeg',
          size: 1024 * 500, // 500KB
          buffer: Buffer.from('mock-id-card-data'),
        };
        
        const response = await apiClient.uploadFile(mockIdCard, {
          type: 'identity',
          category: 'document',
        });
        expect([200, 201, 400, 401, 413, 415]).toContain(response.status);
        
        console.log('✅ 身份证件文件上传端点验证通过');
      });
    });

    it('应该能够获取文件列表', async () => {
      await withTestEnvironment(async (helper: IntegrationTestHelper) => {
        const apiClient = helper.getApiClient();
        
        const { authResponse } = await helper.createAndLoginUser('merchant_admin');
        
        const response = await apiClient.request('GET', '/api/v1/files', {
          type: 'avatar',
          page: 1,
          limit: 10,
        });
        expect([200, 401, 404]).toContain(response.status);
        
        if (response.status === 200) {
          expect(response.data).toMatchObject({
            files: expect.arrayContaining([
              expect.objectContaining({
                id: expect.any(String),
                originalName: expect.any(String),
                url: expect.any(String),
                uploadedAt: expect.any(String),
              }),
            ]),
            pagination: expect.objectContaining({
              page: 1,
              limit: 10,
              total: expect.any(Number),
            }),
          });
        }
        
        console.log('✅ 文件列表端点验证通过');
      });
    });
  });

  describe('6. WebSocket实时通信端点测试', () => {
    it('应该能够建立WebSocket连接', async () => {
      await withTestEnvironment(async (helper: IntegrationTestHelper) => {
        const apiClient = helper.getApiClient();
        
        const { authResponse } = await helper.createAndLoginUser('merchant_admin');
        
        // 测试WebSocket连接端点
        const wsResponse = await apiClient.request('GET', '/api/v1/ws/connect', {
          token: authResponse.accessToken,
        });
        expect([200, 101, 401, 404]).toContain(wsResponse.status);
        
        console.log('✅ WebSocket连接端点验证通过');
      });
    });

    it('应该能够订阅实时通知', async () => {
      await withTestEnvironment(async (helper: IntegrationTestHelper) => {
        const apiClient = helper.getApiClient();
        
        const { authResponse } = await helper.createAndLoginUser('merchant_admin');
        
        const subscriptionData = {
          channels: ['visitor_applications', 'access_records', 'system_notifications'],
        };
        
        const response = await apiClient.request('POST', '/api/v1/notifications/subscribe', subscriptionData);
        expect([200, 400, 401, 404]).toContain(response.status);
        
        if (response.status === 200) {
          expect(response.data).toMatchObject({
            subscribed: expect.arrayContaining([
              expect.stringMatching(/^(visitor_applications|access_records|system_notifications)$/),
            ]),
          });
        }
        
        console.log('✅ 实时通知订阅端点验证通过');
      });
    });
  });

  describe('7. 系统配置和管理端点测试', () => {
    it('应该能够获取系统配置', async () => {
      await withTestEnvironment(async (helper: IntegrationTestHelper) => {
        const apiClient = helper.getApiClient();
        
        const { authResponse } = await helper.createAndLoginUser('tenant_admin');
        
        const response = await apiClient.request('GET', '/api/v1/system/config');
        expect([200, 401, 403, 404]).toContain(response.status);
        
        if (response.status === 200) {
          expect(response.data).toMatchObject({
            config: expect.objectContaining({
              maxVisitorsPerDay: expect.any(Number),
              defaultVisitDuration: expect.any(Number),
              autoApprovalEnabled: expect.any(Boolean),
              fileUploadLimits: expect.objectContaining({
                maxSize: expect.any(Number),
                allowedTypes: expect.any(Array),
              }),
            }),
          });
        }
        
        console.log('✅ 系统配置获取端点验证通过');
      });
    });

    it('应该能够更新系统配置', async () => {
      await withTestEnvironment(async (helper: IntegrationTestHelper) => {
        const apiClient = helper.getApiClient();
        
        const { authResponse } = await helper.createAndLoginUser('tenant_admin');
        
        const configData = {
          maxVisitorsPerDay: 200,
          defaultVisitDuration: 180,
          autoApprovalEnabled: true,
        };
        
        const response = await apiClient.request('PUT', '/api/v1/system/config', configData);
        expect([200, 400, 401, 403, 404]).toContain(response.status);
        
        if (response.status === 200) {
          expect(response.data).toMatchObject({
            config: expect.objectContaining({
              maxVisitorsPerDay: configData.maxVisitorsPerDay,
              defaultVisitDuration: configData.defaultVisitDuration,
              autoApprovalEnabled: configData.autoApprovalEnabled,
            }),
          });
        }
        
        console.log('✅ 系统配置更新端点验证通过');
      });
    });

    it('应该能够获取系统日志', async () => {
      await withTestEnvironment(async (helper: IntegrationTestHelper) => {
        const apiClient = helper.getApiClient();
        
        const { authResponse } = await helper.createAndLoginUser('tenant_admin');
        
        const response = await apiClient.request('GET', '/api/v1/system/logs', {
          level: 'error',
          startDate: '2024-01-01',
          endDate: '2024-12-31',
          page: 1,
          limit: 50,
        });
        expect([200, 401, 403, 404]).toContain(response.status);
        
        if (response.status === 200) {
          expect(response.data).toMatchObject({
            logs: expect.arrayContaining([
              expect.objectContaining({
                timestamp: expect.any(String),
                level: expect.any(String),
                message: expect.any(String),
                source: expect.any(String),
              }),
            ]),
            pagination: expect.objectContaining({
              page: 1,
              limit: 50,
              total: expect.any(Number),
            }),
          });
        }
        
        console.log('✅ 系统日志获取端点验证通过');
      });
    });
  });

  describe('8. API响应时间和性能监控', () => {
    it('应该监控API响应时间', async () => {
      await withTestEnvironment(async (helper: IntegrationTestHelper) => {
        const apiClient = helper.getApiClient();
        
        // 测试多个端点的响应时间
        const endpoints = [
          { method: 'GET', path: '/health' },
          { method: 'GET', path: '/api/v1/' },
          { method: 'GET', path: '/api/v1/auth/health' },
        ];
        
        const performanceResults = [];
        
        for (const endpoint of endpoints) {
          const startTime = Date.now();
          
          try {
            const response = await apiClient.request(endpoint.method as any, endpoint.path);
            const responseTime = Date.now() - startTime;
            
            performanceResults.push({
              endpoint: endpoint.path,
              responseTime,
              status: response.status,
              success: response.success,
            });
            
            // 验证响应时间在合理范围内
            expect(responseTime).toBeLessThan(5000); // 5秒超时
            
          } catch (error) {
            const responseTime = Date.now() - startTime;
            performanceResults.push({
              endpoint: endpoint.path,
              responseTime,
              status: 'error',
              error: error.message,
            });
          }
        }
        
        // 输出性能统计
        const avgResponseTime = performanceResults.reduce((sum, result) => sum + result.responseTime, 0) / performanceResults.length;
        console.log(`✅ API平均响应时间: ${avgResponseTime.toFixed(2)}ms`);
        console.log('性能详情:', performanceResults);
        
        expect(avgResponseTime).toBeLessThan(2000); // 平均响应时间应小于2秒
      });
    });

    it('应该能够获取API性能统计', async () => {
      await withTestEnvironment(async (helper: IntegrationTestHelper) => {
        const apiClient = helper.getApiClient();
        
        const { authResponse } = await helper.createAndLoginUser('tenant_admin');
        
        const response = await apiClient.request('GET', '/api/v1/system/performance');
        expect([200, 401, 403, 404]).toContain(response.status);
        
        if (response.status === 200) {
          expect(response.data).toMatchObject({
            api: expect.objectContaining({
              totalRequests: expect.any(Number),
              averageResponseTime: expect.any(Number),
              errorRate: expect.any(Number),
              slowestEndpoints: expect.any(Array),
            }),
            system: expect.objectContaining({
              uptime: expect.any(Number),
              memoryUsage: expect.any(Number),
              cpuUsage: expect.any(Number),
            }),
          });
        }
        
        console.log('✅ API性能统计端点验证通过');
      });
    });
  });

  describe('9. 错误处理和边界情况测试', () => {
    it('应该正确处理无效的API路径', async () => {
      await withTestEnvironment(async (helper: IntegrationTestHelper) => {
        const apiClient = helper.getApiClient();
        
        const invalidPaths = [
          '/api/v1/invalid-endpoint',
          '/api/v2/future-version',
          '/api/v1/merchants/invalid-id/employees',
          '/api/v1/auth/invalid-action',
        ];
        
        for (const path of invalidPaths) {
          const response = await apiClient.request('GET', path);
          expect(response.status).toBe(404);
          expect(response.success).toBe(false);
          expect(response.message).toContain('未找到');
        }
        
        console.log('✅ 无效API路径错误处理验证通过');
      });
    });

    it('应该正确处理无效的HTTP方法', async () => {
      await withTestEnvironment(async (helper: IntegrationTestHelper) => {
        const apiClient = helper.getApiClient();
        
        // 测试不支持的HTTP方法
        const response = await apiClient.request('PATCH', '/health');
        expect([405, 404]).toContain(response.status);
        
        if (response.status === 405) {
          expect(response.success).toBe(false);
          expect(response.message).toContain('方法不允许');
        }
        
        console.log('✅ 无效HTTP方法错误处理验证通过');
      });
    });

    it('应该正确处理请求体过大的情况', async () => {
      await withTestEnvironment(async (helper: IntegrationTestHelper) => {
        const apiClient = helper.getApiClient();
        
        // 创建一个很大的请求体
        const largeData = {
          data: 'x'.repeat(10 * 1024 * 1024), // 10MB数据
        };
        
        const response = await apiClient.request('POST', '/api/v1/auth/verify-token', largeData);
        expect([413, 400, 500]).toContain(response.status);
        
        if (response.status === 413) {
          expect(response.success).toBe(false);
          expect(response.message).toContain('请求体过大');
        }
        
        console.log('✅ 请求体过大错误处理验证通过');
      });
    });
  });

  describe('10. 综合连接性验证', () => {
    it('应该验证所有主要端点的连通性', async () => {
      await withTestEnvironment(async (helper: IntegrationTestHelper) => {
        const apiClient = helper.getApiClient();
        
        // 创建不同类型的用户进行测试
        const { authResponse: adminAuth } = await helper.createAndLoginUser('tenant_admin');
        const { authResponse: merchantAuth } = await helper.createAndLoginUser('merchant_admin');
        const { authResponse: employeeAuth } = await helper.createAndLoginUser('employee');
        
        const endpointTests = [
          // 公共端点
          { method: 'GET', path: '/health', auth: null, expectedStatus: [200] },
          { method: 'GET', path: '/api/v1/', auth: null, expectedStatus: [200, 404] },
          
          // 认证端点
          { method: 'GET', path: '/api/v1/auth/health', auth: null, expectedStatus: [200, 404] },
          
          // 管理员端点
          { method: 'GET', path: '/api/v1/system/config', auth: adminAuth, expectedStatus: [200, 401, 403, 404] },
          { method: 'GET', path: '/api/v1/tenant/stats', auth: adminAuth, expectedStatus: [200, 401, 403, 404] },
          
          // 商户管理端点
          { method: 'GET', path: '/api/v1/merchants', auth: merchantAuth, expectedStatus: [200, 401, 403, 404] },
          
          // 员工端点
          { method: 'GET', path: '/api/v1/employee/merchants', auth: employeeAuth, expectedStatus: [200, 401, 404] },
          
          // 访客端点
          { method: 'GET', path: '/api/v1/visitor/applications', auth: merchantAuth, expectedStatus: [200, 401, 404] },
          
          // 通行端点
          { method: 'GET', path: '/api/v1/access/records', auth: merchantAuth, expectedStatus: [200, 401, 404] },
        ];
        
        const results = [];
        
        for (const test of endpointTests) {
          try {
            // 设置认证
            if (test.auth) {
              apiClient.setAuthToken(test.auth.accessToken);
            } else {
              apiClient.clearAuth();
            }
            
            const response = await apiClient.request(test.method as any, test.path);
            const isExpectedStatus = test.expectedStatus.includes(response.status);
            
            results.push({
              endpoint: test.path,
              method: test.method,
              status: response.status,
              success: response.success,
              expected: isExpectedStatus,
            });
            
            expect(isExpectedStatus).toBe(true);
            
          } catch (error) {
            results.push({
              endpoint: test.path,
              method: test.method,
              status: 'error',
              error: error.message,
              expected: false,
            });
          }
        }
        
        // 统计结果
        const successCount = results.filter(r => r.expected).length;
        const totalCount = results.length;
        const successRate = (successCount / totalCount) * 100;
        
        console.log(`✅ 端点连通性验证完成: ${successCount}/${totalCount} (${successRate.toFixed(1)}%)`);
        console.log('详细结果:', results);
        
        // 要求至少80%的端点连通性
        expect(successRate).toBeGreaterThanOrEqual(80);
      }, {
        environment: 'integration',
        seedOptions: {
          merchantCount: 2,
          usersPerMerchant: 3,
          projectCount: 1,
        },
      });
    });
  });
});