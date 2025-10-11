import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import database from '../../src/utils/database.js';
import { PasscodeService } from '../../src/services/passcode.service.js';
import { AccessRecordService } from '../../src/services/access-record.service.js';
import { UserModel } from '../../src/models/user.model.js';
import { MerchantModel } from '../../src/models/merchant.model.js';
import { PasscodeModel } from '../../src/models/passcode.model.js';
import { AccessRecordModel, CreateAccessRecordData } from '../../src/models/access-record.model.js';
import { QRCodeUtils } from '../../src/utils/qrcode.js';
import type { User, Merchant } from '../../src/types/index.js';

describe('通行系统性能测试', () => {
  let testUsers: User[] = [];
  let testMerchant: Merchant;

  beforeAll(async () => {
    await database.connect();
  });

  afterAll(async () => {
    await database.close();
  });

  beforeEach(async () => {
    // 创建测试商户
    testMerchant = await MerchantModel.create({
      name: '性能测试公司',
      code: 'PERF_TEST',
      contact: '测试联系人',
      phone: '13800138000',
      status: 'active'
    });

    // 创建多个测试用户
    const userPromises = Array.from({ length: 100 }, (_, i) =>
      UserModel.create({
        name: `测试用户${i + 1}`,
        phone: `1380013${String(i + 1).padStart(4, '0')}`,
        user_type: 'employee',
        status: 'active',
        merchant_id: testMerchant.id,
        open_id: `openid_${i + 1}`
      })
    );

    testUsers = await Promise.all(userPromises);
  });

  afterEach(async () => {
    // 清理测试数据
    await database.run('DELETE FROM access_records');
    await database.run('DELETE FROM passcodes');
    await database.run('DELETE FROM users');
    await database.run('DELETE FROM merchants');
    testUsers = [];
  });

  describe('通行码生成性能测试', () => {
    it('应该在合理时间内生成大量通行码', async () => {
      const userCount = 50;
      const users = testUsers.slice(0, userCount);

      const startTime = Date.now();
      
      // 并发生成通行码
      const promises = users.map(user =>
        PasscodeService.generatePasscode(user!.id, 'employee')
      );

      const passcodes = await Promise.all(promises);
      
      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(passcodes).toHaveLength(userCount);
      expect(duration).toBeLessThan(5000); // 5秒内完成

      console.log(`生成 ${userCount} 个通行码耗时: ${duration}ms`);
      console.log(`平均每个通行码生成时间: ${(duration / userCount).toFixed(2)}ms`);

      // 验证所有通行码都是唯一的
      const codes = passcodes.map(p => p.code);
      const uniqueCodes = new Set(codes);
      expect(uniqueCodes.size).toBe(userCount);
    });

    it('应该在高并发下保持通行码唯一性', async () => {
      const concurrentCount = 100;
      const user = testUsers[0];

      const startTime = Date.now();

      // 高并发生成通行码（同一用户）
      const promises = Array.from({ length: concurrentCount }, () =>
        PasscodeService.generatePasscode(user.id, 'employee')
      );

      const passcodes = await Promise.all(promises);

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(passcodes).toHaveLength(concurrentCount);
      expect(duration).toBeLessThan(10000); // 10秒内完成

      // 验证只有最后一个通行码是活跃的（其他的应该被撤销）
      const activePascodes = await PasscodeModel.findByUserId(user.id);
      const activeCount = activePascodes.filter(p => p.status === 'active').length;
      expect(activeCount).toBe(1);

      console.log(`高并发生成 ${concurrentCount} 个通行码耗时: ${duration}ms`);
    });

    it('应该高效生成动态二维码', async () => {
      const qrCount = 50;
      const users = testUsers.slice(0, qrCount);

      const startTime = Date.now();

      const promises = users.map(user =>
        PasscodeService.generateDynamicQRPasscode(user.id, 'employee')
      );

      const qrResults = await Promise.all(promises);

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(qrResults).toHaveLength(qrCount);
      expect(duration).toBeLessThan(8000); // 8秒内完成

      // 验证所有二维码内容都不同
      const qrContents = qrResults.map(r => r.qrContent);
      const uniqueContents = new Set(qrContents);
      expect(uniqueContents.size).toBe(qrCount);

      console.log(`生成 ${qrCount} 个动态二维码耗时: ${duration}ms`);
      console.log(`平均每个二维码生成时间: ${(duration / qrCount).toFixed(2)}ms`);
    });
  });

  describe('通行码验证性能测试', () => {
    let testPasscodes: any[] = [];

    beforeEach(async () => {
      // 预先生成测试通行码
      const passcodePromises = testUsers.slice(0, 20).map(user =>
        PasscodeService.generatePasscode(user.id, 'employee', { usageLimit: 1000 })
      );
      testPasscodes = await Promise.all(passcodePromises);
    });

    it('应该快速验证通行码', async () => {
      const validationCount = 100;
      const startTime = Date.now();

      // 并发验证通行码
      const promises = Array.from({ length: validationCount }, (_, i) => {
        const passcode = testPasscodes[i % testPasscodes.length];
        return PasscodeService.validatePasscode(passcode.code, `device_${i}`);
      });

      const results = await Promise.all(promises);

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(results).toHaveLength(validationCount);
      expect(results.every(r => r.valid)).toBe(true);
      expect(duration).toBeLessThan(3000); // 3秒内完成

      console.log(`验证 ${validationCount} 个通行码耗时: ${duration}ms`);
      console.log(`平均每次验证时间: ${(duration / validationCount).toFixed(2)}ms`);
    });

    it('应该高效验证二维码通行码', async () => {
      // 生成二维码通行码
      const qrResults = await Promise.all(
        testUsers.slice(0, 10).map(user =>
          PasscodeService.generateDynamicQRPasscode(user.id, 'employee')
        )
      );

      const validationCount = 50;
      const startTime = Date.now();

      // 并发验证二维码
      const promises = Array.from({ length: validationCount }, (_, i) => {
        const qrResult = qrResults[i % qrResults.length];
        return PasscodeService.validateQRPasscode(qrResult.qrContent, `qr_device_${i}`);
      });

      const results = await Promise.all(promises);

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(results).toHaveLength(validationCount);
      expect(results.every(r => r.valid)).toBe(true);
      expect(duration).toBeLessThan(5000); // 5秒内完成

      console.log(`验证 ${validationCount} 个二维码耗时: ${duration}ms`);
    });

    it('应该处理大量失败验证请求', async () => {
      const failureCount = 100;
      const startTime = Date.now();

      // 并发验证无效通行码
      const promises = Array.from({ length: failureCount }, (_, i) =>
        PasscodeService.validatePasscode(`INVALID_CODE_${i}`, `device_${i}`)
      );

      const results = await Promise.all(promises);

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(results).toHaveLength(failureCount);
      expect(results.every(r => !r.valid)).toBe(true);
      expect(duration).toBeLessThan(2000); // 2秒内完成（失败验证应该更快）

      console.log(`处理 ${failureCount} 个失败验证耗时: ${duration}ms`);
    });
  });

  describe('通行记录性能测试', () => {
    it('应该快速记录大量通行日志', async () => {
      const recordCount = 200;
      const startTime = Date.now();

      // 并发记录通行日志
      const promises = Array.from({ length: recordCount }, (_, i) => {
        const user = testUsers[i % testUsers.length];
        const recordData = {
          userId: user!.id,
          deviceId: `device_${i}`,
          direction: 'in' as const,
          result: 'success' as const,
          timestamp: new Date().toISOString(),
        };
        return AccessRecordService.recordAccess(recordData);
      });

      const records = await Promise.all(promises);

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(records).toHaveLength(recordCount);
      expect(duration).toBeLessThan(8000); // 8秒内完成

      console.log(`记录 ${recordCount} 条通行日志耗时: ${duration}ms`);
      console.log(`平均每条记录时间: ${(duration / recordCount).toFixed(2)}ms`);
    });

    it('应该高效批量记录通行日志', async () => {
      const batchSize = 100;
      const batchData: CreateAccessRecordData[] = Array.from({ length: batchSize }, (_, i) => {
        const user = testUsers[i % testUsers.length];
        return {
          userId: user.id,
          deviceId: `batch_device_${i % 5}`,
          direction: i % 2 === 0 ? 'in' : 'out',
          result: 'success',
          timestamp: new Date(Date.now() - i * 1000).toISOString()
        };
      });

      const startTime = Date.now();
      const records = await AccessRecordService.batchRecordAccess(batchData);
      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(records).toHaveLength(batchSize);
      expect(duration).toBeLessThan(3000); // 3秒内完成（批量操作应该更快）

      console.log(`批量记录 ${batchSize} 条通行日志耗时: ${duration}ms`);
    });

    it('应该快速查询大量通行记录', async () => {
      // 先创建大量测试记录
      const recordCount = 500;
      const batchData: CreateAccessRecordData[] = Array.from({ length: recordCount }, (_, i) => {
        const user = testUsers[i % testUsers.length];
        return {
          userId: user.id,
          deviceId: `query_device_${i % 20}`,
          direction: i % 2 === 0 ? 'in' : 'out',
          result: i % 10 === 0 ? 'failed' : 'success',
          timestamp: new Date(Date.now() - i * 60 * 1000).toISOString()
        };
      });

      await AccessRecordService.batchRecordAccess(batchData);

      // 测试查询性能
      const queryTests = [
        { name: '分页查询', query: { page: 1, limit: 50 } },
        { name: '用户筛选', query: { userId: testUsers[0].id, page: 1, limit: 20 } },
        { name: '设备筛选', query: { deviceId: 'query_device_1', page: 1, limit: 20 } },
        { name: '结果筛选', query: { result: 'success' as const, page: 1, limit: 50 } },
        { name: '日期范围', query: { 
          startDate: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
          endDate: new Date().toISOString(),
          page: 1, 
          limit: 50 
        }}
      ];

      for (const test of queryTests) {
        const startTime = Date.now();
        const result = await AccessRecordService.getAccessRecords(test.query);
        const endTime = Date.now();
        const duration = endTime - startTime;

        expect(result.data).toBeDefined();
        expect(duration).toBeLessThan(1000); // 1秒内完成

        console.log(`${test.name}查询耗时: ${duration}ms, 返回 ${result.data.length} 条记录`);
      }
    });
  });

  describe('QR码工具性能测试', () => {
    it('应该快速生成和解析二维码', async () => {
      const qrCount = 100;
      const startTime = Date.now();

      // 生成二维码
      const qrContents = Array.from({ length: qrCount }, (_, i) =>
        QRCodeUtils.generateQRCodeContent(
          i + 1,
          'employee',
          new Date(Date.now() + 60 * 60 * 1000),
          [`permission_${i}`]
        )
      );

      const generateTime = Date.now();
      const generateDuration = generateTime - startTime;

      // 解析二维码
      const parsedResults = qrContents.map(content =>
        QRCodeUtils.parseQRCodeContent(content)
      );

      const parseTime = Date.now();
      const parseDuration = parseTime - generateTime;

      expect(qrContents).toHaveLength(qrCount);
      expect(parsedResults.every(r => r !== null)).toBe(true);
      expect(generateDuration).toBeLessThan(2000); // 2秒内生成
      expect(parseDuration).toBeLessThan(1000); // 1秒内解析

      console.log(`生成 ${qrCount} 个二维码耗时: ${generateDuration}ms`);
      console.log(`解析 ${qrCount} 个二维码耗时: ${parseDuration}ms`);
    });

    it('应该快速生成和验证时效性通行码', async () => {
      const codeCount = 200;
      const baseCodes = Array.from({ length: codeCount }, (_, i) => `BASE_CODE_${i}`);

      const startTime = Date.now();

      // 生成时效性通行码
      const timeBasedCodes = baseCodes.map(baseCode =>
        QRCodeUtils.generateTimeBasedCode(baseCode, 5)
      );

      const generateTime = Date.now();
      const generateDuration = generateTime - startTime;

      // 验证时效性通行码
      const validationResults = timeBasedCodes.map((timeCode, i) =>
        QRCodeUtils.validateTimeBasedCode(timeCode, baseCodes[i], 5)
      );

      const validateTime = Date.now();
      const validateDuration = validateTime - generateTime;

      expect(timeBasedCodes).toHaveLength(codeCount);
      expect(validationResults.every(r => r === true)).toBe(true);
      expect(generateDuration).toBeLessThan(1000); // 1秒内生成
      expect(validateDuration).toBeLessThan(1000); // 1秒内验证

      console.log(`生成 ${codeCount} 个时效性通行码耗时: ${generateDuration}ms`);
      console.log(`验证 ${codeCount} 个时效性通行码耗时: ${validateDuration}ms`);
    });

    it('应该快速生成唯一ID', async () => {
      const idCount = 1000;
      const startTime = Date.now();

      const uniqueIds = Array.from({ length: idCount }, () =>
        QRCodeUtils.generateUniqueId()
      );

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(uniqueIds).toHaveLength(idCount);
      expect(duration).toBeLessThan(500); // 500ms内完成

      // 验证唯一性
      const uniqueSet = new Set(uniqueIds);
      expect(uniqueSet.size).toBe(idCount);

      console.log(`生成 ${idCount} 个唯一ID耗时: ${duration}ms`);
    });
  });

  describe('内存使用和资源管理测试', () => {
    it('应该在大量操作后正确清理资源', async () => {
      const initialMemory = process.memoryUsage();

      // 执行大量操作
      const operationCount = 100;
      
      for (let i = 0; i < operationCount; i++) {
        const user = testUsers[i % testUsers.length];
        
        // 生成通行码
        const passcode = await PasscodeService.generatePasscode(user.id, 'employee');
        
        // 验证通行码
        await PasscodeService.validatePasscode(passcode.code, `device_${i}`);
        
        // 记录通行日志
        await AccessRecordService.recordAccess({
          userId: user.id,
          deviceId: `device_${i}`,
          direction: 'in',
          result: 'success',
          timestamp: new Date().toISOString()
        });
      }

      // 强制垃圾回收（如果可用）
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

      console.log(`执行 ${operationCount} 次操作后内存增长: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);
      
      // 内存增长应该在合理范围内（小于50MB）
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });

    it('应该正确处理数据库连接池', async () => {
      const concurrentQueries = 50;
      const startTime = Date.now();

      // 并发执行数据库查询
      const promises = Array.from({ length: concurrentQueries }, async (_, i) => {
        const user = testUsers[i % testUsers.length];
        
        // 混合不同类型的数据库操作
        if (i % 3 === 0) {
          return await PasscodeModel.findByUserId(user.id);
        } else if (i % 3 === 1) {
          return await AccessRecordModel.findByUserId(user.id);
        } else {
          return await UserModel.findById(user.id);
        }
      });

      const results = await Promise.all(promises);
      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(results).toHaveLength(concurrentQueries);
      expect(duration).toBeLessThan(3000); // 3秒内完成

      console.log(`${concurrentQueries} 个并发数据库查询耗时: ${duration}ms`);
    });
  });

  describe('压力测试', () => {
    it('应该在极高负载下保持稳定', async () => {
      const highLoadCount = 500;
      const batchSize = 50;
      const batches = Math.ceil(highLoadCount / batchSize);

      console.log(`开始压力测试: ${highLoadCount} 个操作，分 ${batches} 批执行`);

      const startTime = Date.now();
      let totalOperations = 0;

      for (let batch = 0; batch < batches; batch++) {
        const batchStartTime = Date.now();
        const currentBatchSize = Math.min(batchSize, highLoadCount - batch * batchSize);

        // 每批混合执行不同操作
        const batchPromises = Array.from({ length: currentBatchSize }, async (_, i) => {
          const globalIndex = batch * batchSize + i;
          const user = testUsers[globalIndex % testUsers.length];

          try {
            if (globalIndex % 4 === 0) {
              // 生成通行码
              return await PasscodeService.generatePasscode(user.id, 'employee');
            } else if (globalIndex % 4 === 1) {
              // 生成二维码
              return await PasscodeService.generateDynamicQRPasscode(user.id, 'employee');
            } else if (globalIndex % 4 === 2) {
              // 记录通行日志
              return await AccessRecordService.recordAccess({
                userId: user.id,
                deviceId: `stress_device_${globalIndex % 20}`,
                direction: globalIndex % 2 === 0 ? 'in' : 'out',
                result: 'success',
                timestamp: new Date().toISOString()
              });
            } else {
              // 查询操作
              return await AccessRecordService.getAccessRecords({
                userId: user.id,
                page: 1,
                limit: 10
              });
            }
          } catch (error) {
            console.error(`操作 ${globalIndex} 失败:`, error);
            throw error;
          }
        });

        const batchResults = await Promise.all(batchPromises);
        const batchEndTime = Date.now();
        const batchDuration = batchEndTime - batchStartTime;

        totalOperations += currentBatchSize;

        console.log(`批次 ${batch + 1}/${batches} 完成: ${currentBatchSize} 个操作耗时 ${batchDuration}ms`);

        // 验证批次结果
        expect(batchResults).toHaveLength(currentBatchSize);
        expect(batchDuration).toBeLessThan(10000); // 每批10秒内完成
      }

      const endTime = Date.now();
      const totalDuration = endTime - startTime;

      console.log(`压力测试完成: ${totalOperations} 个操作总耗时 ${totalDuration}ms`);
      console.log(`平均每个操作耗时: ${(totalDuration / totalOperations).toFixed(2)}ms`);

      expect(totalOperations).toBe(highLoadCount);
      expect(totalDuration).toBeLessThan(60000); // 总时间不超过60秒
    });
  });
});