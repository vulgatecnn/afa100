import { Page } from '@playwright/test';

/**
 * 浏览器特性检测工具
 * 用于检测不同浏览器的功能支持情况
 */

export interface BrowserFeatures {
  // 基础特性
  localStorage: boolean;
  sessionStorage: boolean;
  indexedDB: boolean;
  webgl: boolean;
  webgl2: boolean;
  websockets: boolean;
  serviceWorker: boolean;
  
  // 网络特性
  fetch: boolean;
  xhr: boolean;
  cors: boolean;
  
  // 媒体特性
  geolocation: boolean;
  camera: boolean;
  microphone: boolean;
  notifications: boolean;
  
  // 现代JavaScript特性
  es6Classes: boolean;
  arrowFunctions: boolean;
  asyncAwait: boolean;
  promises: boolean;
  modules: boolean;
  proxy: boolean;
  symbols: boolean;
  
  // CSS特性
  flexbox: boolean;
  grid: boolean;
  customProperties: boolean;
  transforms: boolean;
  transitions: boolean;
  animations: boolean;
  
  // 表单特性
  html5Validation: boolean;
  inputTypes: {
    email: boolean;
    date: boolean;
    number: boolean;
    range: boolean;
    color: boolean;
  };
  
  // 性能特性
  performance: boolean;
  performanceObserver: boolean;
  requestAnimationFrame: boolean;
  
  // 浏览器信息
  userAgent: string;
  platform: string;
  language: string;
  cookieEnabled: boolean;
  onLine: boolean;
}

export class BrowserFeatureDetector {
  private page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * 检测所有浏览器特性
   */
  async detectAllFeatures(): Promise<BrowserFeatures> {
    // 先注入检测函数
    await this.page.addInitScript(injectDetectionFunctions);
    
    return await this.page.evaluate(() => {
      const features: BrowserFeatures = {
        // 基础特性检测
        localStorage: window.checkLocalStorage(),
        sessionStorage: window.checkSessionStorage(),
        indexedDB: !!window.indexedDB,
        webgl: window.checkWebGL(),
        webgl2: window.checkWebGL2(),
        websockets: !!window.WebSocket,
        serviceWorker: 'serviceWorker' in navigator,
        
        // 网络特性检测
        fetch: typeof fetch !== 'undefined',
        xhr: typeof XMLHttpRequest !== 'undefined',
        cors: window.checkCORS(),
        
        // 媒体特性检测
        geolocation: 'geolocation' in navigator,
        camera: window.checkCamera(),
        microphone: window.checkMicrophone(),
        notifications: 'Notification' in window,
        
        // JavaScript特性检测
        es6Classes: window.checkES6Classes(),
        arrowFunctions: window.checkArrowFunctions(),
        asyncAwait: window.checkAsyncAwait(),
        promises: typeof Promise !== 'undefined',
        modules: window.checkModules(),
        proxy: typeof Proxy !== 'undefined',
        symbols: typeof Symbol !== 'undefined',
        
        // CSS特性检测
        flexbox: window.checkCSS('display', 'flex'),
        grid: window.checkCSS('display', 'grid'),
        customProperties: window.checkCSS('--test', 'value'),
        transforms: window.checkCSS('transform', 'translateX(1px)'),
        transitions: window.checkCSS('transition', 'all 1s ease'),
        animations: window.checkCSS('animation', 'test 1s ease'),
        
        // 表单特性检测
        html5Validation: window.checkHTML5Validation(),
        inputTypes: window.checkInputTypes(),
        
        // 性能特性检测
        performance: !!window.performance,
        performanceObserver: typeof PerformanceObserver !== 'undefined',
        requestAnimationFrame: typeof requestAnimationFrame === 'function',
        
        // 浏览器信息
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language,
        cookieEnabled: navigator.cookieEnabled,
        onLine: navigator.onLine
      };

      return features;
    });
  }

  /**
   * 检测特定浏览器类型
   */
  async detectBrowserType(): Promise<{
    name: string;
    version: string;
    isChrome: boolean;
    isFirefox: boolean;
    isSafari: boolean;
    isEdge: boolean;
    isMobile: boolean;
  }> {
    return await this.page.evaluate(() => {
      const ua = navigator.userAgent;
      
      const isChrome = ua.includes('Chrome') && !ua.includes('Edg');
      const isFirefox = ua.includes('Firefox');
      const isSafari = ua.includes('Safari') && !ua.includes('Chrome');
      const isEdge = ua.includes('Edg');
      const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
      
      let name = 'Unknown';
      let version = '';
      
      if (isChrome) {
        name = 'Chrome';
        const match = ua.match(/Chrome\/(\d+)/);
        version = match ? match[1] : '';
      } else if (isFirefox) {
        name = 'Firefox';
        const match = ua.match(/Firefox\/(\d+)/);
        version = match ? match[1] : '';
      } else if (isSafari) {
        name = 'Safari';
        const match = ua.match(/Version\/(\d+)/);
        version = match ? match[1] : '';
      } else if (isEdge) {
        name = 'Edge';
        const match = ua.match(/Edg\/(\d+)/);
        version = match ? match[1] : '';
      }
      
      return {
        name,
        version,
        isChrome,
        isFirefox,
        isSafari,
        isEdge,
        isMobile
      };
    });
  }

