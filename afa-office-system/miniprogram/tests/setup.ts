// 测试环境设置
import { vi } from 'vitest';

// Mock 微信小程序全局对象
const mockWx = {
  // 网络请求
  request: vi.fn(),
  
  // 数据存储
  getStorageSync: vi.fn(),
  setStorageSync: vi.fn(),
  removeStorageSync: vi.fn(),
  clearStorageSync: vi.fn(),
  getStorageInfo: vi.fn(),
  getStorageInfoSync: vi.fn(),
  
  // 界面交互
  showToast: vi.fn(),
  showModal: vi.fn(),
  showLoading: vi.fn(),
  hideLoading: vi.fn(),
  showActionSheet: vi.fn(),
  
  // 导航
  navigateTo: vi.fn(),
  redirectTo: vi.fn(),
  switchTab: vi.fn(),
  navigateBack: vi.fn(),
  
  // 下拉刷新
  startPullDownRefresh: vi.fn(),
  stopPullDownRefresh: vi.fn(),
  
  // 登录
  login: vi.fn(),
  getUserInfo: vi.fn(),
  
  // Canvas
  createCanvasContext: vi.fn(),
  canvasToTempFilePath: vi.fn(),
  
  // 文件系统
  saveImageToPhotosAlbum: vi.fn(),
  
  // 分享
  updateShareMenu: vi.fn(),
  
  // 其他
  getSystemInfo: vi.fn(),
  setNavigationBarTitle: vi.fn(),
  setClipboardData: vi.fn(),
  getClipboardData: vi.fn(),
  
  // 设备信息
  getNetworkType: vi.fn(),
  
  // 位置
  getLocation: vi.fn(),
  
  // 扫码
  scanCode: vi.fn()
};

// Mock getApp 函数
const mockApp = {
  globalData: {
    apiBase: 'http://localhost:3000',
    userInfo: null,
    isLoggedIn: false,
    userType: null
  },
  checkLoginStatus: vi.fn(),
  validateToken: vi.fn()
};

// Mock Page 构造函数
const mockPage = vi.fn((config) => {
  const pageInstance = {
    data: config.data || {},
    options: {},
    route: '',
    setData: vi.fn(function(this: any, newData: any, callback?: () => void) {
      Object.assign(this.data, newData);
      if (callback) callback();
    }),
    selectComponent: vi.fn(),
    selectAllComponents: vi.fn(),
    createSelectorQuery: vi.fn(),
    createIntersectionObserver: vi.fn(),
    ...config
  };

  // 绑定方法的 this 上下文
  Object.keys(config).forEach(key => {
    if (typeof config[key] === 'function' && key !== 'setData') {
      pageInstance[key] = config[key].bind(pageInstance);
    }
  });

  return pageInstance;
});

// Mock Component 构造函数
const mockComponent = vi.fn((config) => {
  const componentInstance = {
    data: config.data || {},
    properties: config.properties || {},
    methods: config.methods || {},
    observers: config.observers || {},
    lifetimes: config.lifetimes || {},
    setData: vi.fn(function(this: any, newData: any, callback?: () => void) {
      Object.assign(this.data, newData);
      if (callback) callback();
    }),
    triggerEvent: vi.fn(),
    selectComponent: vi.fn(),
    selectAllComponents: vi.fn(),
    getRelationNodes: vi.fn(),
    ...config
  };

  // 绑定方法的 this 上下文
  if (config.methods) {
    Object.keys(config.methods).forEach(methodName => {
      if (typeof config.methods[methodName] === 'function') {
        componentInstance[methodName] = config.methods[methodName].bind(componentInstance);
      }
    });
  }

  // 绑定生命周期方法的 this 上下文
  if (config.lifetimes) {
    Object.keys(config.lifetimes).forEach(lifetimeName => {
      if (typeof config.lifetimes[lifetimeName] === 'function') {
        componentInstance[lifetimeName] = config.lifetimes[lifetimeName].bind(componentInstance);
      }
    });
  }

  // 支持直接在 config 中定义生命周期方法
  ['attached', 'ready', 'moved', 'detached'].forEach(lifetimeName => {
    if (config[lifetimeName] && typeof config[lifetimeName] === 'function') {
      componentInstance[lifetimeName] = config[lifetimeName].bind(componentInstance);
    }
  });

  return componentInstance;
});

// 设置全局 Mock
// @ts-ignore
global.wx = mockWx;
// @ts-ignore
global.getApp = vi.fn(() => mockApp);
// @ts-ignore
global.Page = mockPage;
// @ts-ignore
global.Component = mockComponent;

// Mock console 方法
global.console = {
  ...console,
  log: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  info: vi.fn()
};

// 设置默认的 wx.request 行为
mockWx.request.mockImplementation(({ success, fail }) => {
  // 默认成功响应
  if (success) {
    success({
      statusCode: 200,
      data: {
        success: true,
        data: null,
        message: 'success'
      }
    });
  }
});

