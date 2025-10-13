/**
 * 文件安全性集成测试
 * 测试文件访问权限控制
 * 验证恶意文件上传防护
 * 测试文件存储和访问 URL 安全性
 * 
 * 需求: 5.4, 5.5
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { promises as fs } from 'fs';
import path from 'path';
import { app } from '../../src/app.js';
import { IntegrationTestHelper } from '../helpers/integration-test-helper.js';
import type { ApiResponse } from '../../src/types/index.js';

describe('文件安全性集成测试', () => {
  let testHelper: IntegrationTestHelper;
  let adminAuthToken: string;
  let userAuthToken: string;
  let adminUser: any;
  let regularUser: any;
  let uploadedFileIds: string[] = [];

  beforeEach(async () => {
    // 设置集成测试环境
    testHelper = await IntegrationTestHelper.quickSetup({
      environment: 'integration',
      seedOptions: {
        merchants: 2,
        users: 5,
        projects: 1,
        venues: 1,
        floors: 1
      }
    });

    // 创建管理员用户并登录
    const { user: admin, authResponse: adminAuth } = await testHelper.createAndLoginUser('tenant_admin');
    adminUser = admin;
    adminAuthToken = adminAuth.accessToken;

    // 创建普通用户并登录
    const { user: regular, authResponse: regularAuth } = await testHelper.createAndLoginUser('employee');
    regularUser = regular;
    userAuthToken = regularAuth.accessToken;

    // 清空上传文件ID列表
    uploadedFileIds = [];
  });

  afterEach(async () => {
    // 清理上传的测试文件
    for (const fileId of uploadedFileIds) {
      try {
        await request(app)
          .delete(`/api/v1/files/${fileId}`)
          .set('Authorization', `Bearer ${adminAuthToken}`);
      } catch (error) {
        console.warn(`清理文件失败: ${fileId}`, error);
      }
    }

    await testHelper.cleanup();
  });

  describe('文件访问权限控制测试', () => {
    let privateFileId: string;
    let publicFileId: string;

    beforeEach(async () => {
      // 管理员上传一个私有文件
      const testImagePath = path.join(process.cwd(), 'tests/fixtures/files/test-image.jpg');
      
      const privateUploadResponse = await request(app)
        .post('/api/v1/files/upload')
        .set('Authorization', `Bearer ${adminAuthToken}`)
        .attach('file', testImagePath)
        .field('metadata', JSON.stringify({
          category: 'private',
          description: '私有测试文件',
          isPublic: false
        }));

      privateFileId = privateUploadResponse.body.data.id;
      uploadedFileIds.push(privateFileId);

      // 管理员上传一个公开文件
      const publicUploadResponse = await request(app)
        .post('/api/v1/files/upload')
        .set('Authorization', `Bearer ${adminAuthToken}`)
        .attach('file', testImagePath)
        .field('metadata', JSON.stringify({
          category: 'public',
          description: '公开测试文件',
          isPublic: true
        }));

      publicFileId = publicUploadResponse.body.data.id;
      uploadedFileIds.push(publicFileId);
    });

    it('文件所有者应该能访问自己的私有文件', async () => {
      const response = await request(app)
        .get(`/api/v1/files/${privateFileId}`)
        .set('Authorization', `Bearer ${adminAuthToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(privateFileId);
    });

    it('文件所有者应该能下载自己的私有文件', async () => {
      const response = await request(app)
        .get(`/api/v1/files/${privateFileId}/download`)
        .set('Authorization', `Bearer ${adminAuthToken}`);

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toBe('image/jpeg');
    });

    it('其他用户不应该能访问私有文件信息', async () => {
      const response = await request(app)
        .get(`/api/v1/files/${privateFileId}`)
        .set('Authorization', `Bearer ${userAuthToken}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('无权访问');
    });

    it('其他用户不应该能下载私有文件', async () => {
      const response = await request(app)
        .get(`/api/v1/files/${privateFileId}/download`)
        .set('Authorization', `Bearer ${userAuthToken}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });

    it('任何认证用户都应该能访问公开文件', async () => {
      const response = await request(app)
        .get(`/api/v1/files/${publicFileId}`)
        .set('Authorization', `Bearer ${userAuthToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(publicFileId);
      expect(response.body.data.isPublic).toBe(true);
    });

    it('任何认证用户都应该能下载公开文件', async () => {
      const response = await request(app)
        .get(`/api/v1/files/${publicFileId}/download`)
        .set('Authorization', `Bearer ${userAuthToken}`);

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toBe('image/jpeg');
    });

    it('只有文件所有者能删除文件', async () => {
      // 普通用户尝试删除管理员的文件
      const deleteResponse = await request(app)
        .delete(`/api/v1/files/${privateFileId}`)
        .set('Authorization', `Bearer ${userAuthToken}`);

      expect(deleteResponse.status).toBe(403);
      expect(deleteResponse.body.success).toBe(false);

      // 验证文件仍然存在
      const getResponse = await request(app)
        .get(`/api/v1/files/${privateFileId}`)
        .set('Authorization', `Bearer ${adminAuthToken}`);

      expect(getResponse.status).toBe(200);
    });

    it('未认证用户不应该能访问任何文件', async () => {
      const responses = await Promise.all([
        request(app).get(`/api/v1/files/${privateFileId}`),
        request(app).get(`/api/v1/files/${publicFileId}`),
        request(app).get(`/api/v1/files/${privateFileId}/download`),
        request(app).get(`/api/v1/files/${publicFileId}/download`)
      ]);

      responses.forEach(response => {
        expect(response.status).toBe(401);
        expect(response.body.success).toBe(false);
      });
    });
  });

  describe('恶意文件上传防护测试', () => {
    it('应该阻止可执行文件上传', async () => {
      const maliciousFiles = [
        'malicious-file.exe',
        'script.bat',
        'virus.com',
        'trojan.scr'
      ];

      for (const fileName of maliciousFiles) {
        // 创建临时恶意文件
        const tempFilePath = path.join(process.cwd(), `tests/fixtures/files/temp-${fileName}`);
        await fs.writeFile(tempFilePath, 'malicious content');

        try {
          const response = await request(app)
            .post('/api/v1/files/upload')
            .set('Authorization', `Bearer ${adminAuthToken}`)
            .attach('file', tempFilePath);

          expect(response.status).toBe(400);
          expect(response.body.success).toBe(false);
          expect(response.body.message).toContain('不支持的文件类型');
        } finally {
          // 清理临时文件
          try {
            await fs.unlink(tempFilePath);
          } catch (error) {
            console.warn(`清理临时文件失败: ${tempFilePath}`, error);
          }
        }
      }
    });

    it('应该阻止脚本文件上传', async () => {
      const scriptFiles = [
        { name: 'script.js', content: 'alert("XSS")' },
        { name: 'script.php', content: '<?php system($_GET["cmd"]); ?>' },
        { name: 'script.py', content: 'import os; os.system("rm -rf /")' },
        { name: 'script.sh', content: '#!/bin/bash\nrm -rf /' }
      ];

      for (const script of scriptFiles) {
        const tempFilePath = path.join(process.cwd(), `tests/fixtures/files/temp-${script.name}`);
        await fs.writeFile(tempFilePath, script.content);

        try {
          const response = await request(app)
            .post('/api/v1/files/upload')
            .set('Authorization', `Bearer ${adminAuthToken}`)
            .attach('file', tempFilePath);

          expect(response.status).toBe(400);
          expect(response.body.success).toBe(false);
        } finally {
          try {
            await fs.unlink(tempFilePath);
          } catch (error) {
            console.warn(`清理临时文件失败: ${tempFilePath}`, error);
          }
        }
      }
    });

    it('应该验证文件内容与扩展名匹配', async () => {
      // 创建一个伪装成图片的文本文件
      const fakeImagePath = path.join(process.cwd(), 'tests/fixtures/files/temp-fake-image.jpg');
      await fs.writeFile(fakeImagePath, 'This is not an image file');

      try {
        const response = await request(app)
          .post('/api/v1/files/upload')
          .set('Authorization', `Bearer ${adminAuthToken}`)
          .attach('file', fakeImagePath);

        // 应该根据实际MIME类型检测，而不是文件扩展名
        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
      } finally {
        try {
          await fs.unlink(fakeImagePath);
        } catch (error) {
          console.warn('清理临时文件失败:', error);
        }
      }
    });

    it('应该限制文件名长度和特殊字符', async () => {
      const testImagePath = path.join(process.cwd(), 'tests/fixtures/files/test-image.jpg');
      
      // 测试超长文件名
      const longFileName = 'a'.repeat(300) + '.jpg';
      const tempLongFilePath = path.join(process.cwd(), `tests/fixtures/files/${longFileName}`);
      
      // 复制测试图片到长文件名
      await fs.copyFile(testImagePath, tempLongFilePath);

      try {
        const response = await request(app)
          .post('/api/v1/files/upload')
          .set('Authorization', `Bearer ${adminAuthToken}`)
          .attach('file', tempLongFilePath);

        // 系统应该处理长文件名（可能截断或拒绝）
        expect([200, 400]).toContain(response.status);
        
        if (response.status === 200) {
          uploadedFileIds.push(response.body.data.id);
        }
      } finally {
        try {
          await fs.unlink(tempLongFilePath);
        } catch (error) {
          console.warn('清理临时文件失败:', error);
        }
      }
    });
  });

  describe('文件存储安全性测试', () => {
    let uploadedFileId: string;

    beforeEach(async () => {
      // 上传一个测试文件
      const testImagePath = path.join(process.cwd(), 'tests/fixtures/files/test-image.jpg');
      
      const uploadResponse = await request(app)
        .post('/api/v1/files/upload')
        .set('Authorization', `Bearer ${adminAuthToken}`)
        .attach('file', testImagePath)
        .field('metadata', JSON.stringify({
          category: 'security-test',
          description: '安全性测试文件'
        }));

      uploadedFileId = uploadResponse.body.data.id;
      uploadedFileIds.push(uploadedFileId);
    });

    it('文件ID应该是不可预测的', async () => {
      // 上传多个文件，验证ID的随机性
      const fileIds: string[] = [];
      
      for (let i = 0; i < 5; i++) {
        const testTextPath = path.join(process.cwd(), 'tests/fixtures/files/test-text.txt');
        
        const response = await request(app)
          .post('/api/v1/files/upload')
          .set('Authorization', `Bearer ${adminAuthToken}`)
          .attach('file', testTextPath)
          .field('metadata', JSON.stringify({
            category: 'id-test',
            description: `ID测试文件 ${i + 1}`
          }));

        fileIds.push(response.body.data.id);
        uploadedFileIds.push(response.body.data.id);
      }

      // 验证所有ID都是唯一的
      const uniqueIds = new Set(fileIds);
      expect(uniqueIds.size).toBe(fileIds.length);

      // 验证ID格式（应该是UUID格式）
      fileIds.forEach(id => {
        expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
      });
    });

    it('应该防止路径遍历攻击', async () => {
      const maliciousIds = [
        '../../../etc/passwd',
        '..\\..\\..\\windows\\system32\\config\\sam',
        '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd',
        '....//....//....//etc/passwd'
      ];

      for (const maliciousId of maliciousIds) {
        const response = await request(app)
          .get(`/api/v1/files/${encodeURIComponent(maliciousId)}/download`)
          .set('Authorization', `Bearer ${adminAuthToken}`);

        expect(response.status).toBe(404);
        expect(response.body.success).toBe(false);
      }
    });

    it('应该防止直接文件系统访问', async () => {
      // 尝试访问系统文件
      const systemPaths = [
        '/etc/passwd',
        '/proc/version',
        'C:\\Windows\\System32\\drivers\\etc\\hosts',
        '/var/log/auth.log'
      ];

      for (const systemPath of systemPaths) {
        const response = await request(app)
          .get(`/api/v1/files/${encodeURIComponent(systemPath)}/download`)
          .set('Authorization', `Bearer ${adminAuthToken}`);

        expect(response.status).toBe(404);
        expect(response.body.success).toBe(false);
      }
    });

    it('文件URL应该包含访问控制', async () => {
      // 获取文件信息
      const fileInfoResponse = await request(app)
        .get(`/api/v1/files/${uploadedFileId}`)
        .set('Authorization', `Bearer ${adminAuthToken}`);

      expect(fileInfoResponse.status).toBe(200);

      // 文件下载应该需要认证
      const downloadResponse = await request(app)
        .get(`/api/v1/files/${uploadedFileId}/download`);

      expect(downloadResponse.status).toBe(401);
      expect(downloadResponse.body.success).toBe(false);
    });
  });

  describe('文件上传速率限制测试', () => {
    it('应该限制上传频率', async () => {
      const testImagePath = path.join(process.cwd(), 'tests/fixtures/files/test-image.jpg');
      const uploadPromises: Promise<any>[] = [];

      // 快速连续上传多个文件
      for (let i = 0; i < 15; i++) {
        uploadPromises.push(
          request(app)
            .post('/api/v1/files/upload')
            .set('Authorization', `Bearer ${adminAuthToken}`)
            .attach('file', testImagePath)
            .field('metadata', JSON.stringify({
              category: 'rate-limit-test',
              description: `速率限制测试文件 ${i + 1}`
            }))
        );
      }

      const responses = await Promise.all(uploadPromises);
      
      // 应该有一些请求被速率限制拒绝
      const successCount = responses.filter(r => r.status === 200).length;
      const rateLimitedCount = responses.filter(r => r.status === 429).length;

      expect(rateLimitedCount).toBeGreaterThan(0);
      
      // 记录成功上传的文件ID用于清理
      responses.forEach(response => {
        if (response.status === 200) {
          uploadedFileIds.push(response.body.data.id);
        }
      });
    });
  });

  describe('文件内容安全扫描测试', () => {
    it('应该检测潜在的恶意内容', async () => {
      // 创建包含可疑内容的文本文件
      const suspiciousContent = `
        <script>alert('XSS')</script>
        <?php system($_GET['cmd']); ?>
        javascript:void(0)
        data:text/html,<script>alert('XSS')</script>
      `;
      
      const suspiciousFilePath = path.join(process.cwd(), 'tests/fixtures/files/temp-suspicious.txt');
      await fs.writeFile(suspiciousFilePath, suspiciousContent);

      try {
        const response = await request(app)
          .post('/api/v1/files/upload')
          .set('Authorization', `Bearer ${adminAuthToken}`)
          .attach('file', suspiciousFilePath);

        // 根据实现，可能接受但标记，或直接拒绝
        if (response.status === 200) {
          uploadedFileIds.push(response.body.data.id);
          // 如果接受，应该有安全标记
          expect(response.body.data).toHaveProperty('securityScan');
        } else {
          expect(response.status).toBe(400);
          expect(response.body.message).toContain('安全');
        }
      } finally {
        try {
          await fs.unlink(suspiciousFilePath);
        } catch (error) {
          console.warn('清理临时文件失败:', error);
        }
      }
    });
  });

  describe('文件元数据安全测试', () => {
    it('应该清理文件元数据中的敏感信息', async () => {
      const testImagePath = path.join(process.cwd(), 'tests/fixtures/files/test-image.jpg');
      
      const response = await request(app)
        .post('/api/v1/files/upload')
        .set('Authorization', `Bearer ${adminAuthToken}`)
        .attach('file', testImagePath)
        .field('metadata', JSON.stringify({
          category: 'metadata-test',
          description: '元数据安全测试',
          maliciousField: '<script>alert("XSS")</script>',
          systemPath: '/etc/passwd'
        }));

      expect(response.status).toBe(200);
      uploadedFileIds.push(response.body.data.id);

      // 获取文件信息，验证恶意元数据被清理
      const fileInfoResponse = await request(app)
        .get(`/api/v1/files/${response.body.data.id}`)
        .set('Authorization', `Bearer ${adminAuthToken}`);

      expect(fileInfoResponse.status).toBe(200);
      
      // 恶意字段应该被过滤掉或清理
      expect(fileInfoResponse.body.data).not.toHaveProperty('maliciousField');
      expect(fileInfoResponse.body.data).not.toHaveProperty('systemPath');
    });
  });
});