  /**
   * 检测网络连接特性
   */
  async detectNetworkFeatures(): Promise<{
    connectionType: string;
    effectiveType: string;
    downlink: number;
    rtt: number;
    saveData: boolean;
  }> {
    return await this.page.evaluate(() => {
      const connection = (navigator as any).connection || 
                       (navigator as any).mozConnection || 
                       (navigator as any).webkitConnection;
      
      if (connection) {
        return {
          connectionType: connection.type || 'unknown',
          effectiveType: connection.effectiveType || 'unknown',
          downlink: connection.downlink || 0,
          rtt: connection.rtt || 0,
          saveData: connection.saveData || false
        };
      }
      
      return {
        connectionType: 'unknown',
        effectiveType: 'unknown',
        downlink: 0,
        rtt: 0,
        saveData: false
      };
    });
  }

  /**
   * 测试API兼容性
   */
  async testAPICompatibility(baseUrl: string): Promise<{
    fetch: boolean;
    xhr: boolean;
    cors: boolean;
    json: boolean;
    formData: boolean;
  }> {
    return await this.page.evaluate(async (url) => {
      const results = {
        fetch: false,
        xhr: false,
        cors: false,
        json: false,
        formData: false
      };
      
      // 测试Fetch API
      try {
        const response = await fetch(`${url}/api/v1/health`);
        results.fetch = true;
        results.json = response.headers.get('content-type')?.includes('application/json') || false;
        results.cors = response.headers.get('access-control-allow-origin') !== null;
      } catch (e) {
        console.log('Fetch test failed:', e);
      }
      
      // 测试XMLHttpRequest
      try {
        await new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open('GET', `${url}/api/v1/health`);
          xhr.onload = () => {
            results.xhr = true;
            resolve(xhr.response);
          };
          xhr.onerror = reject;
          xhr.send();
        });
      } catch (e) {
        console.log('XHR test failed:', e);
      }
      
      // 测试FormData
      try {
        const formData = new FormData();
        formData.append('test', 'value');
        results.formData = true;
      } catch (e) {
        console.log('FormData test failed:', e);
      }
      
      return results;
    }, baseUrl);
  }

  /**
   * 性能基准测试
   */
  async runPerformanceBenchmark(): Promise<{
    domContentLoaded: number;
    loadComplete: number;
    firstPaint: number;
    firstContentfulPaint: number;
    jsExecutionTime: number;
  }> {
    return await this.page.evaluate(() => {
      const timing = performance.timing;
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      
      // 执行JavaScript性能测试
      const start = performance.now();
      for (let i = 0; i < 100000; i++) {
        Math.random();
      }
      const jsExecutionTime = performance.now() - start;
      
      return {
        domContentLoaded: timing.domContentLoadedEventEnd - timing.navigationStart,
        loadComplete: timing.loadEventEnd - timing.navigationStart,
        firstPaint: navigation?.responseStart - navigation?.requestStart || 0,
        firstContentfulPaint: navigation?.domContentLoadedEventStart - navigation?.responseStart || 0,
        jsExecutionTime
      };
    });
  }
}

// 在页面上下文中执行的辅助函数
declare global {
  interface Window {
    checkLocalStorage(): boolean;
    checkSessionStorage(): boolean;
    checkWebGL(): boolean;
    checkWebGL2(): boolean;
    checkCORS(): boolean;
    checkCamera(): boolean;
    checkMicrophone(): boolean;
    checkES6Classes(): boolean;
    checkArrowFunctions(): boolean;
    checkAsyncAwait(): boolean;
    checkModules(): boolean;
    checkCSS(property: string, value: string): boolean;
    checkHTML5Validation(): boolean;
    checkInputTypes(): any;
  }
}

// 注入到页面的检测函数
export const injectDetectionFunctions = `
  window.checkLocalStorage = function() {
    try {
      const test = 'test';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch (e) {
      return false;
    }
  };

  window.checkSessionStorage = function() {
    try {
      const test = 'test';
      sessionStorage.setItem(test, test);
      sessionStorage.removeItem(test);
      return true;
    } catch (e) {
      return false;
    }
  };

  window.checkWebGL = function() {
    try {
      const canvas = document.createElement('canvas');
      return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
    } catch (e) {
      return false;
    }
  };

  window.checkWebGL2 = function() {
    try {
      const canvas = document.createElement('canvas');
      return !!canvas.getContext('webgl2');
    } catch (e) {
      return false;
    }
  };

  window.checkCORS = function() {
    return typeof XMLHttpRequest !== 'undefined' && 'withCredentials' in new XMLHttpRequest();
  };

  window.checkCamera = function() {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  };

  window.checkMicrophone = function() {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  };

  window.checkES6Classes = function() {
    try {
      eval('class TestClass {}');
      return true;
    } catch (e) {
      return false;
    }
  };

  window.checkArrowFunctions = function() {
    try {
      eval('const arrow = () => {}');
      return true;
    } catch (e) {
      return false;
    }
  };

  window.checkAsyncAwait = function() {
    try {
      eval('async function test() { await Promise.resolve(); }');
      return true;
    } catch (e) {
      return false;
    }
  };

  window.checkModules = function() {
    return typeof Symbol !== 'undefined' && Symbol.toStringTag;
  };

  window.checkCSS = function(property, value) {
    return CSS && CSS.supports && CSS.supports(property, value);
  };

  window.checkHTML5Validation = function() {
    const input = document.createElement('input');
    return typeof input.checkValidity === 'function';
  };

  window.checkInputTypes = function() {
    const input = document.createElement('input');
    const types = ['email', 'date', 'number', 'range', 'color'];
    const support = {};
    
    types.forEach(type => {
      input.type = type;
      support[type] = input.type === type;
    });
    
    return support;
  };
`;