import database from '../../src/utils/database.js';

/**
 * 为开发和测试加载初始数据
 */
export async function seedData(): Promise<void> {
  console.log('🌱 开始加载初始数据...');
  
  try {
    // 插入初始项目
    const projects = [
      {
        code: 'AFA_HQ',
        name: 'AFA总部大厦',
        description: 'AFA公司总部办公大楼',
      },
      {
        code: 'AFA_BRANCH',
        name: 'AFA分部大厦',
        description: 'AFA公司分部办公大楼',
      },
    ];
    
    for (const project of projects) {
      await database.run(
        'INSERT OR IGNORE INTO projects (code, name, description) VALUES (?, ?, ?)',
        [project.code, project.name, project.description]
      );
    }
    
    // 插入初始场地
    const venues = [
      {
        project_code: 'AFA_HQ',
        code: 'TOWER_A',
        name: 'A座',
        description: 'A座办公楼',
      },
      {
        project_code: 'AFA_HQ',
        code: 'TOWER_B',
        name: 'B座',
        description: 'B座办公楼',
      },
    ];
    
    for (const venue of venues) {
      // 获取项目ID
      const project = await database.get<{ id: number }>(
        'SELECT id FROM projects WHERE code = ?',
        [venue.project_code]
      );
      
      if (project) {
        await database.run(
          'INSERT OR IGNORE INTO venues (project_id, code, name, description) VALUES (?, ?, ?, ?)',
          [project.id, venue.code, venue.name, venue.description]
        );
      }
    }
    
    // 插入初始楼层
    const floors = [
      { venue_code: 'TOWER_A', code: 'F1', name: '1楼', description: '大堂及商业区' },
      { venue_code: 'TOWER_A', code: 'F2', name: '2楼', description: '办公区域' },
      { venue_code: 'TOWER_A', code: 'F3', name: '3楼', description: '办公区域' },
      { venue_code: 'TOWER_B', code: 'F1', name: '1楼', description: '大堂及商业区' },
      { venue_code: 'TOWER_B', code: 'F2', name: '2楼', description: '办公区域' },
    ];
    
    for (const floor of floors) {
      // 获取场地ID
      const venue = await database.get<{ id: number }>(
        'SELECT id FROM venues WHERE code = ?',
        [floor.venue_code]
      );
      
      if (venue) {
        await database.run(
          'INSERT OR IGNORE INTO floors (venue_id, code, name, description) VALUES (?, ?, ?, ?)',
          [venue.id, floor.code, floor.name, floor.description]
        );
      }
    }
    
    // 插入初始权限
    const permissions = [
      {
        code: 'AFA_HQ_TOWER_A_ACCESS',
        name: 'A座通行权限',
        description: '可以进入A座的权限',
        resource_type: 'venue' as const,
        actions: JSON.stringify(['access']),
      },
      {
        code: 'AFA_HQ_TOWER_B_ACCESS',
        name: 'B座通行权限',
        description: '可以进入B座的权限',
        resource_type: 'venue' as const,
        actions: JSON.stringify(['access']),
      },
    ];
    
    for (const permission of permissions) {
      // 根据类型获取资源ID
      let resourceId: number | null = null;
      if (permission.resource_type === 'venue') {
        const venue = await database.get<{ id: number }>(
          'SELECT id FROM venues WHERE code = ?',
          [permission.code.includes('TOWER_A') ? 'TOWER_A' : 'TOWER_B']
        );
        resourceId = venue?.id || null;
      }
      
      if (resourceId) {
        await database.run(
          'INSERT OR IGNORE INTO permissions (code, name, description, resource_type, resource_id, actions) VALUES (?, ?, ?, ?, ?, ?)',
          [permission.code, permission.name, permission.description, permission.resource_type, resourceId, permission.actions]
        );
      }
    }
    
    // 插入系统管理员用户
    await database.run(
      'INSERT OR IGNORE INTO users (name, user_type, phone, status) VALUES (?, ?, ?, ?)',
      ['系统管理员', 'tenant_admin', '13800000000', 'active']
    );
    
    // 插入演示商户
    await database.run(
      'INSERT OR IGNORE INTO merchants (name, code, contact, phone, email, status) VALUES (?, ?, ?, ?, ?, ?)',
      ['示例科技公司', 'DEMO_TECH', '张经理', '13800000001', 'demo@example.com', 'active']
    );
    
    console.log('✅ 初始数据加载完成');
    
  } catch (error) {
    console.error('❌ 初始数据加载失败:', (error as Error).message);
    throw error;
  }
}