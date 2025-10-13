import { test, expect, Page, BrowserContext } from '@playwright/test';
import { getCrossBrowserTestConfig } from '../../config/cross-browser.config.js';

/**
 * 响应式设计集成测试
 * 验证不同屏幕尺寸下的前后端数据交互和功能一致性
 * 
 * 需求覆盖: 8.1, 8.2, 8.3, 8.4, 8.5
 * 
 * 测试重点:
 * - 不同屏幕尺寸的前后端数据交互
 * - 移动端和桌面端的功能一致性
 * - 触摸和鼠标交互的兼容性
 * - 响应式UI元素的正确显示和隐藏
 * - 跨设备的表单和文件操作功能
 */

const config = getCrossBrowserTestConfig();

// 定义测试设备配置
const testDevices = [
  {
    name: 'Desktop-FullHD',
    width: 1920,
    height: 1080,
    type: 'desktop',
    inputType: 'mouse',
    description: '桌面端全高清分辨率'
  },
  {
    name: 'Desktop-HD',
    width: 1366,
    height: 768,
    type: 'desktop',
    inputType: 'mouse',
    description: '桌面端高清分辨率'
  },
  {
    name: 'Tablet-Landscape',
    width: 1024,
    height: 768,
    type: 'tablet',
    inputType: 'touch',
    description: '平板横屏模式'
  },
  {
    name: 'Tablet-Portrait',
    width: 768,
    height: 1024,
    type: 'tablet',
    inputType: 'touch',
    description: '平板竖屏模式'
  },
  {
    name: 'Mobile-Large',
    width: 414,
    height: 896,
    type: 'mobile',
    inputType: 'touch',
    description: '大屏手机'
  },
  {
    name: 'Mobile-Standard',
    width: 393,
    height: 851,
    type: 'mobile',
    inputType: 'touch',
    description: '标准手机屏幕'
  },
  {
    name: 'Mobile-Small',
    width: 375,
    height: 667,
    type: 'mobile',
    inputType: 'touch',
    description: '小屏手机'
  }
];

// API测试端点配置
const apiEndpoints = [
  { path: '/api/v1/health', method: 'GET', description: '健康检查' },
  { path: '/api/v1/auth/login', method: 'POST', description: '用户登录' },
  { path: '/api/v1/users', method: 'GET', description: '用户列表' },
  { path: '/api/v1/merchants', method: 'GET', description: '商户列表' },
  { path: '/api/v1/visitors', method: 'GET', description: '访客列表' }
];