// 设置默认的存储行为
mockWx.getStorageSync.mockReturnValue('');
mockWx.setStorageSync.mockImplementation(() => {});

// 设置默认的存储信息行为
mockWx.getStorageInfoSync = vi.fn().mockReturnValue({
  keys: [],
  currentSize: 0,
  limitSize: 10240
});

// 设置默认的登录行为
mockWx.login.mockImplementation(({ success }) => {
  if (success) {
    success({ code: 'mock-code' });
  }
});

// 设置默认的系统信息
mockWx.getSystemInfo.mockImplementation(({ success }) => {
  if (success) {
    success({
      platform: 'devtools',
      system: 'iOS 14.0',
      version: '8.0.5',
      screenWidth: 375,
      screenHeight: 812,
      windowWidth: 375,
      windowHeight: 812
    });
  }
});

// 设置默认的 Canvas 行为
mockWx.createCanvasContext.mockImplementation(() => {
  return {
    setFillStyle: vi.fn(),
    fillRect: vi.fn(),
    setStrokeStyle: vi.fn(),
    strokeRect: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    fill: vi.fn(),
    arc: vi.fn(),
    setFontSize: vi.fn(),
    fillText: vi.fn(),
    draw: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    scale: vi.fn(),
    rotate: vi.fn(),
    clearRect: vi.fn(),
    clip: vi.fn(),
    setLineCap: vi.fn(),
    setLineJoin: vi.fn(),
    setLineWidth: vi.fn(),
    setMiterLimit: vi.fn(),
    rect: vi.fn(),
    arcTo: vi.fn(),
    bezierCurveTo: vi.fn(),
    quadraticCurveTo: vi.fn(),
    closePath: vi.fn()
  };
});

// 设置默认的 showActionSheet 行为
mockWx.showActionSheet.mockImplementation(({ success, fail, complete }) => {
  if (success) {
    success({ tapIndex: 0 });
  }
  if (complete) {
    complete({ tapIndex: 0 });
  }
});

// 设置默认的存储信息行为
mockWx.getStorageInfo.mockImplementation(({ success }) => {
  if (success) {
    success({
      keys: [],
      currentSize: 0,
      limitSize: 10240
    });
  }
});

// 设置默认的保存图片行为
mockWx.saveImageToPhotosAlbum.mockImplementation(({ success }) => {
  if (success) {
    success({});
  }
});

// 设置默认的网络类型
mockWx.getNetworkType.mockImplementation(({ success }) => {
  if (success) {
    success({
      networkType: 'wifi',
      isConnected: true
    });
  }
});

// 导出测试工具函数
export const createMockPage = (config: any) => {
  return mockPage(config);
};

export const createMockComponent = (config: any) => {
  const componentInstance = mockComponent(config);
  
  // 确保所有方法都绑定到正确的上下文
  if (config.methods) {
    Object.keys(config.methods).forEach(methodName => {
      if (typeof config.methods[methodName] === 'function') {
        componentInstance[methodName] = config.methods[methodName].bind(componentInstance);
      }
    });
  }
  
  // 绑定生命周期方法
  ['attached', 'ready', 'moved', 'detached', 'created'].forEach(lifetimeName => {
    if (config[lifetimeName] && typeof config[lifetimeName] === 'function') {
      componentInstance[lifetimeName] = config[lifetimeName].bind(componentInstance);
    }
  });
  
  // 绑定观察器
  if (config.observers) {
    componentInstance.observers = {};
    Object.keys(config.observers).forEach(observerName => {
      if (typeof config.observers[observerName] === 'function') {
        componentInstance.observers[observerName] = config.observers[observerName].bind(componentInstance);
      }
    });
  }
  
  return componentInstance;
};

export const resetMocks = () => {
  vi.clearAllMocks();
  
  // 重置 wx 对象的所有方法
  Object.values(mockWx).forEach(fn => {
    if (typeof fn === 'function') {
      fn.mockClear();
    }
  });
  
  // 重置默认行为
  mockWx.request.mockImplementation(({ success }) => {
    if (success) {
      success({
        statusCode: 200,
        data: { success: true, data: null }
      });
    }
  });
  
  mockWx.getStorageSync.mockReturnValue('');
};

export const mockApiResponse = (data: any, success = true) => {
  mockWx.request.mockImplementationOnce(({ success: successCallback }) => {
    if (successCallback) {
      successCallback({
        statusCode: success ? 200 : 400,
        data: data
      });
    }
  });
};

export const mockApiError = (error: Error) => {
  mockWx.request.mockImplementationOnce(({ fail }) => {
    if (fail) {
      fail(error);
    }
  });
};

export { mockWx, mockApp, mockPage, mockComponent };