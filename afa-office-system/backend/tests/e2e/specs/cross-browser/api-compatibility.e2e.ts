import { test, expect, Page, BrowserContext } from '@playwright/test';
import { getCrossBrowserTestConfig } from '../../config/cross-browser.config.js';

/**
 * API兼容性集成测试
 * 验证不同浏览器环境下前后端API交互的兼容性
 * 
 * 需求覆盖: 8.1, 8.2, 8.3, 8.4
 */

const config = getCrossBrowserTestConfig();

test.describe('API兼容性测试', () => {
  let context: BrowserContext;
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    context = await browser.newContext({
      permissions: ['downloads', 'notifications']
    });
    page = await context.newPage();
    
    // 监听网络请求
    page.on('request', request => {
      console.log(`请求: ${request.method()} ${request.url()}`);
    });
    
    page.on('response', response => {
      if (!response.ok()) {
        console.log(`响应错误: ${response.status()} ${response.url()}`);
      }
    });
  });

  test.afterEach(async () => {
    await context?.close();
  });

  test('应该验证基础API端点兼容性', async () => {
    // 测试所有配置的API端点
    for (const endpoint of config.apiCompatibility.testEndpoints) {
      const response = await page.request.get(endpoint);
      
      // 健康检查端点应该返回200
      if (endpoint.includes('/health')) {
        expect(response.ok()).toBe(true);
        
        const data = await response.json();
        expect(data).toHaveProperty('status');
      } else {
        // 其他端点可能需要认证，返回401是正常的
        expect([200, 401, 404].includes(response.status())).toBe(true);
      }
      
      // 验证响应头
      const headers = response.headers();
      expect(headers['content-type']).toContain('application/json');
      
      console.log(`端点 ${endpoint}: ${response.status()}`);
    }
  });

  test('应该验证HTTP方法兼容性', async () => {
    interface TestResult {
      method: string;
      status?: number;
      ok?: boolean;
      supported: boolean;
      error?: string;
    }
    
    const testResults: TestResult[] = [];
    
    for (const method of config.apiCompatibility.testMethods) {
      try {
        let response;
        
        switch (method) {
          case 'GET':
            response = await page.request.get('/api/v1/health');
            break;
          case 'POST':
            response = await page.request.post('/api/v1/auth/login', {
              data: { username: 'test', password: 'test' },
              headers: config.apiCompatibility.testHeaders
            });
            break;
          case 'PUT':
            response = await page.request.put('/api/v1/users/1', {
              data: { name: 'test' },
              headers: config.apiCompatibility.testHeaders
            });
            break;
          case 'DELETE':
            response = await page.request.delete('/api/v1/users/1', {
              headers: config.apiCompatibility.testHeaders
            });
            break;
        }
        
        testResults.push({
          method,
          status: response!.status(),
          ok: response!.ok(),
          supported: true
        });
        
      } catch (error: any) {
        testResults.push({
          method,
          error: error.message,
          supported: false
        });
      }
    }
    
    // 验证所有方法都得到了响应（即使是错误响应）
    expect(testResults.length).toBe(config.apiCompatibility.testMethods.length);
    
    // GET方法应该成功
    const getResult = testResults.find(r => r.method === 'GET');
    expect(getResult?.supported).toBe(true);
    expect(getResult?.ok).toBe(true);
    
    console.log('HTTP方法测试结果:', testResults);
  });

  test('应该验证请求头兼容性', async () => {
    const customHeaders = {
      'X-Custom-Header': 'test-value',
      'X-Request-ID': '12345',
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      ...config.apiCompatibility.testHeaders
    };
    
    const response = await page.request.get('/api/v1/health', {
      headers: customHeaders
    });
    
    expect(response.ok()).toBe(true);
    
    // 验证CORS头
    const responseHeaders = response.headers();
    expect(responseHeaders['access-control-allow-origin']).toBeDefined();
    expect(responseHeaders['access-control-allow-methods']).toBeDefined();
    expect(responseHeaders['access-control-allow-headers']).toBeDefined();
  });

  test('应该验证JSON数据传输兼容性', async () => {
    const testData = {
      string: 'test string',
      number: 12345,
      boolean: true,
      array: [1, 2, 3],
      object: { nested: 'value' },
      null: null,
      unicode: '测试中文字符',
      special: 'Special chars: !@#$%^&*()'
    };
    
    // 测试POST请求的JSON数据传输
    const response = await page.request.post('/api/v1/auth/login', {
      data: testData,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    // 即使认证失败，也应该能正确解析JSON
    expect([200, 400, 401].includes(response.status())).toBe(true);
    
    // 验证响应是有效的JSON
    try {
      const responseData = await response.json();
      expect(typeof responseData).toBe('object');
    } catch (error) {
      // 如果不是JSON响应，检查是否是预期的错误
      expect(response.status()).toBeGreaterThanOrEqual(400);
    }
  });

  test('应该验证文件上传兼容性', async () => {
    // 创建测试文件
    const testFileContent = 'This is a test file for cross-browser compatibility';
    const testFile = Buffer.from(testFileContent);
    
    try {
      const response = await page.request.post('/api/v1/files/upload', {
        multipart: {
          file: {
            name: 'test.txt',
            mimeType: 'text/plain',
            buffer: testFile
          },
          metadata: JSON.stringify({
            description: 'Cross-browser test file'
          })
        }
      });
      
      // 文件上传端点可能需要认证，401是预期的
      expect([200, 401, 404].includes(response.status())).toBe(true);
      
    } catch (error) {
      // 如果端点不存在，这也是可以接受的
      console.log('文件上传测试跳过，端点可能不存在:', error.message);
    }
  });

  test('应该验证WebSocket连接兼容性', async () => {
    await page.goto('/');
    
    const wsSupport = await page.evaluate(async () => {
      return new Promise<{
        supported: boolean;
        connected?: boolean;
        reason?: string;
      }>((resolve) => {
        try {
          // 测试WebSocket构造函数是否存在
          if (typeof WebSocket === 'undefined') {
            resolve({ supported: false, reason: 'WebSocket not available' });
            return;
          }
          
          // 尝试创建WebSocket连接
          const ws = new WebSocket('ws://localhost:5100/ws');
          
          const timeout = setTimeout(() => {
            ws.close();
            resolve({ 
              supported: true, 
              connected: false, 
              reason: 'Connection timeout' 
            });
          }, 3000);
          
          ws.onopen = () => {
            clearTimeout(timeout);
            ws.close();
            resolve({ 
              supported: true, 
              connected: true 
            });
          };
          
          ws.onerror = (error) => {
            clearTimeout(timeout);
            resolve({ 
              supported: true, 
              connected: false, 
              reason: 'Connection error' 
            });
          };
          
        } catch (error: any) {
          resolve({ 
            supported: false, 
            reason: error.message 
          });
        }
      });
    });
    
    expect(wsSupport.supported).toBe(true);
    console.log('WebSocket支持:', wsSupport);
  });

  test('应该验证Cookie和Session兼容性', async () => {
    // 测试设置和读取Cookie
    await page.goto('/');
    
    // 通过API设置Cookie
    const loginResponse = await page.request.post('/api/v1/auth/login', {
      data: {
        username: 'test@example.com',
        password: 'testpassword'
      }
    });
    
    // 检查响应中的Cookie设置
    const setCookieHeader = loginResponse.headers()['set-cookie'];
    if (setCookieHeader) {
      console.log('服务器设置的Cookie:', setCookieHeader);
    }
    
    // 在浏览器中测试Cookie操作
    const cookieSupport = await page.evaluate(() => {
      const testCookieName = 'cross-browser-test';
      const testCookieValue = 'test-value-' + Date.now();
      
      // 设置Cookie
      document.cookie = `${testCookieName}=${testCookieValue}; path=/`;
      
      // 读取Cookie
      const cookies = document.cookie;
      const cookieExists = cookies.includes(testCookieName);
      
      // 清理Cookie
      document.cookie = `${testCookieName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
      
      return {
        canSetCookie: cookieExists,
        cookieString: cookies,
        cookieEnabled: navigator.cookieEnabled
      };
    });
    
    expect(cookieSupport.cookieEnabled).toBe(true);
    expect(cookieSupport.canSetCookie).toBe(true);
  });

  test('应该验证CORS预检请求兼容性', async () => {
    // 测试CORS预检请求
    const optionsResponse = await page.request.fetch('/api/v1/users', {
      method: 'OPTIONS',
      headers: {
        'Origin': 'http://localhost:5100',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type, Authorization'
      }
    });
    
    const headers = optionsResponse.headers();
    
    // 验证CORS响应头
    expect(headers['access-control-allow-origin']).toBeDefined();
    expect(headers['access-control-allow-methods']).toBeDefined();
    expect(headers['access-control-allow-headers']).toBeDefined();
    
    console.log('CORS预检响应头:', {
      origin: headers['access-control-allow-origin'],
      methods: headers['access-control-allow-methods'],
      headers: headers['access-control-allow-headers']
    });
  });

  test('应该验证错误响应格式兼容性', async () => {
    // 测试各种错误情况的响应格式
    const errorTests = [
      { endpoint: '/api/v1/nonexistent', expectedStatus: 404 },
      { endpoint: '/api/v1/users', method: 'POST', expectedStatus: 401 },
      { endpoint: '/api/v1/auth/login', method: 'POST', data: {}, expectedStatus: 400 }
    ];
    
    for (const test of errorTests) {
      let response;
      
      if (test.method === 'POST') {
        response = await page.request.post(test.endpoint, {
          data: test.data || {}
        });
      } else {
        response = await page.request.get(test.endpoint);
      }
      
      expect(response.status()).toBe(test.expectedStatus);
      
      // 验证错误响应格式
      try {
        const errorData = await response.json();
        expect(errorData).toHaveProperty('success', false);
        expect(errorData).toHaveProperty('message');
        
      } catch (error) {
        // 某些错误可能不返回JSON，这也是可以接受的
        console.log(`端点 ${test.endpoint} 返回非JSON错误响应`);
      }
    }
  });

  test('应该验证请求超时处理兼容性', async () => {
    await page.goto('/');
    
    const timeoutTest = await page.evaluate(async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1000);
      
      try {
        const response = await fetch('/api/v1/health', {
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        return {
          success: true,
          status: response.status,
          abortSupported: true
        };
        
      } catch (error) {
        clearTimeout(timeoutId);
        return {
          success: false,
          error: error.name,
          abortSupported: error.name === 'AbortError'
        };
      }
    });
    
    // 验证AbortController支持
    if (timeoutTest.success) {
      expect(timeoutTest.status).toBe(200);
    } else {
      // 如果请求被中止，应该是AbortError
      expect(timeoutTest.abortSupported).toBe(true);
    }
    
    console.log('超时处理测试:', timeoutTest);
  });
});

test.describe('浏览器特定API兼容性', () => {
  test('应该验证现代JavaScript特性支持', async ({ page }) => {
    await page.goto('/');
    
    const jsFeatures = await page.evaluate(() => {
      const features = {
        es6Classes: false,
        arrowFunctions: false,
        asyncAwait: false,
        promises: false,
        destructuring: false,
        templateLiterals: false,
        modules: false,
        fetch: false,
        proxy: false,
        symbols: false
      };
      
      try {
        // 测试ES6类
        eval('class TestClass {}');
        features.es6Classes = true;
      } catch (e) {}
      
      try {
        // 测试箭头函数
        eval('const arrow = () => {}');
        features.arrowFunctions = true;
      } catch (e) {}
      
      try {
        // 测试async/await
        eval('async function test() { await Promise.resolve(); }');
        features.asyncAwait = true;
      } catch (e) {}
      
      // 测试Promise
      features.promises = typeof Promise !== 'undefined';
      
      try {
        // 测试解构赋值
        eval('const {a} = {a: 1}');
        features.destructuring = true;
      } catch (e) {}
      
      try {
        // 测试模板字符串
        eval('const template = `test ${1}`');
        features.templateLiterals = true;
      } catch (e) {}
      
      // 测试Fetch API
      features.fetch = typeof fetch !== 'undefined';
      
      // 测试Proxy
      features.proxy = typeof Proxy !== 'undefined';
      
      // 测试Symbol
      features.symbols = typeof Symbol !== 'undefined';
      
      return features;
    });
    
    // 验证关键特性支持
    expect(jsFeatures.promises).toBe(true);
    expect(jsFeatures.fetch).toBe(true);
    
    console.log('JavaScript特性支持:', jsFeatures);
  });
});
