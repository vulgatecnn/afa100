import { test as setup } from '@playwright/test';
import { testEnvironmentConfig } from '../../config/test-environment.js';

/**
 * 跨浏览器测试环境设置
 */

setup('跨浏览器测试环境准备', async ({ request }) => {
  console.log('🔧 准备跨浏览器测试环境...');

  // 验证后端服务可用性
  try {
    const healthResponse = await request.get(`${testEnvironmentConfig.backend.baseUrl}/api/v1/health`);
    if (!healthResponse.ok()) {
      throw new Error(`后端服务不可用: ${healthResponse.status()}`);
    }
    console.log('✅ 后端服务验证通过');
  } catch (error) {
    console.error('❌ 后端服务验证失败:', error);
    throw error;
  }

  // 验证前端服务可用性（可选）
  if (process.env.E2E_CHECK_FRONTEND !== 'false') {
    try {
      const tenantResponse = await request.get(testEnvironmentConfig.frontend.tenantAdmin.baseUrl);
      console.log(`✅ 租务管理端服务状态: ${tenantResponse.status()}`);
    } catch (error) {
      console.warn('⚠️  租务管理端服务检查失败，但继续测试:', error);
    }

    try {
      const merchantResponse = await request.get(testEnvironmentConfig.frontend.merchantAdmin.baseUrl);
      console.log(`✅ 商户管理端服务状态: ${merchantResponse.status()}`);
    } catch (error) {
      console.warn('⚠️  商户管理端服务检查失败，但继续测试:', error);
    }
  }

  console.log('🎯 跨浏览器测试环境准备完成');
});