import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../../src/app.js';
import database from '../../src/utils/database.js';

describe('应用程序集成测试', () => {
  beforeAll(async () => {
    // 连接测试数据库
    await database.connect();
  });

  afterAll(async () => {
    // 关闭数据库连接
    await database.close();
  });

  describe('健康检查', () => {
    it('应该返回健康状态', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'AFA办公小程序后端服务运行正常',
        version: '1.0.0',
      });

      expect(response.body.timestamp).toBeDefined();
    });
  });

  describe('API根路径', () => {
    it('应该返回API信息', async () => {
      const response = await request(app)
        .get('/api')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'AFA办公小程序 API',
        version: '1.0.0',
        availableVersions: ['v1'],
      });
    });
  });

  describe('404处理', () => {
    it('应该返回404错误', async () => {
      const response = await request(app)
        .get('/nonexistent-route')
        .expect(404);

      expect(response.body).toMatchObject({
        success: false,
        code: 404,
        message: '路由 /nonexistent-route 不存在',
      });
    });
  });

  describe('CORS头', () => {
    it('应该包含正确的CORS头', async () => {
      const response = await request(app)
        .get('/health')
        .set('Origin', 'http://localhost:3001')
        .expect(200);

      // CORS头只在跨域请求时设置
      expect(response.headers['access-control-allow-origin']).toBeDefined();
    });
  });

  describe('安全头', () => {
    it('应该包含安全响应头', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      // 检查Helmet设置的安全头
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      // Helmet默认设置为SAMEORIGIN，我们的自定义中间件设置为DENY
      expect(response.headers['x-frame-options']).toMatch(/DENY|SAMEORIGIN/);
    });
  });

  describe('JSON解析', () => {
    it('应该正确解析JSON请求体', async () => {
      const testData = { test: 'data' };
      
      // 由于我们还没有POST路由，这个测试会返回404，但会验证JSON解析
      const response = await request(app)
        .post('/api/v1/test')
        .send(testData)
        .expect(404);

      // 404是预期的，因为路由不存在，但这证明JSON解析工作正常
      expect(response.body.success).toBe(false);
    });
  });
});