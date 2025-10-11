/**
 * 简化数据库测试
 * 验证基础数据库功能是否正常工作
 */

import { describe, it, expect } from 'vitest';
import { getTestConnection, executeTestSQL, insertTestData, queryTestData } from './simple-setup.js';

describe('简化数据库测试', () => {
  it('应该能够连接到测试数据库', async () => {
    const connection = getTestConnection();
    expect(connection).toBeDefined();
    
    // 测试基本查询
    const result = await executeTestSQL('SELECT 1 as test');
    expect(result).toBeDefined();
  });

  it('应该能够插入和查询用户数据', async () => {
    // 插入测试用户
    const userId = await insertTestData('users', {
      name: '测试用户',
      email: 'test@example.com',
      password_hash: 'hashed_password',
      user_type: 'merchant_employee',
      status: 'active'
    });

    expect(userId).toBeGreaterThan(0);

    // 查询用户数据
    const users = await queryTestData('SELECT * FROM users WHERE id = ?', [userId]);
    expect(users).toHaveLength(1);
    expect(users[0].name).toBe('测试用户');
    expect(users[0].email).toBe('test@example.com');
  });

  it('应该能够插入和查询商户数据', async () => {
    // 插入测试商户
    const merchantId = await insertTestData('merchants', {
      name: '测试商户',
      code: 'TEST_MERCHANT_001',
      contact_person: '联系人',
      phone: '13800138000',
      email: 'merchant@example.com',
      status: 'active'
    });

    expect(merchantId).toBeGreaterThan(0);

    // 查询商户数据
    const merchants = await queryTestData('SELECT * FROM merchants WHERE id = ?', [merchantId]);
    expect(merchants).toHaveLength(1);
    expect(merchants[0].name).toBe('测试商户');
    expect(merchants[0].code).toBe('TEST_MERCHANT_001');
  });

  it('应该能够处理外键关系', async () => {
    // 先插入商户
    const merchantId = await insertTestData('merchants', {
      name: '测试商户',
      code: 'TEST_MERCHANT_002',
      contact_person: '联系人',
      phone: '13800138001',
      status: 'active'
    });

    // 插入关联的用户
    const userId = await insertTestData('users', {
      name: '商户员工',
      email: 'employee@example.com',
      password_hash: 'hashed_password',
      user_type: 'merchant_employee',
      status: 'active',
      merchant_id: merchantId
    });

    expect(userId).toBeGreaterThan(0);

    // 查询关联数据
    const result = await queryTestData(`
      SELECT u.name as user_name, m.name as merchant_name 
      FROM users u 
      JOIN merchants m ON u.merchant_id = m.id 
      WHERE u.id = ?
    `, [userId]);

    expect(result).toHaveLength(1);
    expect(result[0].user_name).toBe('商户员工');
    expect(result[0].merchant_name).toBe('测试商户');
  });

  it('应该能够处理访客申请数据', async () => {
    // 先创建必要的关联数据
    const merchantId = await insertTestData('merchants', {
      name: '测试商户',
      code: 'TEST_MERCHANT_003',
      contact_person: '联系人',
      phone: '13800138002',
      status: 'active'
    });

    const applicantId = await insertTestData('users', {
      name: '申请人',
      email: 'applicant@example.com',
      password_hash: 'hashed_password',
      user_type: 'merchant_employee',
      status: 'active',
      merchant_id: merchantId
    });

    // 插入访客申请
    const applicationId = await insertTestData('visitor_applications', {
      visitor_name: '访客姓名',
      phone: '13900139000',
      company: '访客公司',
      purpose: '商务洽谈',
      visit_date: new Date('2024-12-01 10:00:00'),
      duration: 2,
      status: 'pending',
      merchant_id: merchantId,
      applicant_id: applicantId
    });

    expect(applicationId).toBeGreaterThan(0);

    // 查询访客申请
    const applications = await queryTestData('SELECT * FROM visitor_applications WHERE id = ?', [applicationId]);
    expect(applications).toHaveLength(1);
    expect(applications[0].visitor_name).toBe('访客姓名');
    expect(applications[0].purpose).toBe('商务洽谈');
    expect(applications[0].status).toBe('pending');
  });

  it('应该能够清理测试数据', async () => {
    // 插入一些测试数据
    await insertTestData('users', {
      name: '临时用户',
      email: 'temp@example.com',
      password_hash: 'hashed_password',
      user_type: 'merchant_employee',
      status: 'active'
    });

    // 验证数据存在
    let users = await queryTestData('SELECT * FROM users WHERE email = ?', ['temp@example.com']);
    expect(users).toHaveLength(1);

    // 数据会在每个测试后自动清理，这里只是验证查询功能
    const allUsers = await queryTestData('SELECT COUNT(*) as count FROM users');
    expect(allUsers[0].count).toBeGreaterThan(0);
  });
});