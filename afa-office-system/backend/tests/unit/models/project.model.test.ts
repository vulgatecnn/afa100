import { describe, it, expect } from 'vitest';
import { ProjectModel } from '../../../src/models/project.model.js';

describe('ProjectModel', () => {

  describe('create', () => {
    it('应该成功创建项目', async () => {
      const projectData = {
        code: 'TEST_PROJECT_001',
        name: '测试项目001',
        description: '这是一个测试项目',
        status: 'active' as const
      };

      const project = await ProjectModel.create(projectData);

      expect(project).toBeDefined();
      expect(project.code).toBe(projectData.code);
      expect(project.name).toBe(projectData.name);
      expect(project.description).toBe(projectData.description);
      expect(project.status).toBe(projectData.status);
      expect(project.id).toBeGreaterThan(0);
    });

    it('应该使用默认状态创建项目', async () => {
      const projectData = {
        code: 'TEST_PROJECT_002',
        name: '测试项目002'
      };

      const project = await ProjectModel.create(projectData);

      expect(project.status).toBe('active');
    });

    it('创建重复编码的项目应该失败', async () => {
      const projectData = {
        code: 'TEST_PROJECT_003',
        name: '测试项目003'
      };

      await ProjectModel.create(projectData);

      await expect(ProjectModel.create(projectData)).rejects.toThrow();
    });
  });

  describe('findById', () => {
    it('应该根据ID查找项目', async () => {
      const projectData = {
        code: 'TEST_PROJECT_004',
        name: '测试项目004'
      };

      const createdProject = await ProjectModel.create(projectData);
      const foundProject = await ProjectModel.findById(createdProject.id);

      expect(foundProject).toBeDefined();
      expect(foundProject?.id).toBe(createdProject.id);
      expect(foundProject?.code).toBe(projectData.code);
    });

    it('查找不存在的项目应该返回null', async () => {
      const project = await ProjectModel.findById(99999);
      expect(project).toBeNull();
    });
  });

  describe('findByCode', () => {
    it('应该根据编码查找项目', async () => {
      const projectData = {
        code: 'TEST_PROJECT_005',
        name: '测试项目005'
      };

      await ProjectModel.create(projectData);
      const foundProject = await ProjectModel.findByCode(projectData.code);

      expect(foundProject).toBeDefined();
      expect(foundProject?.code).toBe(projectData.code);
    });

    it('查找不存在的编码应该返回null', async () => {
      const project = await ProjectModel.findByCode('NONEXISTENT_CODE');
      expect(project).toBeNull();
    });
  });

  describe('update', () => {
    it('应该成功更新项目信息', async () => {
      const projectData = {
        code: 'TEST_PROJECT_006',
        name: '测试项目006'
      };

      const createdProject = await ProjectModel.create(projectData);
      const updateData = {
        name: '更新后的项目名称',
        description: '更新后的描述'
      };

      const updatedProject = await ProjectModel.update(createdProject.id, updateData);

      expect(updatedProject.name).toBe(updateData.name);
      expect(updatedProject.description).toBe(updateData.description);
      expect(updatedProject.code).toBe(projectData.code); // 编码不应该改变
    });

    it('更新不存在的项目应该失败', async () => {
      await expect(ProjectModel.update(99999, { name: '测试' })).rejects.toThrow();
    });
  });

  describe('validateProjectData', () => {
    it('应该验证有效的项目数据', () => {
      const validData = {
        code: 'VALID_CODE',
        name: '有效的项目名称',
        status: 'active' as const
      };

      const result = ProjectModel.validateProjectData(validData);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('应该检测无效的项目数据', () => {
      const invalidData = {
        code: 'invalid-code', // 包含小写字母和连字符
        name: '', // 空名称
        status: 'invalid' as any // 无效状态
      };

      const result = ProjectModel.validateProjectData(invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('count', () => {
    it('应该统计项目数量', async () => {
      const initialCount = await ProjectModel.count();

      await ProjectModel.create({
        code: 'TEST_PROJECT_007',
        name: '测试项目007'
      });

      const newCount = await ProjectModel.count();
      expect(newCount).toBe(initialCount + 1);
    });

    it('应该根据条件统计项目数量', async () => {
      await ProjectModel.create({
        code: 'TEST_PROJECT_008',
        name: '测试项目008',
        status: 'active'
      });

      await ProjectModel.create({
        code: 'TEST_PROJECT_009',
        name: '测试项目009',
        status: 'inactive'
      });

      const activeCount = await ProjectModel.count({ status: 'active' });
      const inactiveCount = await ProjectModel.count({ status: 'inactive' });

      expect(activeCount).toBeGreaterThan(0);
      expect(inactiveCount).toBeGreaterThan(0);
    });
  });

  describe('codeExists', () => {
    it('应该检查项目编码是否已存在', async () => {
      const projectData = {
        code: 'TEST_PROJECT_010',
        name: '测试项目010'
      };

      await ProjectModel.create(projectData);

      const exists = await ProjectModel.codeExists(projectData.code);
      expect(exists).toBe(true);

      const notExists = await ProjectModel.codeExists('NONEXISTENT_CODE');
      expect(notExists).toBe(false);
    });

    it('应该排除指定ID检查编码是否存在', async () => {
      const projectData = {
        code: 'TEST_PROJECT_011',
        name: '测试项目011'
      };

      const project = await ProjectModel.create(projectData);

      // 排除自己的ID，应该返回false
      const exists = await ProjectModel.codeExists(projectData.code, project.id);
      expect(exists).toBe(false);
    });
  });
});