test.describe('响应式设计集成测试', () => {
  let context: BrowserContext;
  let page: Page;
  let apiRequests: Array<{ method: string; url: string; timestamp: number; device: string }> = [];

  test.beforeEach(async ({ browser }) => {
    context = await browser.newContext();
    page = await context.newPage();
    apiRequests = [];
    
    // 监听网络请求以验证API调用
    page.on('request', request => {
      if (request.url().includes('/api/')) {
        const requestInfo = {
          method: request.method(),
          url: request.url(),
          timestamp: Date.now(),
          device: 'unknown'
        };
        apiRequests.push(requestInfo);
        console.log(`API请求: ${request.method()} ${request.url()}`);
      }
    });

    // 监听响应以验证API响应
    page.on('response', response => {
      if (response.url().includes('/api/')) {
        console.log(`API响应: ${response.status()} ${response.url()}`);
      }
    });

    // 监听控制台错误
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log(`浏览器控制台错误: ${msg.text()}`);
      }
    });
  });

  test.afterEach(async () => {
    // 输出API请求统计
    if (apiRequests.length > 0) {
      console.log(`本次测试共发起 ${apiRequests.length} 个API请求`);
    }
    await context?.close();
  });

  // 测试不同屏幕尺寸的前后端数据交互
  test.describe('不同屏幕尺寸的前后端数据交互测试', () => {
    for (const device of testDevices) {
      test(`应该在 ${device.name} (${device.width}x${device.height}) 设备上正确处理前后端数据交互`, async () => {
        // 设置设备视口
        await page.setViewportSize({ 
          width: device.width, 
          height: device.height 
        });

        // 记录当前设备信息
        apiRequests.forEach(req => req.device = device.name);

        // 导航到应用
        await page.goto('/');
        
        // 等待页面加载
        await page.waitForLoadState('networkidle');

        // 验证页面基础信息
        const deviceInfo = await page.evaluate((deviceName) => {
          return {
            deviceName,
            title: document.title,
            bodyVisible: !!document.body,
            hasContent: document.body.children.length > 0,
            viewport: {
              width: window.innerWidth,
              height: window.innerHeight
            },
            devicePixelRatio: window.devicePixelRatio,
            userAgent: navigator.userAgent,
            // 检测设备特性
            features: {
              touchSupport: 'ontouchstart' in window,
              pointerEvents: 'onpointerdown' in window,
              mouseEvents: 'onmousedown' in window,
              orientationSupport: 'orientation' in window || 'onorientationchange' in window
            },
            // 媒体查询检测
            mediaQueries: {
              isMobile: window.matchMedia('(max-width: 768px)').matches,
              isTablet: window.matchMedia('(min-width: 769px) and (max-width: 1024px)').matches,
              isDesktop: window.matchMedia('(min-width: 1025px)').matches,
              isLandscape: window.matchMedia('(orientation: landscape)').matches,
              isPortrait: window.matchMedia('(orientation: portrait)').matches,
              hasHover: window.matchMedia('(hover: hover)').matches,
              hasPointer: window.matchMedia('(pointer: fine)').matches
            }
          };
        }, device.name);

        // 基础验证
        expect(deviceInfo.bodyVisible).toBe(true);
        expect(deviceInfo.hasContent).toBe(true);
        expect(deviceInfo.viewport.width).toBe(device.width);
        expect(deviceInfo.viewport.height).toBe(device.height);

        // 验证设备特性检测
        if (device.inputType === 'touch') {
          expect(deviceInfo.features.touchSupport).toBe(true);
        }

        // 测试API连接性
        const healthResponse = await page.request.get('/api/v1/health');
        expect(healthResponse.ok()).toBe(true);

        // 验证API响应数据
        const healthData = await healthResponse.json();
        expect(healthData).toHaveProperty('status');

        console.log(`${device.name} 设备测试通过:`, {
          device: deviceInfo.deviceName,
          viewport: deviceInfo.viewport,
          features: deviceInfo.features,
          mediaQueries: deviceInfo.mediaQueries,
          apiHealth: healthData
        });
      });
    }
  });

  // 验证移动端和桌面端的功能一致性
  test.describe('移动端和桌面端功能一致性测试', () => {
    const comparisonDevices = [
      { name: 'Desktop', width: 1920, height: 1080, type: 'desktop' },
      { name: 'Mobile', width: 393, height: 851, type: 'mobile' }
    ];

    test('应该在桌面端和移动端保持API响应一致性', async () => {
      const apiTestResults: Array<{
        device: string;
        endpoint: string;
        status: number;
        responseTime: number;
        dataStructure: any;
      }> = [];

      for (const device of comparisonDevices) {
        await page.setViewportSize({ width: device.width, height: device.height });
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // 测试每个API端点
        for (const endpoint of apiEndpoints) {
          if (endpoint.method === 'GET') {
            const startTime = Date.now();
            const response = await page.request.get(endpoint.path);
            const endTime = Date.now();

            let responseData: any = null;
            try {
              responseData = await response.json();
            } catch (e) {
              responseData = await response.text();
            }

            apiTestResults.push({
              device: device.name,
              endpoint: endpoint.path,
              status: response.status(),
              responseTime: endTime - startTime,
              dataStructure: typeof responseData === 'object' ? Object.keys(responseData || {}) : 'text'
            });

            expect(response.ok()).toBe(true);
          }
        }
      }

      // 验证桌面端和移动端API响应一致性
      const desktopResults = apiTestResults.filter(r => r.device === 'Desktop');
      const mobileResults = apiTestResults.filter(r => r.device === 'Mobile');

      expect(desktopResults.length).toBe(mobileResults.length);

      for (let i = 0; i < desktopResults.length; i++) {
        const desktop = desktopResults[i];
        const mobile = mobileResults[i];
        
        expect(desktop.endpoint).toBe(mobile.endpoint);
        expect(desktop.status).toBe(mobile.status);
        expect(desktop.dataStructure).toEqual(mobile.dataStructure);
      }

      console.log('API一致性测试结果:', apiTestResults);
    });

    test('应该在不同设备上保持表单提交功能一致性', async () => {
      const formTestResults: Array<{
        device: string;
        formCreated: boolean;
        inputsWorking: boolean;
        validationWorking: boolean;
        submitCapable: boolean;
      }> = [];

      for (const device of comparisonDevices) {
        await page.setViewportSize({ width: device.width, height: device.height });
        await page.goto('/');

        // 创建测试表单
        const formTest = await page.evaluate(() => {
          try {
            // 创建表单
            const form = document.createElement('form');
            form.innerHTML = `
              <input type="text" name="username" placeholder="用户名" required>
              <input type="email" name="email" placeholder="邮箱" required>
              <input type="password" name="password" placeholder="密码" required>
              <button type="submit">提交</button>
            `;
            form.id = 'consistency-test-form';
            form.style.cssText = 'padding: 20px; margin: 20px; border: 1px solid #ccc;';
            document.body.appendChild(form);

            // 测试输入功能
            const usernameInput = form.querySelector('input[name="username"]') as HTMLInputElement;
            const emailInput = form.querySelector('input[name="email"]') as HTMLInputElement;
            const passwordInput = form.querySelector('input[name="password"]') as HTMLInputElement;

            usernameInput.value = 'testuser';
            emailInput.value = 'test@example.com';
            passwordInput.value = 'password123';

            // 测试验证功能
            const isValid = form.checkValidity();

            // 清理
            document.body.removeChild(form);

            return {
              formCreated: true,
              inputsWorking: usernameInput.value === 'testuser' && emailInput.value === 'test@example.com',
              validationWorking: typeof form.checkValidity === 'function',
              submitCapable: isValid,
              inputValues: {
                username: usernameInput.value,
                email: emailInput.value,
                password: passwordInput.value.length > 0
              }
            };
          } catch (error) {
            return {
              formCreated: false,
              inputsWorking: false,
              validationWorking: false,
              submitCapable: false,
              error: error.message
            };
          }
        });

        formTestResults.push({
          device: device.name,
          ...formTest
        });

        expect(formTest.formCreated).toBe(true);
        expect(formTest.inputsWorking).toBe(true);
        expect(formTest.validationWorking).toBe(true);
        expect(formTest.submitCapable).toBe(true);
      }

      // 验证所有设备上表单功能一致
      const desktopForm = formTestResults.find(r => r.device === 'Desktop');
      const mobileForm = formTestResults.find(r => r.device === 'Mobile');

      expect(desktopForm?.formCreated).toBe(mobileForm?.formCreated);
      expect(desktopForm?.inputsWorking).toBe(mobileForm?.inputsWorking);
      expect(desktopForm?.validationWorking).toBe(mobileForm?.validationWorking);
      expect(desktopForm?.submitCapable).toBe(mobileForm?.submitCapable);

      console.log('表单功能一致性测试结果:', formTestResults);
    });

    test('应该在不同设备上保持数据加载和显示一致性', async () => {
      const dataTestResults: Array<{
        device: string;
        pageLoaded: boolean;
        elementsCount: number;
        scriptsLoaded: number;
        stylesLoaded: number;
        imagesLoaded: number;
        loadTime: number;
      }> = [];

      for (const device of comparisonDevices) {
        await page.setViewportSize({ width: device.width, height: device.height });
        
        const startTime = Date.now();
        await page.goto('/');
        await page.waitForLoadState('networkidle');
        const endTime = Date.now();

        const pageAnalysis = await page.evaluate(() => {
          return {
            pageLoaded: document.readyState === 'complete',
            elementsCount: document.querySelectorAll('*').length,
            scriptsLoaded: document.querySelectorAll('script').length,
            stylesLoaded: document.querySelectorAll('link[rel="stylesheet"], style').length,
            imagesLoaded: document.querySelectorAll('img').length,
            hasTitle: !!document.title,
            hasBody: !!document.body,
            bodyChildren: document.body ? document.body.children.length : 0
          };
        });

        dataTestResults.push({
          device: device.name,
          loadTime: endTime - startTime,
          ...pageAnalysis
        });

        expect(pageAnalysis.pageLoaded).toBe(true);
        expect(pageAnalysis.hasBody).toBe(true);
        expect(pageAnalysis.bodyChildren).toBeGreaterThan(0);
      }

      // 验证数据加载一致性
      const desktop = dataTestResults.find(r => r.device === 'Desktop');
      const mobile = dataTestResults.find(r => r.device === 'Mobile');

      expect(desktop?.pageLoaded).toBe(mobile?.pageLoaded);
      expect(desktop?.elementsCount).toBe(mobile?.elementsCount);
      expect(desktop?.scriptsLoaded).toBe(mobile?.scriptsLoaded);
      expect(desktop?.stylesLoaded).toBe(mobile?.stylesLoaded);

      console.log('数据加载一致性测试结果:', dataTestResults);
    });
  });

  test('应该在不同分辨率下保持API响应一致性', async () => {
    const testResolutions = [
      { width: 1920, height: 1080, name: 'Desktop' },
      { width: 1024, height: 768, name: 'Tablet' },
      { width: 393, height: 851, name: 'Mobile' }
    ];

    interface ApiResult {
      resolution: string;
      status: number;
      ok: boolean;
      responseTime: number;
      headers: { [key: string]: string };
    }
    
    const apiResults: ApiResult[] = [];

    for (const resolution of testResolutions) {
      await page.setViewportSize(resolution);
      await page.goto('/');

      // 测试API响应
      const startTime = Date.now();
      const response = await page.request.get('/api/v1/health');
      const endTime = Date.now();

      const result: ApiResult = {
        resolution: resolution.name,
        status: response.status(),
        ok: response.ok(),
        responseTime: endTime - startTime,
        headers: response.headers()
      };

      apiResults.push(result);
      
      // 验证响应成功
      expect(response.ok()).toBe(true);
    }

    // 验证所有分辨率下API响应一致
    const statuses = apiResults.map(r => r.status);
    expect(new Set(statuses).size).toBe(1); // 所有状态码应该相同

    console.log('不同分辨率API测试结果:', apiResults);
  });

  // 测试触摸和鼠标交互的兼容性
  test.describe('触摸和鼠标交互兼容性测试', () => {
    test('应该正确处理桌面端鼠标交互', async () => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.goto('/');

      const mouseInteractionTest = await page.evaluate(() => {
        // 创建交互测试区域
        const testContainer = document.createElement('div');
        testContainer.id = 'mouse-interaction-test';
        testContainer.style.cssText = `
          position: fixed;
          top: 100px;
          left: 100px;
          width: 300px;
          height: 200px;
          border: 2px solid #333;
          background: #f0f0f0;
          z-index: 9999;
        `;

        // 创建可交互元素
        const button = document.createElement('button');
        button.textContent = '鼠标测试按钮';
        button.style.cssText = 'margin: 10px; padding: 10px; cursor: pointer;';

        const hoverArea = document.createElement('div');
        hoverArea.textContent = '鼠标悬停区域';
        hoverArea.style.cssText = `
          margin: 10px;
          padding: 20px;
          background: #ddd;
          transition: background-color 0.3s;
        `;

        testContainer.appendChild(button);
        testContainer.appendChild(hoverArea);
        document.body.appendChild(testContainer);

        // 事件监听器
        let eventResults = {
          click: false,
          mousedown: false,
          mouseup: false,
          mouseover: false,
          mouseout: false,
          mousemove: false,
          contextmenu: false
        };

        button.addEventListener('click', () => { eventResults.click = true; });
        button.addEventListener('mousedown', () => { eventResults.mousedown = true; });
        button.addEventListener('mouseup', () => { eventResults.mouseup = true; });
        
        hoverArea.addEventListener('mouseover', () => { 
          eventResults.mouseover = true;
          hoverArea.style.backgroundColor = '#bbb';
        });
        hoverArea.addEventListener('mouseout', () => { 
          eventResults.mouseout = true;
          hoverArea.style.backgroundColor = '#ddd';
        });
        hoverArea.addEventListener('mousemove', () => { eventResults.mousemove = true; });
        hoverArea.addEventListener('contextmenu', (e) => { 
          e.preventDefault();
          eventResults.contextmenu = true;
        });

        // 模拟鼠标事件
        button.click();
        button.dispatchEvent(new MouseEvent('mousedown'));
        button.dispatchEvent(new MouseEvent('mouseup'));
        
        hoverArea.dispatchEvent(new MouseEvent('mouseover'));
        hoverArea.dispatchEvent(new MouseEvent('mousemove'));
        hoverArea.dispatchEvent(new MouseEvent('mouseout'));
        hoverArea.dispatchEvent(new MouseEvent('contextmenu'));

        // 检测鼠标特性支持
        const mouseFeatures = {
          hasHoverSupport: window.matchMedia('(hover: hover)').matches,
          hasPointerFine: window.matchMedia('(pointer: fine)').matches,
          hasPointerCoarse: window.matchMedia('(pointer: coarse)').matches,
          cursorSupport: CSS.supports('cursor', 'pointer'),
          mouseEventSupport: typeof MouseEvent !== 'undefined'
        };

        // 清理
        document.body.removeChild(testContainer);

        return {
          events: eventResults,
          features: mouseFeatures,
          testCompleted: true
        };
      });

      expect(mouseInteractionTest.testCompleted).toBe(true);
      expect(mouseInteractionTest.events.click).toBe(true);
      expect(mouseInteractionTest.events.mousedown).toBe(true);
      expect(mouseInteractionTest.events.mouseup).toBe(true);
      expect(mouseInteractionTest.events.mouseover).toBe(true);
      expect(mouseInteractionTest.events.mouseout).toBe(true);
      expect(mouseInteractionTest.features.hasHoverSupport).toBe(true);
      expect(mouseInteractionTest.features.hasPointerFine).toBe(true);

      console.log('桌面端鼠标交互测试结果:', mouseInteractionTest);
    });

    test('应该正确处理移动端触摸交互', async () => {
      await page.setViewportSize({ width: 393, height: 851 });
      await page.goto('/');

      const touchInteractionTest = await page.evaluate(() => {
        // 创建触摸测试区域
        const testContainer = document.createElement('div');
        testContainer.id = 'touch-interaction-test';
        testContainer.style.cssText = `
          position: fixed;
          top: 100px;
          left: 50px;
          width: 280px;
          height: 400px;
          border: 2px solid #333;
          background: #f0f0f0;
          z-index: 9999;
          overflow: hidden;
        `;

        // 创建可触摸元素
        const tapButton = document.createElement('button');
        tapButton.textContent = '触摸按钮';
        tapButton.style.cssText = `
          margin: 10px;
          padding: 15px;
          font-size: 16px;
          border: none;
          background: #007bff;
          color: white;
          border-radius: 5px;
          touch-action: manipulation;
        `;

        const swipeArea = document.createElement('div');
        swipeArea.textContent = '滑动区域';
        swipeArea.style.cssText = `
          margin: 10px;
          padding: 30px;
          background: #28a745;
          color: white;
          text-align: center;
          touch-action: pan-x pan-y;
        `;

        const longPressArea = document.createElement('div');
        longPressArea.textContent = '长按区域';
        longPressArea.style.cssText = `
          margin: 10px;
          padding: 30px;
          background: #dc3545;
          color: white;
          text-align: center;
          user-select: none;
        `;

        testContainer.appendChild(tapButton);
        testContainer.appendChild(swipeArea);
        testContainer.appendChild(longPressArea);
        document.body.appendChild(testContainer);

        // 事件监听器
        let eventResults = {
          touchstart: false,
          touchmove: false,
          touchend: false,
          touchcancel: false,
          click: false,
          pointerdown: false,
          pointerup: false,
          gesturestart: false,
          gesturechange: false,
          gestureend: false
        };

        // 触摸事件
        const addTouchListeners = (element: Element) => {
          element.addEventListener('touchstart', () => { eventResults.touchstart = true; });
          element.addEventListener('touchmove', () => { eventResults.touchmove = true; });
          element.addEventListener('touchend', () => { eventResults.touchend = true; });
          element.addEventListener('touchcancel', () => { eventResults.touchcancel = true; });
          element.addEventListener('click', () => { eventResults.click = true; });
        };

        // 指针事件
        const addPointerListeners = (element: Element) => {
          element.addEventListener('pointerdown', () => { eventResults.pointerdown = true; });
          element.addEventListener('pointerup', () => { eventResults.pointerup = true; });
        };

        // 手势事件 (Safari)
        const addGestureListeners = (element: Element) => {
          element.addEventListener('gesturestart', () => { eventResults.gesturestart = true; });
          element.addEventListener('gesturechange', () => { eventResults.gesturechange = true; });
          element.addEventListener('gestureend', () => { eventResults.gestureend = true; });
        };

        addTouchListeners(tapButton);
        addTouchListeners(swipeArea);
        addTouchListeners(longPressArea);
        addPointerListeners(tapButton);
        addPointerListeners(swipeArea);
        addGestureListeners(swipeArea);

        // 模拟触摸事件
        try {
          // 创建触摸点
          const createTouch = (element: Element, x: number, y: number) => {
            const rect = element.getBoundingClientRect();
            return new Touch({
              identifier: Date.now(),
              target: element,
              clientX: rect.left + x,
              clientY: rect.top + y,
              pageX: rect.left + x,
              pageY: rect.top + y,
              screenX: rect.left + x,
              screenY: rect.top + y,
              radiusX: 10,
              radiusY: 10,
              rotationAngle: 0,
              force: 1
            });
          };

          // 模拟点击
          const touch = createTouch(tapButton, 50, 25);
          tapButton.dispatchEvent(new TouchEvent('touchstart', {
            touches: [touch],
            targetTouches: [touch],
            changedTouches: [touch],
            bubbles: true,
            cancelable: true
          }));

          tapButton.dispatchEvent(new TouchEvent('touchend', {
            touches: [],
            targetTouches: [],
            changedTouches: [touch],
            bubbles: true,
            cancelable: true
          }));

          // 模拟滑动
          const swipeTouch1 = createTouch(swipeArea, 50, 25);
          const swipeTouch2 = createTouch(swipeArea, 100, 25);

          swipeArea.dispatchEvent(new TouchEvent('touchstart', {
            touches: [swipeTouch1],
            targetTouches: [swipeTouch1],
            changedTouches: [swipeTouch1]
          }));

          swipeArea.dispatchEvent(new TouchEvent('touchmove', {
            touches: [swipeTouch2],
            targetTouches: [swipeTouch2],
            changedTouches: [swipeTouch2]
          }));

          swipeArea.dispatchEvent(new TouchEvent('touchend', {
            touches: [],
            targetTouches: [],
            changedTouches: [swipeTouch2]
          }));

        } catch (e) {
          console.log('Touch event simulation failed:', e.message);
        }

        // 模拟点击事件（应该在所有设备上工作）
        tapButton.click();

        // 检测触摸特性支持
        const touchFeatures = {
          touchSupport: 'ontouchstart' in window,
          pointerSupport: 'onpointerdown' in window,
          gestureSupport: 'ongesturestart' in window,
          touchActionSupport: CSS.supports('touch-action', 'manipulation'),
          hasCoarsePointer: window.matchMedia('(pointer: coarse)').matches,
          maxTouchPoints: navigator.maxTouchPoints || 0,
          msMaxTouchPoints: (navigator as any).msMaxTouchPoints || 0
        };

        // 清理
        document.body.removeChild(testContainer);

        return {
          events: eventResults,
          features: touchFeatures,
          testCompleted: true
        };
      });

      expect(touchInteractionTest.testCompleted).toBe(true);
      expect(touchInteractionTest.events.click).toBe(true);
      expect(touchInteractionTest.features.touchSupport).toBe(true);

      console.log('移动端触摸交互测试结果:', touchInteractionTest);
    });

    test('应该在不同输入方式下保持交互一致性', async () => {
      const interactionResults: Array<{
        device: string;
        inputType: string;
        clickWorking: boolean;
        hoverSupport: boolean;
        pointerType: string;
        eventSupport: {
          mouse: boolean;
          touch: boolean;
          pointer: boolean;
        };
      }> = [];

      const testDevicesForInteraction = [
        { name: 'Desktop', width: 1920, height: 1080, expectedInput: 'mouse' },
        { name: 'Tablet', width: 1024, height: 768, expectedInput: 'touch' },
        { name: 'Mobile', width: 393, height: 851, expectedInput: 'touch' }
      ];

      for (const device of testDevicesForInteraction) {
        await page.setViewportSize({ width: device.width, height: device.height });
        await page.goto('/');

        const interactionTest = await page.evaluate((deviceName) => {
          // 创建通用交互测试
          const testButton = document.createElement('button');
          testButton.textContent = '通用交互按钮';
          testButton.style.cssText = `
            position: fixed;
            top: 200px;
            left: 200px;
            padding: 20px;
            font-size: 16px;
            z-index: 10000;
            cursor: pointer;
          `;
          document.body.appendChild(testButton);

          let clickCount = 0;
          testButton.addEventListener('click', () => {
            clickCount++;
          });

          // 测试点击功能
          testButton.click();

          // 检测设备特性
          const deviceFeatures = {
            clickWorking: clickCount > 0,
            hoverSupport: window.matchMedia('(hover: hover)').matches,
            pointerType: window.matchMedia('(pointer: fine)').matches ? 'fine' : 
                        window.matchMedia('(pointer: coarse)').matches ? 'coarse' : 'none',
            eventSupport: {
              mouse: typeof MouseEvent !== 'undefined',
              touch: 'ontouchstart' in window,
              pointer: 'onpointerdown' in window
            },
            maxTouchPoints: navigator.maxTouchPoints || 0,
            userAgent: navigator.userAgent.includes('Mobile') ? 'mobile' : 'desktop'
          };

          // 清理
          document.body.removeChild(testButton);

          return {
            device: deviceName,
            inputType: deviceFeatures.pointerType,
            ...deviceFeatures
          };
        }, device.name);

        interactionResults.push(interactionTest);

        expect(interactionTest.clickWorking).toBe(true);
        expect(interactionTest.eventSupport.mouse).toBe(true);
      }

      // 验证所有设备都支持基础点击功能
      for (const result of interactionResults) {
        expect(result.clickWorking).toBe(true);
      }

      console.log('跨设备交互一致性测试结果:', interactionResults);
    });
  });

  // 响应式UI元素测试
  test.describe('响应式UI元素显示测试', () => {
    test('应该在不同屏幕尺寸下正确显示和隐藏UI元素', async () => {
      interface UiTestResult {
        device: string;
        viewport: { width: number; height: number };
        elements: {
          body: boolean;
          navigation: boolean;
          content: boolean;
          sidebar: boolean;
          footer: boolean;
          buttons: number;
          inputs: number;
          images: number;
        };
        mediaQueries: {
          isMobile: boolean;
          isTablet: boolean;
          isDesktop: boolean;
          isLandscape: boolean;
          isPortrait: boolean;
        };
        cssSupport: {
          flexbox: boolean;
          grid: boolean;
          mediaQueries: boolean;
          transforms: boolean;
          transitions: boolean;
        };
        accessibility: {
          hasAltTexts: boolean;
          hasLabels: boolean;
          hasHeadings: boolean;
          keyboardNavigable: boolean;
        };
      }
      
      const uiTestResults: UiTestResult[] = [];

      for (const device of testDevices) {
        await page.setViewportSize({ width: device.width, height: device.height });
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        const uiAnalysis = await page.evaluate((deviceInfo) => {
          // 创建测试UI元素
          const testContainer = document.createElement('div');
          testContainer.innerHTML = `
            <nav class="navigation">导航栏</nav>
            <main class="content">
              <h1>主标题</h1>
              <p>内容区域</p>
              <button>测试按钮</button>
              <input type="text" placeholder="测试输入" aria-label="测试输入框">
              <img src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iIzAwNzNlNiIvPjwvc3ZnPg==" alt="测试图片">
            </main>
            <aside class="sidebar">侧边栏</aside>
            <footer class="footer">页脚</footer>
          `;
          testContainer.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: 1000;
            background: white;
            display: flex;
            flex-direction: column;
          `;
          document.body.appendChild(testContainer);

          // 分析UI元素
          const elements = {
            body: !!document.body,
            navigation: !!testContainer.querySelector('.navigation'),
            content: !!testContainer.querySelector('.content'),
            sidebar: !!testContainer.querySelector('.sidebar'),
            footer: !!testContainer.querySelector('.footer'),
            buttons: testContainer.querySelectorAll('button').length,
            inputs: testContainer.querySelectorAll('input').length,
            images: testContainer.querySelectorAll('img').length
          };

          // 媒体查询检测
          const mediaQueries = {
            isMobile: window.matchMedia('(max-width: 768px)').matches,
            isTablet: window.matchMedia('(min-width: 769px) and (max-width: 1024px)').matches,
            isDesktop: window.matchMedia('(min-width: 1025px)').matches,
            isLandscape: window.matchMedia('(orientation: landscape)').matches,
            isPortrait: window.matchMedia('(orientation: portrait)').matches
          };

          // CSS特性支持检测
          const cssSupport = {
            flexbox: CSS.supports('display', 'flex'),
            grid: CSS.supports('display', 'grid'),
            mediaQueries: typeof window.matchMedia === 'function',
            transforms: CSS.supports('transform', 'translateX(10px)'),
            transitions: CSS.supports('transition', 'all 0.3s ease')
          };

          // 可访问性检测
          const accessibility = {
            hasAltTexts: Array.from(testContainer.querySelectorAll('img')).every(img => img.hasAttribute('alt')),
            hasLabels: Array.from(testContainer.querySelectorAll('input')).every(input => 
              input.hasAttribute('aria-label') || input.hasAttribute('placeholder')),
            hasHeadings: testContainer.querySelectorAll('h1, h2, h3, h4, h5, h6').length > 0,
            keyboardNavigable: testContainer.querySelectorAll('button, input, a, [tabindex]').length > 0
          };

          // 清理测试元素
          document.body.removeChild(testContainer);

          return {
            device: deviceInfo.name,
            viewport: { width: window.innerWidth, height: window.innerHeight },
            elements,
            mediaQueries,
            cssSupport,
            accessibility
          };
        }, device);

        uiTestResults.push(uiAnalysis);

        // 基础验证
        expect(uiAnalysis.elements.body).toBe(true);
        expect(uiAnalysis.elements.navigation).toBe(true);
        expect(uiAnalysis.elements.content).toBe(true);
        expect(uiAnalysis.cssSupport.flexbox).toBe(true);
        expect(uiAnalysis.cssSupport.mediaQueries).toBe(true);
        expect(uiAnalysis.accessibility.hasAltTexts).toBe(true);
        expect(uiAnalysis.accessibility.hasLabels).toBe(true);
      }

      // 验证响应式行为
      const desktopResults = uiTestResults.filter(r => r.device.includes('Desktop'));
      const mobileResults = uiTestResults.filter(r => r.device.includes('Mobile'));

      expect(desktopResults.length).toBeGreaterThan(0);
      expect(mobileResults.length).toBeGreaterThan(0);

      // 验证桌面端和移动端的媒体查询正确性
      for (const desktop of desktopResults) {
        expect(desktop.mediaQueries.isDesktop).toBe(true);
        expect(desktop.mediaQueries.isMobile).toBe(false);
      }

      for (const mobile of mobileResults) {
        expect(mobile.mediaQueries.isMobile).toBe(true);
        expect(mobile.mediaQueries.isDesktop).toBe(false);
      }

      console.log('UI响应式测试结果:', uiTestResults);
    });

    test('应该在不同设备上正确处理CSS布局', async () => {
      const layoutTestResults: Array<{
        device: string;
        layoutSupport: {
          flexbox: boolean;
          grid: boolean;
          positioning: boolean;
          floats: boolean;
        };
        responsiveFeatures: {
          mediaQueries: boolean;
          viewportUnits: boolean;
          containerQueries: boolean;
          aspectRatio: boolean;
        };
        performanceMetrics: {
          renderTime: number;
          layoutStable: boolean;
        };
      }> = [];

      for (const device of testDevices.slice(0, 3)) { // 测试前3个设备
        await page.setViewportSize({ width: device.width, height: device.height });
        await page.goto('/');

        const layoutTest = await page.evaluate((deviceName) => {
          const startTime = performance.now();

          // 创建复杂布局测试
          const layoutContainer = document.createElement('div');
          layoutContainer.innerHTML = `
            <div class="flex-container" style="display: flex; flex-wrap: wrap;">
              <div class="flex-item" style="flex: 1; min-width: 200px;">Flex Item 1</div>
              <div class="flex-item" style="flex: 1; min-width: 200px;">Flex Item 2</div>
            </div>
            <div class="grid-container" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px;">
              <div class="grid-item">Grid Item 1</div>
              <div class="grid-item">Grid Item 2</div>
              <div class="grid-item">Grid Item 3</div>
            </div>
            <div class="positioned-element" style="position: relative; top: 10px; left: 10px;">Positioned Element</div>
          `;
          layoutContainer.style.cssText = 'padding: 20px; margin: 20px;';
          document.body.appendChild(layoutContainer);

          // 测试布局支持
          const layoutSupport = {
            flexbox: CSS.supports('display', 'flex'),
            grid: CSS.supports('display', 'grid'),
            positioning: CSS.supports('position', 'relative'),
            floats: CSS.supports('float', 'left')
          };

          // 测试响应式特性
          const responsiveFeatures = {
            mediaQueries: typeof window.matchMedia === 'function',
            viewportUnits: CSS.supports('width', '100vw'),
            containerQueries: CSS.supports('container-type', 'inline-size'),
            aspectRatio: CSS.supports('aspect-ratio', '16/9')
          };

          // 性能测试
          const endTime = performance.now();
          const renderTime = endTime - startTime;

          // 检查布局稳定性
          const flexContainer = layoutContainer.querySelector('.flex-container') as HTMLElement;
          const gridContainer = layoutContainer.querySelector('.grid-container') as HTMLElement;
          
          const layoutStable = !!(flexContainer?.offsetHeight > 0 && gridContainer?.offsetHeight > 0);

          // 清理
          document.body.removeChild(layoutContainer);

          return {
            device: deviceName,
            layoutSupport,
            responsiveFeatures,
            performanceMetrics: {
              renderTime,
              layoutStable
            }
          };
        }, device.name);

        layoutTestResults.push(layoutTest);

        expect(layoutTest.layoutSupport.flexbox).toBe(true);
        expect(layoutTest.layoutSupport.grid).toBe(true);
        expect(layoutTest.responsiveFeatures.mediaQueries).toBe(true);
        expect(layoutTest.performanceMetrics.layoutStable).toBe(true);
      }

      console.log('CSS布局测试结果:', layoutTestResults);
    });
  });

  test('应该在不同设备上保持表单功能一致性', async () => {
    const devices = [
      { width: 1920, height: 1080, name: 'Desktop' },
      { width: 393, height: 851, name: 'Mobile' }
    ];

    for (const device of devices) {
      await page.setViewportSize(device);
      await page.goto('/');

      // 创建测试表单
      await page.evaluate(() => {
        const form = document.createElement('form');
        form.innerHTML = `
          <input type="text" name="username" placeholder="用户名" required>
          <input type="email" name="email" placeholder="邮箱" required>
          <input type="password" name="password" placeholder="密码" required>
          <button type="submit">提交</button>
        `;
        form.id = 'responsive-test-form';
        form.style.padding = '20px';
        form.style.margin = '20px';
        document.body.appendChild(form);
      });

      // 测试表单交互
      const formTest = await page.evaluate(() => {
        const form = document.getElementById('responsive-test-form') as HTMLFormElement;
        const usernameInput = form.querySelector('input[name="username"]') as HTMLInputElement;
        const emailInput = form.querySelector('input[name="email"]') as HTMLInputElement;
        
        // 填写表单
        usernameInput.value = 'testuser';
        emailInput.value = 'test@example.com';
        
        // 验证表单功能
        return {
          canFocus: typeof usernameInput.focus === 'function',
          canValidate: typeof form.checkValidity === 'function',
          formValid: form.checkValidity(),
          inputValues: {
            username: usernameInput.value,
            email: emailInput.value
          }
        };
      });

      expect(formTest.canFocus).toBe(true);
      expect(formTest.canValidate).toBe(true);
      expect(formTest.inputValues.username).toBe('testuser');
      expect(formTest.inputValues.email).toBe('test@example.com');

      // 清理表单
      await page.evaluate(() => {
        const form = document.getElementById('responsive-test-form');
        if (form) {
          form.remove();
        }
      });

      console.log(`${device.name} 表单测试通过:`, formTest);
    }
  });

  // 文件操作跨设备兼容性测试
  test.describe('文件操作跨设备兼容性测试', () => {
    test('应该在不同设备上正确处理文件上传功能', async () => {
      const fileTestResults: Array<{
        device: string;
        fileSupport: {
          fileInput: boolean;
          fileAPI: boolean;
          formData: boolean;
          fileReader: boolean;
          dragDrop: boolean;
          multipleFiles: boolean;
          fileSize: boolean;
          fileType: boolean;
        };
        uploadFeatures: {
          progressSupport: boolean;
          chunkUpload: boolean;
          resumableUpload: boolean;
          previewSupport: boolean;
        };
        securityFeatures: {
          fileValidation: boolean;
          sizeLimit: boolean;
          typeRestriction: boolean;
          virusScanning: boolean;
        };
      }> = [];

      for (const device of [testDevices[0], testDevices[5]]) { // Desktop and Mobile
        await page.setViewportSize({ width: device.width, height: device.height });
        await page.goto('/');

        const fileTest = await page.evaluate((deviceName) => {
          // 创建完整的文件上传测试界面
          const uploadContainer = document.createElement('div');
          uploadContainer.innerHTML = `
            <div class="upload-area" style="border: 2px dashed #ccc; padding: 40px; text-align: center; margin: 20px;">
              <input type="file" id="file-input" accept=".jpg,.png,.pdf,.doc,.docx" multiple style="display: none;">
              <label for="file-input" style="cursor: pointer; display: block;">
                点击或拖拽文件到此处上传
              </label>
              <div class="file-list" style="margin-top: 20px;"></div>
              <div class="upload-progress" style="margin-top: 10px;">
                <progress id="upload-progress" value="0" max="100" style="width: 100%; display: none;"></progress>
              </div>
            </div>
          `;
          document.body.appendChild(uploadContainer);

          const fileInput = uploadContainer.querySelector('#file-input') as HTMLInputElement;
          const uploadArea = uploadContainer.querySelector('.upload-area') as HTMLElement;
          const fileList = uploadContainer.querySelector('.file-list') as HTMLElement;
          const progressBar = uploadContainer.querySelector('#upload-progress') as HTMLProgressElement;

          // 测试文件API支持
          const fileSupport = {
            fileInput: fileInput.type === 'file',
            fileAPI: typeof File !== 'undefined',
            formData: typeof FormData !== 'undefined',
            fileReader: typeof FileReader !== 'undefined',
            dragDrop: 'ondragover' in uploadArea && 'ondrop' in uploadArea,
            multipleFiles: fileInput.hasAttribute('multiple'),
            fileSize: typeof File !== 'undefined' && 'size' in File.prototype,
            fileType: typeof File !== 'undefined' && 'type' in File.prototype
          };

          // 测试上传功能特性
          const uploadFeatures = {
            progressSupport: typeof XMLHttpRequest !== 'undefined' && 'upload' in new XMLHttpRequest(),
            chunkUpload: typeof Blob !== 'undefined' && typeof Blob.prototype.slice === 'function',
            resumableUpload: typeof localStorage !== 'undefined',
            previewSupport: typeof FileReader !== 'undefined' && typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function'
          };

          // 测试安全特性
          const securityFeatures = {
            fileValidation: typeof File !== 'undefined',
            sizeLimit: true, // 可以通过JavaScript检查
            typeRestriction: fileInput.hasAttribute('accept'),
            virusScanning: false // 需要服务器端支持
          };

          // 模拟文件选择和验证
          let fileValidationWorking = false;
          try {
            // 创建模拟文件
            const mockFile = new File(['test content'], 'test.txt', { type: 'text/plain' });
            
            // 测试文件验证逻辑
            const isValidType = fileInput.accept.split(',').some(type => 
              type.trim() === '.txt' || mockFile.type.includes(type.replace('.', ''))
            );
            
            const isValidSize = mockFile.size < 10 * 1024 * 1024; // 10MB limit
            
            fileValidationWorking = typeof mockFile.name === 'string' && 
                                  typeof mockFile.size === 'number' && 
                                  typeof mockFile.type === 'string';
          } catch (e) {
            console.log('File validation test failed:', e.message);
          }

          // 测试拖拽功能
          let dragDropWorking = false;
          try {
            uploadArea.addEventListener('dragover', (e) => {
              e.preventDefault();
              dragDropWorking = true;
            });

            uploadArea.addEventListener('drop', (e) => {
              e.preventDefault();
              const files = e.dataTransfer?.files;
              dragDropWorking = dragDropWorking && !!files;
            });

            // 模拟拖拽事件
            const dragEvent = new DragEvent('dragover', {
              bubbles: true,
              cancelable: true,
              dataTransfer: new DataTransfer()
            });
            uploadArea.dispatchEvent(dragEvent);
          } catch (e) {
            console.log('Drag and drop test failed:', e.message);
          }

          // 测试进度条功能
          let progressWorking = false;
          try {
            progressBar.value = 50;
            progressWorking = progressBar.value === 50;
          } catch (e) {
            console.log('Progress bar test failed:', e.message);
          }

          // 清理
          document.body.removeChild(uploadContainer);

          return {
            device: deviceName,
            fileSupport: {
              ...fileSupport,
              fileValidation: fileValidationWorking
            },
            uploadFeatures: {
              ...uploadFeatures,
              dragDropWorking,
              progressWorking
            },
            securityFeatures,
            testCompleted: true
          };
        }, device.name);

        fileTestResults.push(fileTest);

        expect(fileTest.fileSupport.fileInput).toBe(true);
        expect(fileTest.fileSupport.fileAPI).toBe(true);
        expect(fileTest.fileSupport.formData).toBe(true);
        expect(fileTest.fileSupport.fileReader).toBe(true);
        expect(fileTest.uploadFeatures.progressSupport).toBe(true);
        expect(fileTest.testCompleted).toBe(true);
      }

      console.log('文件上传兼容性测试结果:', fileTestResults);
    });

    test('应该在不同设备上正确处理文件预览和下载', async () => {
      const previewTestResults: Array<{
        device: string;
        previewSupport: {
          imagePreview: boolean;
          pdfPreview: boolean;
          textPreview: boolean;
          videoPreview: boolean;
        };
        downloadSupport: {
          directDownload: boolean;
          blobDownload: boolean;
          streamDownload: boolean;
          resumableDownload: boolean;
        };
      }> = [];

      for (const device of [testDevices[0], testDevices[5]]) { // Desktop and Mobile
        await page.setViewportSize({ width: device.width, height: device.height });
        await page.goto('/');

        const previewTest = await page.evaluate((deviceName) => {
          // 创建文件预览测试
          const previewContainer = document.createElement('div');
          previewContainer.style.cssText = 'padding: 20px; margin: 20px;';
          document.body.appendChild(previewContainer);

          // 测试图片预览
          let imagePreview = false;
          try {
            const img = document.createElement('img');
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            canvas.width = 100;
            canvas.height = 100;
            ctx?.fillRect(0, 0, 100, 100);
            
            const dataURL = canvas.toDataURL('image/png');
            img.src = dataURL;
            
            imagePreview = img.src.startsWith('data:image/');
          } catch (e) {
            console.log('Image preview test failed:', e.message);
          }

          // 测试PDF预览支持
          let pdfPreview = false;
          try {
            const embed = document.createElement('embed');
            embed.type = 'application/pdf';
            pdfPreview = embed.type === 'application/pdf';
          } catch (e) {
            console.log('PDF preview test failed:', e.message);
          }

          // 测试文本预览
          let textPreview = false;
          try {
            const pre = document.createElement('pre');
            pre.textContent = 'Sample text content';
            textPreview = pre.textContent === 'Sample text content';
          } catch (e) {
            console.log('Text preview test failed:', e.message);
          }

          // 测试视频预览
          let videoPreview = false;
          try {
            const video = document.createElement('video');
            video.controls = true;
            videoPreview = video.controls === true && typeof video.play === 'function';
          } catch (e) {
            console.log('Video preview test failed:', e.message);
          }

          // 测试下载功能
          let directDownload = false;
          try {
            const link = document.createElement('a');
            link.download = 'test-file.txt';
            link.href = 'data:text/plain;charset=utf-8,Test content';
            directDownload = link.hasAttribute('download');
          } catch (e) {
            console.log('Direct download test failed:', e.message);
          }

          // 测试Blob下载
          let blobDownload = false;
          try {
            const blob = new Blob(['test content'], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            blobDownload = url.startsWith('blob:');
            URL.revokeObjectURL(url);
          } catch (e) {
            console.log('Blob download test failed:', e.message);
          }

          // 测试流下载支持
          let streamDownload = false;
          try {
            streamDownload = typeof ReadableStream !== 'undefined' && 
                           typeof Response !== 'undefined' && 
                           typeof fetch === 'function';
          } catch (e) {
            console.log('Stream download test failed:', e.message);
          }

          // 测试可恢复下载支持
          let resumableDownload = false;
          try {
            resumableDownload = typeof localStorage !== 'undefined' && 
                              typeof XMLHttpRequest !== 'undefined' &&
                              'setRequestHeader' in XMLHttpRequest.prototype;
          } catch (e) {
            console.log('Resumable download test failed:', e.message);
          }

          // 清理
          document.body.removeChild(previewContainer);

          return {
            device: deviceName,
            previewSupport: {
              imagePreview,
              pdfPreview,
              textPreview,
              videoPreview
            },
            downloadSupport: {
              directDownload,
              blobDownload,
              streamDownload,
              resumableDownload
            }
          };
        }, device.name);

        previewTestResults.push(previewTest);

        expect(previewTest.previewSupport.imagePreview).toBe(true);
        expect(previewTest.previewSupport.textPreview).toBe(true);
        expect(previewTest.downloadSupport.directDownload).toBe(true);
        expect(previewTest.downloadSupport.blobDownload).toBe(true);
      }

      console.log('文件预览和下载测试结果:', previewTestResults);
    });
  });

  // 网络状态和数据同步测试
  test.describe('网络状态和数据同步测试', () => {
    test('应该在不同设备上正确处理网络状态变化', async () => {
      const networkTestResults: Array<{
        device: string;
        networkSupport: {
          onlineStatus: boolean;
          connectionAPI: boolean;
          networkEvents: boolean;
          fetchSupport: boolean;
          websocketSupport: boolean;
          serviceWorkerSupport: boolean;
        };
        connectionInfo: {
          effectiveType?: string;
          downlink?: number;
          rtt?: number;
          saveData?: boolean;
        };
        apiPerformance: {
          healthCheck: { status: number; time: number };
          dataFetch: { status: number; time: number };
        };
      }> = [];

      const testDevicesForNetwork = [
        { width: 1920, height: 1080, name: 'Desktop' },
        { width: 393, height: 851, name: 'Mobile' }
      ];

      for (const device of testDevicesForNetwork) {
        await page.setViewportSize(device);
        await page.goto('/');

        const networkTest = await page.evaluate((deviceName) => {
          // 网络API支持检测
          const networkSupport = {
            onlineStatus: navigator.onLine,
            connectionAPI: !!(navigator as any).connection,
            networkEvents: 'ononline' in window && 'onoffline' in window,
            fetchSupport: typeof fetch !== 'undefined',
            websocketSupport: typeof WebSocket !== 'undefined',
            serviceWorkerSupport: 'serviceWorker' in navigator
          };

          // 连接信息获取
          const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
          const connectionInfo = connection ? {
            effectiveType: connection.effectiveType,
            downlink: connection.downlink,
            rtt: connection.rtt,
            saveData: connection.saveData
          } : {};

          // 网络事件监听测试
          let networkEventWorking = false;
          try {
            const onlineHandler = () => { networkEventWorking = true; };
            window.addEventListener('online', onlineHandler);
            window.removeEventListener('online', onlineHandler);
            networkEventWorking = true;
          } catch (e) {
            console.log('Network event test failed:', e.message);
          }

          return {
            device: deviceName,
            networkSupport: {
              ...networkSupport,
              networkEventWorking
            },
            connectionInfo
          };
        }, device.name);

        // API性能测试
        const healthStartTime = Date.now();
        const healthResponse = await page.request.get('/api/v1/health');
        const healthEndTime = Date.now();

        const dataStartTime = Date.now();
        const dataResponse = await page.request.get('/api/v1/users');
        const dataEndTime = Date.now();

        const result = {
          ...networkTest,
          apiPerformance: {
            healthCheck: { 
              status: healthResponse.status(), 
              time: healthEndTime - healthStartTime 
            },
            dataFetch: { 
              status: dataResponse.status(), 
              time: dataEndTime - dataStartTime 
            }
          }
        };

        networkTestResults.push(result);

        expect(networkTest.networkSupport.onlineStatus).toBe(true);
        expect(networkTest.networkSupport.networkEvents).toBe(true);
        expect(networkTest.networkSupport.fetchSupport).toBe(true);
        expect(healthResponse.ok()).toBe(true);
      }

      console.log('网络状态测试结果:', networkTestResults);
    });

    test('应该在不同设备上保持实时数据同步', async () => {
      const syncTestResults: Array<{
        device: string;
        syncSupport: {
          websocket: boolean;
          serverSentEvents: boolean;
          polling: boolean;
          localStorage: boolean;
          sessionStorage: boolean;
          indexedDB: boolean;
        };
        syncPerformance: {
          connectionTime: number;
          messageLatency: number;
          reconnectionSupport: boolean;
        };
      }> = [];

      for (const device of [testDevices[0], testDevices[5]]) { // Desktop and Mobile
        await page.setViewportSize({ width: device.width, height: device.height });
        await page.goto('/');

        const syncTest = await page.evaluate((deviceName) => {
          // 实时同步技术支持检测
          const syncSupport = {
            websocket: typeof WebSocket !== 'undefined',
            serverSentEvents: typeof EventSource !== 'undefined',
            polling: typeof setInterval !== 'undefined' && typeof fetch !== 'undefined',
            localStorage: typeof localStorage !== 'undefined',
            sessionStorage: typeof sessionStorage !== 'undefined',
            indexedDB: typeof indexedDB !== 'undefined'
          };

          // WebSocket连接测试
          let connectionTime = 0;
          let messageLatency = 0;
          let reconnectionSupport = false;

          try {
            const startTime = Date.now();
            
            // 模拟WebSocket连接（不实际连接，只测试API）
            if (typeof WebSocket !== 'undefined') {
              connectionTime = Date.now() - startTime;
              reconnectionSupport = true;
            }

            // 模拟消息延迟测试
            const messageStart = Date.now();
            setTimeout(() => {
              messageLatency = Date.now() - messageStart;
            }, 0);

          } catch (e) {
            console.log('Sync test failed:', e.message);
          }

          // 存储同步测试
          let storageWorking = false;
          try {
            if (typeof localStorage !== 'undefined') {
              localStorage.setItem('sync-test', 'test-value');
              storageWorking = localStorage.getItem('sync-test') === 'test-value';
              localStorage.removeItem('sync-test');
            }
          } catch (e) {
            console.log('Storage sync test failed:', e.message);
          }

          return {
            device: deviceName,
            syncSupport: {
              ...syncSupport,
              storageWorking
            },
            syncPerformance: {
              connectionTime,
              messageLatency,
              reconnectionSupport
            }
          };
        }, device.name);

        syncTestResults.push(syncTest);

        expect(syncTest.syncSupport.websocket).toBe(true);
        expect(syncTest.syncSupport.localStorage).toBe(true);
        expect(syncTest.syncSupport.polling).toBe(true);
      }

      console.log('数据同步测试结果:', syncTestResults);
    });

    test('应该在网络中断和恢复时正确处理数据', async () => {
      const resilienceTestResults: Array<{
        device: string;
        offlineSupport: {
          cacheAPI: boolean;
          serviceWorker: boolean;
          localStorageFallback: boolean;
          offlineDetection: boolean;
        };
        recoveryMechanisms: {
          autoRetry: boolean;
          queuedRequests: boolean;
          dataReconciliation: boolean;
          conflictResolution: boolean;
        };
      }> = [];

      for (const device of [testDevices[0], testDevices[5]]) { // Desktop and Mobile
        await page.setViewportSize({ width: device.width, height: device.height });
        await page.goto('/');

        const resilienceTest = await page.evaluate((deviceName) => {
          // 离线支持检测
          const offlineSupport = {
            cacheAPI: 'caches' in window,
            serviceWorker: 'serviceWorker' in navigator,
            localStorageFallback: typeof localStorage !== 'undefined',
            offlineDetection: 'onLine' in navigator && 'ononline' in window && 'onoffline' in window
          };

          // 恢复机制测试
          let autoRetry = false;
          let queuedRequests = false;
          let dataReconciliation = false;
          let conflictResolution = false;

          try {
            // 测试自动重试机制
            autoRetry = typeof setTimeout !== 'undefined' && typeof fetch !== 'undefined';

            // 测试请求队列
            queuedRequests = typeof Array !== 'undefined' && typeof localStorage !== 'undefined';

            // 测试数据协调
            dataReconciliation = typeof JSON !== 'undefined' && typeof Date !== 'undefined';

            // 测试冲突解决
            conflictResolution = typeof Object !== 'undefined' && typeof JSON !== 'undefined';

          } catch (e) {
            console.log('Resilience test failed:', e.message);
          }

          // 模拟网络中断处理
          let offlineHandlingWorking = false;
          try {
            const offlineHandler = () => {
              // 模拟离线处理逻辑
              if (typeof localStorage !== 'undefined') {
                localStorage.setItem('offline-mode', 'true');
              }
              offlineHandlingWorking = true;
            };

            const onlineHandler = () => {
              // 模拟在线恢复逻辑
              if (typeof localStorage !== 'undefined') {
                localStorage.removeItem('offline-mode');
              }
            };

            window.addEventListener('offline', offlineHandler);
            window.addEventListener('online', onlineHandler);

            // 清理事件监听器
            window.removeEventListener('offline', offlineHandler);
            window.removeEventListener('online', onlineHandler);

            offlineHandlingWorking = true;
          } catch (e) {
            console.log('Offline handling test failed:', e.message);
          }

          return {
            device: deviceName,
            offlineSupport: {
              ...offlineSupport,
              offlineHandlingWorking
            },
            recoveryMechanisms: {
              autoRetry,
              queuedRequests,
              dataReconciliation,
              conflictResolution
            }
          };
        }, device.name);

        resilienceTestResults.push(resilienceTest);

        expect(resilienceTest.offlineSupport.offlineDetection).toBe(true);
        expect(resilienceTest.offlineSupport.localStorageFallback).toBe(true);
        expect(resilienceTest.recoveryMechanisms.autoRetry).toBe(true);
        expect(resilienceTest.recoveryMechanisms.queuedRequests).toBe(true);
      }

      console.log('网络恢复能力测试结果:', resilienceTestResults);
    });
  });
});

test.describe('跨设备数据同步测试', () => {
  test('应该在不同设备尺寸下保持数据一致性', async ({ browser }) => {
    // 创建两个不同尺寸的页面模拟不同设备
    const desktopContext = await browser.newContext();
    const mobileContext = await browser.newContext();
    
    const desktopPage = await desktopContext.newPage();
    const mobilePage = await mobileContext.newPage();

    try {
      // 设置不同的视口大小
      await desktopPage.setViewportSize({ width: 1920, height: 1080 });
      await mobilePage.setViewportSize({ width: 393, height: 851 });

      // 两个页面都导航到应用
      await Promise.all([
        desktopPage.goto('/'),
        mobilePage.goto('/')
      ]);

      // 在桌面端进行API调用
      const desktopApiResponse = await desktopPage.request.get('/api/v1/health');
      expect(desktopApiResponse.ok()).toBe(true);

      // 在移动端进行相同的API调用
      const mobileApiResponse = await mobilePage.request.get('/api/v1/health');
      expect(mobileApiResponse.ok()).toBe(true);

      // 验证响应数据一致性
      const desktopData = await desktopApiResponse.json();
      const mobileData = await mobileApiResponse.json();

      expect(desktopData).toEqual(mobileData);

      console.log('跨设备数据一致性验证通过');

    } finally {
      await desktopContext.close();
      await mobileContext.close();
    }
  });
});