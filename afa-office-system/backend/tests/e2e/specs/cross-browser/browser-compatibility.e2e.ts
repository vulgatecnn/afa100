import { test, expect, Page, BrowserContext } from '@playwright/test';
import { getCrossBrowserTestConfig } from '../../config/cross-browser.config.js';

/**
 * 浏览器兼容性集成测试
 * 验证不同浏览器的前后端API兼容性和功能一致性
 * 
 * 需求覆盖: 8.1, 8.2, 8.3, 8.4
 */

const config = getCrossBrowserTestConfig();

test.describe('浏览器兼容性测试', () => {
  let context: BrowserContext;
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    // 为每个测试创建新的浏览器上下文
    context = await browser.newContext({
      permissions: ['downloads', 'notifications', 'geolocation']
    });
    page = await context.newPage();
    
    // 监听控制台错误
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.error(`浏览器控制台错误: ${msg.text()}`);
      }
    });
    
    // 监听页面错误
    page.on('pageerror', error => {
      console.error(`页面错误: ${error.message}`);
    });
  });

  test.afterEach(async () => {
    await context?.close();
  });

  test('应该检测浏览器基础特性支持', async () => {
    // 导航到前端应用
    await page.goto('/');
    
    // 检测浏览器特性
    const features = await page.evaluate(() => {
      return {
        localStorage: typeof Storage !== 'undefined' && !!window.localStorage,
        sessionStorage: typeof Storage !== 'undefined' && !!window.sessionStorage,
        indexedDB: !!window.indexedDB,
        webgl: (() => {
          try {
            const canvas = document.createElement('canvas');
            return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
          } catch (e) {
            return false;
          }
        })(),
        websockets: !!window.WebSocket,
        serviceWorker: 'serviceWorker' in navigator,
        geolocation: 'geolocation' in navigator,
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language
      };
    });

    // 验证关键特性支持
    expect(features.localStorage).toBe(true);
    expect(features.sessionStorage).toBe(true);
    expect(features.websockets).toBe(true);
    
    console.log(`浏览器特性检测结果:`, features);
  });

  test('应该验证API请求兼容性', async () => {
    // 测试健康检查API
    const healthResponse = await page.request.get('/api/v1/health');
    expect(healthResponse.ok()).toBe(true);
    
    const healthData = await healthResponse.json();
    expect(healthData).toHaveProperty('status', 'ok');

    // 测试CORS支持
    const corsHeaders = healthResponse.headers();
    expect(corsHeaders['access-control-allow-origin']).toBeDefined();
    
    // 测试不同HTTP方法的支持
    for (const method of config.apiCompatibility.testMethods) {
      if (method === 'GET') {
        const response = await page.request.get('/api/v1/health');
        expect(response.ok()).toBe(true);
      } else if (method === 'POST') {
        // 测试POST请求（需要认证的端点会返回401，这是预期的）
        const response = await page.request.post('/api/v1/auth/login', {
          data: { username: 'test', password: 'test' }
        });
        // 401或200都是有效响应，说明服务器正确处理了请求
        expect([200, 401, 400].includes(response.status())).toBe(true);
      }
    }
  });

  test('应该验证JavaScript API兼容性', async () => {
    await page.goto('/');
    
    // 测试Fetch API支持
    const fetchSupport = await page.evaluate(async () => {
      try {
        const response = await fetch('/api/v1/health');
        return {
          supported: true,
          status: response.status,
          ok: response.ok
        };
      } catch (error) {
        return {
          supported: false,
          error: error.message
        };
      }
    });
    
    expect(fetchSupport.supported).toBe(true);
    expect(fetchSupport.ok).toBe(true);

    // 测试XMLHttpRequest支持（作为Fetch的备选）
    const xhrSupport = await page.evaluate(() => {
      return new Promise<{
        supported: boolean;
        status?: number;
        ok?: boolean;
        error?: string;
      }>((resolve) => {
        try {
          const xhr = new XMLHttpRequest();
          xhr.open('GET', '/api/v1/health');
          xhr.onload = () => {
            resolve({
              supported: true,
              status: xhr.status,
              ok: xhr.status >= 200 && xhr.status < 300
            });
          };
          xhr.onerror = () => {
            resolve({
              supported: false,
              error: 'XHR request failed'
            });
          };
          xhr.send();
        } catch (error: any) {
          resolve({
            supported: false,
            error: error.message
          });
        }
      });
    });
    
    expect(xhrSupport.supported).toBe(true);
  });

  test('应该验证CSS和布局兼容性', async () => {
    await page.goto('/');
    
    // 等待页面加载完成
    await page.waitForLoadState('networkidle');
    
    // 检查CSS Grid支持
    const cssSupport = await page.evaluate(() => {
      const testElement = document.createElement('div');
      testElement.style.display = 'grid';
      document.body.appendChild(testElement);
      
      const computedStyle = window.getComputedStyle(testElement);
      const gridSupport = computedStyle.display === 'grid';
      
      document.body.removeChild(testElement);
      
      return {
        grid: gridSupport,
        flexbox: CSS.supports('display', 'flex'),
        customProperties: CSS.supports('--custom-property', 'value'),
        transforms: CSS.supports('transform', 'translateX(1px)'),
        transitions: CSS.supports('transition', 'all 1s ease')
      };
    });

    // 验证现代CSS特性支持
    expect(cssSupport.flexbox).toBe(true);
    expect(cssSupport.transforms).toBe(true);
    expect(cssSupport.transitions).toBe(true);
    
    console.log(`CSS特性支持:`, cssSupport);
  });

  test('应该验证表单和输入兼容性', async () => {
    await page.goto('/');
    
    // 创建测试表单
    await page.evaluate(() => {
      const form = document.createElement('form');
      form.innerHTML = `
        <input type="text" name="text" required>
        <input type="email" name="email" required>
        <input type="password" name="password" required>
        <input type="number" name="number" min="0" max="100">
        <input type="date" name="date">
        <input type="file" name="file" accept=".jpg,.png">
        <select name="select">
          <option value="1">选项1</option>
          <option value="2">选项2</option>
        </select>
        <textarea name="textarea"></textarea>
        <button type="submit">提交</button>
      `;
      form.id = 'test-form';
      document.body.appendChild(form);
    });

    // 测试表单验证
    const validationSupport = await page.evaluate(() => {
      const form = document.getElementById('test-form') as HTMLFormElement;
      const textInput = form.querySelector('input[type="text"]') as HTMLInputElement;
      const emailInput = form.querySelector('input[type="email"]') as HTMLInputElement;
      
      // 测试HTML5验证
      textInput.value = '';
      emailInput.value = 'invalid-email';
      
      return {
        html5Validation: typeof textInput.checkValidity === 'function',
        textValid: textInput.checkValidity(),
        emailValid: emailInput.checkValidity(),
        formValid: form.checkValidity()
      };
    });

    expect(validationSupport.html5Validation).toBe(true);
    expect(validationSupport.textValid).toBe(false); // 空值应该无效
    expect(validationSupport.emailValid).toBe(false); // 无效邮箱应该无效
    
    // 清理测试表单
    await page.evaluate(() => {
      const form = document.getElementById('test-form');
      if (form) {
        form.remove();
      }
    });
  });

  test('应该验证事件处理兼容性', async () => {
    await page.goto('/');
    
    // 测试事件监听器
    const eventSupport = await page.evaluate(() => {
      let clickTriggered = false;
      let touchTriggered = false;
      let keyTriggered = false;
      
      const testElement = document.createElement('div');
      testElement.style.width = '100px';
      testElement.style.height = '100px';
      testElement.style.backgroundColor = 'red';
      testElement.tabIndex = 0;
      document.body.appendChild(testElement);
      
      // 添加事件监听器
      testElement.addEventListener('click', () => {
        clickTriggered = true;
      });
      
      testElement.addEventListener('touchstart', () => {
        touchTriggered = true;
      });
      
      testElement.addEventListener('keydown', () => {
        keyTriggered = true;
      });
      
      // 触发点击事件
      testElement.click();
      
      // 触发键盘事件
      const keyEvent = new KeyboardEvent('keydown', { key: 'Enter' });
      testElement.dispatchEvent(keyEvent);
      
      // 尝试触发触摸事件（在非触摸设备上可能不会触发）
      try {
        const touchEvent = new TouchEvent('touchstart', {
          touches: [new Touch({
            identifier: 1,
            target: testElement,
            clientX: 50,
            clientY: 50
          })]
        });
        testElement.dispatchEvent(touchEvent);
      } catch (e) {
        // 某些浏览器可能不支持Touch构造函数
      }
      
      document.body.removeChild(testElement);
      
      return {
        click: clickTriggered,
        keyboard: keyTriggered,
        touch: touchTriggered,
        addEventListener: typeof testElement.addEventListener === 'function',
        removeEventListener: typeof testElement.removeEventListener === 'function'
      };
    });

    expect(eventSupport.addEventListener).toBe(true);
    expect(eventSupport.removeEventListener).toBe(true);
    expect(eventSupport.click).toBe(true);
    expect(eventSupport.keyboard).toBe(true);
    
    console.log(`事件处理支持:`, eventSupport);
  });

  test('应该验证网络请求错误处理', async () => {
    await page.goto('/');
    
    // 测试网络错误处理
    const errorHandling = await page.evaluate(async () => {
      const results = {
        fetch404: false,
        fetch500: false,
        fetchTimeout: false,
        fetchNetworkError: false
      };
      
      try {
        // 测试404错误
        const response404 = await fetch('/api/v1/nonexistent');
        results.fetch404 = response404.status === 404;
      } catch (e) {
        results.fetch404 = true; // 网络错误也算正确处理
      }
      
      try {
        // 测试无效URL（应该抛出网络错误）
        await fetch('http://invalid-domain-that-does-not-exist.com');
      } catch (e) {
        results.fetchNetworkError = true;
      }
      
      return results;
    });

    expect(errorHandling.fetch404).toBe(true);
    expect(errorHandling.fetchNetworkError).toBe(true);
  });

  test('应该验证浏览器存储兼容性', async () => {
    await page.goto('/');
    
    const storageSupport = await page.evaluate(() => {
      const testKey = 'cross-browser-test';
      const testValue = JSON.stringify({ test: true, timestamp: Date.now() });
      
      const results = {
        localStorage: false,
        sessionStorage: false,
        cookies: false
      };
      
      // 测试localStorage
      try {
        localStorage.setItem(testKey, testValue);
        const retrieved = localStorage.getItem(testKey);
        results.localStorage = retrieved === testValue;
        localStorage.removeItem(testKey);
      } catch (e) {
        results.localStorage = false;
      }
      
      // 测试sessionStorage
      try {
        sessionStorage.setItem(testKey, testValue);
        const retrieved = sessionStorage.getItem(testKey);
        results.sessionStorage = retrieved === testValue;
        sessionStorage.removeItem(testKey);
      } catch (e) {
        results.sessionStorage = false;
      }
      
      // 测试cookies
      try {
        document.cookie = `${testKey}=${testValue}; path=/`;
        results.cookies = document.cookie.includes(testKey);
        // 清理cookie
        document.cookie = `${testKey}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
      } catch (e) {
        results.cookies = false;
      }
      
      return results;
    });

    expect(storageSupport.localStorage).toBe(true);
    expect(storageSupport.sessionStorage).toBe(true);
    expect(storageSupport.cookies).toBe(true);
  });
});

test.describe('浏览器特定功能测试', () => {
  test('应该检测浏览器类型和版本', async ({ page, browserName }) => {
    await page.goto('/');
    
    const browserInfo = await page.evaluate(() => {
      const ua = navigator.userAgent;
      return {
        userAgent: ua,
        isChrome: ua.includes('Chrome') && !ua.includes('Edg'),
        isFirefox: ua.includes('Firefox'),
        isSafari: ua.includes('Safari') && !ua.includes('Chrome'),
        isEdge: ua.includes('Edg'),
        platform: navigator.platform,
        language: navigator.language,
        cookieEnabled: navigator.cookieEnabled,
        onLine: navigator.onLine
      };
    });

    // 验证浏览器信息获取成功
    expect(browserInfo.userAgent).toBeTruthy();
    expect(browserInfo.cookieEnabled).toBe(true);
    expect(browserInfo.onLine).toBe(true);
    
    console.log(`浏览器信息 (${browserName}):`, browserInfo);
    
    // 根据Playwright的browserName验证检测结果
    switch (browserName) {
      case 'chromium':
        expect(browserInfo.isChrome || browserInfo.isEdge).toBe(true);
        break;
      case 'firefox':
        expect(browserInfo.isFirefox).toBe(true);
        break;
      case 'webkit':
        expect(browserInfo.isSafari).toBe(true);
        break;
    }
  });

  test('应该测试浏览器性能API', async ({ page }) => {
    await page.goto('/');
    
    const performanceSupport = await page.evaluate(() => {
      return {
        performance: !!window.performance,
        performanceNow: typeof performance?.now === 'function',
        performanceTiming: !!performance?.timing,
        performanceNavigation: !!performance?.navigation,
        performanceObserver: typeof PerformanceObserver !== 'undefined',
        requestAnimationFrame: typeof requestAnimationFrame === 'function',
        cancelAnimationFrame: typeof cancelAnimationFrame === 'function'
      };
    });

    expect(performanceSupport.performance).toBe(true);
    expect(performanceSupport.performanceNow).toBe(true);
    expect(performanceSupport.requestAnimationFrame).toBe(true);
    
    console.log(`性能API支持:`, performanceSupport);
  });
});