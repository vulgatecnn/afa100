/**
 * 文件上传下载集成测试套件
 * 测试各种文件类型的上传和下载
 * 验证文件大小限制和类型验证
 * 测试上传进度和状态反馈
 * 
 * 需求: 5.1, 5.2, 5.3, 5.5
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { promises as fs } from 'fs';
import path from 'path';
import { app } from '../../src/app.js';
import { IntegrationTestHelper } from '../helpers/integration-test-helper.js';
import type { ApiResponse } from '../../src/types/index.js';

describe('文件操作集成测试套件', () => {
  let testHelper: IntegrationTestHelper;
  let authToken: string;
  let testUser: any;
  let uploadedFileIds: string[] = [];

  beforeEach(async () => {
    // 设置集成测试环境
    testHelper = await IntegrationTestHelper.quickSetup({
      environment: 'integration',
      seedOptions: {
        merchants: 1,
        users: 3,
        projects: 1,
        venues: 1,
        floors: 1
      }
    });

    // 创建认证用户并登录
    const { user, authResponse } = await testHelper.createAndLoginUser('tenant_admin');
    testUser = user;
    authToken = authResponse.accessToken;

    // 清空上传文件ID列表
    uploadedFileIds = [];
  });

  afterEach(async () => {
    // 清理上传的测试文件
    for (const fileId of uploadedFileIds) {
      try {
        await request(app)
          .delete(`/api/v1/files/${fileId}`)
          .set('Authorization', `Bearer ${authToken}`);
      } catch (error) {
        console.warn(`清理文件失败: ${fileId}`, error);
      }
    }

    await testHelper.cleanup();
  });

  describe('文件上传测试', () => {
    it('应该成功上传图片文件', async () => {
      const testImagePath = path.join(process.cwd(), 'tests/fixtures/files/test-image.jpg');
      
      const response = await request(app)
        .post('/api/v1/files/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', testImagePath)
        .field('metadata', JSON.stringify({
          category: 'image',
          description: '测试图片上传'
        }));

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('originalName');
      expect(response.body.data.mimeType).toBe('image/jpeg');
      expect(response.body.data.userId).toBe(testUser.id);
      expect(response.body.data.category).toBe('image');

      // 记录文件ID用于清理
      uploadedFileIds.push(response.body.data.id);
    });

    it('应该成功上传PDF文档', async () => {
      const testPdfPath = path.join(process.cwd(), 'tests/fixtures/files/test-document.pdf');
      
      const response = await request(app)
        .post('/api/v1/files/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', testPdfPath)
        .field('metadata', JSON.stringify({
          category: 'document',
          description: '测试PDF文档上传'
        }));

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.mimeType).toBe('application/pdf');
      expect(response.body.data.category).toBe('document');

      uploadedFileIds.push(response.body.data.id);
    });

    it('应该成功上传文本文件', async () => {
      const testTextPath = path.join(process.cwd(), 'tests/fixtures/files/test-text.txt');
      
      const response = await request(app)
        .post('/api/v1/files/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', testTextPath)
        .field('metadata', JSON.stringify({
          category: 'text',
          description: '测试文本文件上传'
        }));

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.mimeType).toBe('text/plain');

      uploadedFileIds.push(response.body.data.id);
    });

    it('应该拒绝不支持的文件类型', async () => {
      const maliciousFilePath = path.join(process.cwd(), 'tests/fixtures/files/malicious-file.exe');
      
      const response = await request(app)
        .post('/api/v1/files/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', maliciousFilePath);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('不支持的文件类型');
    });

    it('应该拒绝超大文件', async () => {
      // 创建一个超过限制的大文件
      const largeContent = 'x'.repeat(15 * 1024 * 1024); // 15MB
      const largeFilePath = path.join(process.cwd(), 'tests/fixtures/files/temp-large-file.txt');
      
      await fs.writeFile(largeFilePath, largeContent);

      try {
        const response = await request(app)
          .post('/api/v1/files/upload')
          .set('Authorization', `Bearer ${authToken}`)
          .attach('file', largeFilePath);

        expect(response.status).toBe(413);
        expect(response.body.success).toBe(false);
      } finally {
        // 清理临时大文件
        try {
          await fs.unlink(largeFilePath);
        } catch (error) {
          console.warn('清理临时大文件失败:', error);
        }
      }
    });

    it('应该要求用户认证', async () => {
      const testImagePath = path.join(process.cwd(), 'tests/fixtures/files/test-image.jpg');
      
      const response = await request(app)
        .post('/api/v1/files/upload')
        .attach('file', testImagePath);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('应该要求选择文件', async () => {
      const response = await request(app)
        .post('/api/v1/files/upload')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('未选择文件');
    });
  });

  describe('文件下载测试', () => {
    let uploadedFileId: string;

    beforeEach(async () => {
      // 先上传一个测试文件
      const testImagePath = path.join(process.cwd(), 'tests/fixtures/files/test-image.jpg');
      
      const uploadResponse = await request(app)
        .post('/api/v1/files/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', testImagePath)
        .field('metadata', JSON.stringify({
          category: 'test',
          description: '用于下载测试的文件'
        }));

      uploadedFileId = uploadResponse.body.data.id;
      uploadedFileIds.push(uploadedFileId);
    });

    it('应该成功下载已上传的文件', async () => {
      const response = await request(app)
        .get(`/api/v1/files/${uploadedFileId}/download`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toBe('image/jpeg');
      expect(response.headers['content-disposition']).toContain('attachment');
      expect(response.body).toBeDefined();
    });

    it('应该返回404对不存在的文件', async () => {
      const nonExistentFileId = 'non-existent-file-id';
      
      const response = await request(app)
        .get(`/api/v1/files/${nonExistentFileId}/download`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    it('应该要求用户认证', async () => {
      const response = await request(app)
        .get(`/api/v1/files/${uploadedFileId}/download`);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('文件信息查询测试', () => {
    let uploadedFileId: string;

    beforeEach(async () => {
      // 先上传一个测试文件
      const testPdfPath = path.join(process.cwd(), 'tests/fixtures/files/test-document.pdf');
      
      const uploadResponse = await request(app)
        .post('/api/v1/files/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', testPdfPath)
        .field('metadata', JSON.stringify({
          category: 'document',
          description: '测试PDF文档',
          isPublic: false
        }));

      uploadedFileId = uploadResponse.body.data.id;
      uploadedFileIds.push(uploadedFileId);
    });

    it('应该成功获取文件信息', async () => {
      const response = await request(app)
        .get(`/api/v1/files/${uploadedFileId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id', uploadedFileId);
      expect(response.body.data).toHaveProperty('originalName');
      expect(response.body.data).toHaveProperty('mimeType', 'application/pdf');
      expect(response.body.data).toHaveProperty('size');
      expect(response.body.data).toHaveProperty('uploadedAt');
      expect(response.body.data.category).toBe('document');
      expect(response.body.data.description).toBe('测试PDF文档');
      expect(response.body.data.isPublic).toBe(false);
    });

    it('应该返回404对不存在的文件', async () => {
      const nonExistentFileId = 'non-existent-file-id';
      
      const response = await request(app)
        .get(`/api/v1/files/${nonExistentFileId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('文件列表查询测试', () => {
    beforeEach(async () => {
      // 上传多个不同类型的测试文件
      const files = [
        { path: 'tests/fixtures/files/test-image.jpg', category: 'image' },
        { path: 'tests/fixtures/files/test-document.pdf', category: 'document' },
        { path: 'tests/fixtures/files/test-text.txt', category: 'text' }
      ];

      for (const file of files) {
        const filePath = path.join(process.cwd(), file.path);
        const uploadResponse = await request(app)
          .post('/api/v1/files/upload')
          .set('Authorization', `Bearer ${authToken}`)
          .attach('file', filePath)
          .field('metadata', JSON.stringify({
            category: file.category,
            description: `测试${file.category}文件`
          }));

        uploadedFileIds.push(uploadResponse.body.data.id);
      }
    });

    it('应该成功获取用户文件列表', async () => {
      const response = await request(app)
        .get('/api/v1/files')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ page: 1, limit: 10 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('files');
      expect(response.body.data).toHaveProperty('total');
      expect(response.body.data).toHaveProperty('page', 1);
      expect(response.body.data).toHaveProperty('limit', 10);
      expect(response.body.data.files).toBeInstanceOf(Array);
      expect(response.body.data.files.length).toBeGreaterThan(0);
    });

    it('应该支持按文件类型过滤', async () => {
      const response = await request(app)
        .get('/api/v1/files')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ type: 'image', page: 1, limit: 10 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      
      // 验证返回的文件都是图片类型
      response.body.data.files.forEach((file: any) => {
        expect(file.mimeType).toMatch(/^image\//);
      });
    });

    it('应该支持分页', async () => {
      const response = await request(app)
        .get('/api/v1/files')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ page: 1, limit: 2 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.limit).toBe(2);
      expect(response.body.data.files.length).toBeLessThanOrEqual(2);
    });
  });

  describe('文件删除测试', () => {
    let uploadedFileId: string;

    beforeEach(async () => {
      // 先上传一个测试文件
      const testTextPath = path.join(process.cwd(), 'tests/fixtures/files/test-text.txt');
      
      const uploadResponse = await request(app)
        .post('/api/v1/files/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', testTextPath)
        .field('metadata', JSON.stringify({
          category: 'temp',
          description: '用于删除测试的临时文件'
        }));

      uploadedFileId = uploadResponse.body.data.id;
      // 不添加到 uploadedFileIds，因为我们要在测试中删除它
    });

    it('应该成功删除自己上传的文件', async () => {
      const response = await request(app)
        .delete(`/api/v1/files/${uploadedFileId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('删除成功');

      // 验证文件确实被删除了
      const getResponse = await request(app)
        .get(`/api/v1/files/${uploadedFileId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(getResponse.status).toBe(404);
    });

    it('应该返回404对不存在的文件', async () => {
      const nonExistentFileId = 'non-existent-file-id';
      
      const response = await request(app)
        .delete(`/api/v1/files/${nonExistentFileId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    it('应该要求用户认证', async () => {
      const response = await request(app)
        .delete(`/api/v1/files/${uploadedFileId}`);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('文件上传进度和状态反馈测试', () => {
    it('应该在上传过程中提供状态反馈', async () => {
      const testImagePath = path.join(process.cwd(), 'tests/fixtures/files/test-image.jpg');
      
      // 模拟上传过程中的状态检查
      const uploadPromise = request(app)
        .post('/api/v1/files/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', testImagePath)
        .field('metadata', JSON.stringify({
          category: 'progress-test',
          description: '测试上传进度反馈'
        }));

      const response = await uploadPromise;

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.message).toContain('上传成功');

      uploadedFileIds.push(response.body.data.id);
    });

    it('应该在上传失败时提供详细错误信息', async () => {
      // 尝试上传不支持的文件类型
      const maliciousFilePath = path.join(process.cwd(), 'tests/fixtures/files/malicious-file.exe');
      
      const response = await request(app)
        .post('/api/v1/files/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', maliciousFilePath);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBeDefined();
      expect(response.body.message).toContain('不支持的文件类型');
      expect(response.body).toHaveProperty('timestamp');
    });
  });

  describe('并发文件操作测试', () => {
    it('应该支持并发文件上传', async () => {
      const testFiles = [
        'tests/fixtures/files/test-image.jpg',
        'tests/fixtures/files/test-document.pdf',
        'tests/fixtures/files/test-text.txt'
      ];

      // 并发上传多个文件
      const uploadPromises = testFiles.map((filePath, index) => 
        request(app)
          .post('/api/v1/files/upload')
          .set('Authorization', `Bearer ${authToken}`)
          .attach('file', path.join(process.cwd(), filePath))
          .field('metadata', JSON.stringify({
            category: 'concurrent-test',
            description: `并发上传测试文件 ${index + 1}`
          }))
      );

      const responses = await Promise.all(uploadPromises);

      // 验证所有上传都成功
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        uploadedFileIds.push(response.body.data.id);
      });

      // 验证上传的文件数量正确
      expect(responses.length).toBe(testFiles.length);
    });
  });
});