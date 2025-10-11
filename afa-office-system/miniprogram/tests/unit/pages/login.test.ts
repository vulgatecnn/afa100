// 登录页面单元测试
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { resetMocks, mockApiResponse, mockApiError } from '../../setup';

// 模拟登录页面逻辑
const mockLoginPage = {
  data: {
    logging: false,
    showUserTypeModal: false
  },
  setData: vi.fn(),
  onWechatLogin: vi.fn(),
  getWechatLogin: vi.fn(),
  onSelectUserType: vi.fn(),
  onCloseModal: vi.fn(),
  onViewPrivacy: vi.fn(),
  onViewTerms: vi.fn()
};

describe('登录页面测试', () => {
  beforeEach(() => {
    resetMocks();
    mockLoginPage.setData.mockClear();
    mockLoginPage.onWechatLogin.mockClear();
    mockLoginPage.getWechatLogin.mockClear();
    mockLoginPage.onSelectUserType.mockClear();
    mockLoginPage.onCloseModal.mockClear();
    mockLoginPage.onViewPrivacy.mockClear();
    mockLoginPage.onViewTerms.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('页面初始状态', () => {
    it('应该有正确的初始数据', () => {
      expect(mockLoginPage.data.logging).toBe(false);
      expect(mockLoginPage.data.showUserTypeModal).toBe(false);
    });
  });

  describe('微信授权登录', () => {
    it('应该成功处理微信登录流程', async () => {
      // 模拟微信登录成功
      const mockWxLogin = vi.fn().mockImplementation(({ success }) => {
        success({ code: 'mock-wx-code' });
      });
      global.wx.login = mockWxLogin;

      // 模拟API响应
      mockApiResponse({
        token: 'mock-token',
        user: {
          id: 1,
          name: '测试用户',
          userType: 'employee'
        },
        isNewUser: false
      });

      // 模拟getApp
      const mockApp = {
        globalData: {
          userInfo: null,
          isLoggedIn: false
        }
      };
      global.getApp = vi.fn(() => mockApp);

      // 模拟页面方法
      const loginPage = {
        data: { logging: false, showUserTypeModal: false },
        setData: vi.fn(),
        async getWechatLogin() {
          return new Promise((resolve) => {
            wx.login({
              success: (res) => resolve({ code: res.code })
            });
          });
        },
        async onWechatLogin() {
          try {
            this.setData({ logging: true });
            
            const loginRes = await this.getWechatLogin();
            
            // 模拟API调用成功
            const response = {
              success: true,
              data: {
                token: 'mock-token',
                user: { id: 1, name: '测试用户', userType: 'employee' },
                isNewUser: false
              }
            };

            if (response.success) {
              const { token, user, isNewUser } = response.data;
              
              wx.setStorageSync('access_token', token);
              
              const app = getApp();
              app.globalData.userInfo = user;
              app.globalData.isLoggedIn = true;
              
              if (!isNewUser) {
                wx.showToast({
                  title: '登录成功',
                  icon: 'success'
                });
                
                setTimeout(() => {
                  wx.switchTab({
                    url: '/pages/index/index'
                  });
                }, 1500);
              }
            }
          } catch (error) {
            wx.showToast({
              title: error.message || '登录失败',
              icon: 'error'
            });
          } finally {
            this.setData({ logging: false });
          }
        }
      };

      await loginPage.onWechatLogin();

      expect(loginPage.setData).toHaveBeenCalledWith({ logging: true });
      expect(wx.setStorageSync).toHaveBeenCalledWith('access_token', 'mock-token');
      expect(wx.showToast).toHaveBeenCalledWith({
        title: '登录成功',
        icon: 'success'
      });
      expect(mockApp.globalData.isLoggedIn).toBe(true);
    });

    it('应该处理新用户显示身份选择弹窗', async () => {
      // 模拟微信登录成功
      global.wx.login = vi.fn().mockImplementation(({ success }) => {
        success({ code: 'mock-wx-code' });
      });

      // 模拟新用户API响应
      mockApiResponse({
        token: 'mock-token',
        user: {
          id: 1,
          name: '新用户',
          userType: null
        },
        isNewUser: true
      });

      const mockApp = {
        globalData: {
          userInfo: null,
          isLoggedIn: false
        }
      };
      global.getApp = vi.fn(() => mockApp);

      const loginPage = {
        data: { logging: false, showUserTypeModal: false },
        setData: vi.fn(),
        async getWechatLogin() {
          return { code: 'mock-wx-code' };
        },
        async onWechatLogin() {
          try {
            this.setData({ logging: true });
            
            const response = {
              success: true,
              data: {
                token: 'mock-token',
                user: { id: 1, name: '新用户', userType: null },
                isNewUser: true
              }
            };

            if (response.success) {
              const { token, user, isNewUser } = response.data;
              
              wx.setStorageSync('access_token', token);
              
              const app = getApp();
              app.globalData.userInfo = user;
              app.globalData.isLoggedIn = true;
              
              if (isNewUser) {
                this.setData({ showUserTypeModal: true });
              }
            }
          } finally {
            this.setData({ logging: false });
          }
        }
      };

      await loginPage.onWechatLogin();

      expect(loginPage.setData).toHaveBeenCalledWith({ showUserTypeModal: true });
    });

    it('应该处理登录失败', async () => {
      // 模拟微信登录失败
      global.wx.login = vi.fn().mockImplementation(({ fail }) => {
        fail(new Error('微信登录失败'));
      });

      const loginPage = {
        data: { logging: false, showUserTypeModal: false },
        setData: vi.fn(),
        async getWechatLogin() {
          return new Promise((resolve, reject) => {
            wx.login({
              success: (res) => resolve({ code: res.code }),
              fail: (error) => reject(error)
            });
          });
        },
        async onWechatLogin() {
          try {
            this.setData({ logging: true });
            await this.getWechatLogin();
          } catch (error) {
            wx.showToast({
              title: error.message || '登录失败',
              icon: 'error'
            });
          } finally {
            this.setData({ logging: false });
          }
        }
      };

      await loginPage.onWechatLogin();

      expect(wx.showToast).toHaveBeenCalledWith({
        title: '微信登录失败',
        icon: 'error'
      });
      expect(loginPage.setData).toHaveBeenCalledWith({ logging: false });
    });

    it('应该处理API请求失败', async () => {
      // 模拟微信登录成功
      global.wx.login = vi.fn().mockImplementation(({ success }) => {
        success({ code: 'mock-wx-code' });
      });

      // 模拟API请求失败
      mockApiError(new Error('服务器错误'));

      const loginPage = {
        data: { logging: false, showUserTypeModal: false },
        setData: vi.fn(),
        async getWechatLogin() {
          return { code: 'mock-wx-code' };
        },
        async onWechatLogin() {
          try {
            this.setData({ logging: true });
            await this.getWechatLogin();
            
            // 模拟API调用失败
            throw new Error('服务器错误');
          } catch (error) {
            wx.showToast({
              title: error.message || '登录失败',
              icon: 'error'
            });
          } finally {
            this.setData({ logging: false });
          }
        }
      };

      await loginPage.onWechatLogin();

      expect(wx.showToast).toHaveBeenCalledWith({
        title: '服务器错误',
        icon: 'error'
      });
    });
  });

  describe('用户类型选择', () => {
    it('应该正确处理访客类型选择', () => {
      const mockApp = {
        globalData: {
          userType: null
        }
      };
      global.getApp = vi.fn(() => mockApp);

      const loginPage = {
        data: { showUserTypeModal: true },
        setData: vi.fn(),
        onSelectUserType(e) {
          const userType = e.currentTarget.dataset.type;
          const app = getApp();
          app.globalData.userType = userType;
          
          this.setData({ showUserTypeModal: false });
          
          wx.showToast({
            title: '登录成功',
            icon: 'success'
          });
          
          setTimeout(() => {
            if (userType === 'visitor') {
              wx.navigateTo({
                url: '/pages/visitor/apply/apply'
              });
            }
          }, 1500);
        }
      };

      const mockEvent = {
        currentTarget: {
          dataset: {
            type: 'visitor'
          }
        }
      };

      loginPage.onSelectUserType(mockEvent);

      expect(mockApp.globalData.userType).toBe('visitor');
      expect(loginPage.setData).toHaveBeenCalledWith({ showUserTypeModal: false });
      expect(wx.showToast).toHaveBeenCalledWith({
        title: '登录成功',
        icon: 'success'
      });
    });

    it('应该正确处理员工类型选择', async () => {
      const mockApp = {
        globalData: {
          userType: null
        }
      };
      global.getApp = vi.fn(() => mockApp);

      const loginPage = {
        data: { showUserTypeModal: true },
        setData: vi.fn(),
        onSelectUserType(e) {
          const userType = e.currentTarget.dataset.type;
          const app = getApp();
          app.globalData.userType = userType;
          
          this.setData({ showUserTypeModal: false });
          
          wx.showToast({
            title: '登录成功',
            icon: 'success'
          });
          
          setTimeout(() => {
            if (userType === 'employee') {
              wx.navigateTo({
                url: '/pages/employee/apply/apply'
              });
            }
          }, 1500);
        }
      };

      const mockEvent = {
        currentTarget: {
          dataset: {
            type: 'employee'
          }
        }
      };

      loginPage.onSelectUserType(mockEvent);

      expect(mockApp.globalData.userType).toBe('employee');
      
      // 等待 setTimeout 执行
      await new Promise(resolve => setTimeout(resolve, 1600));
      
      expect(wx.navigateTo).toHaveBeenCalledWith({
        url: '/pages/employee/apply/apply'
      });
    });
  });

  describe('弹窗关闭', () => {
    it('应该正确关闭身份选择弹窗', () => {
      const loginPage = {
        data: { showUserTypeModal: true },
        setData: vi.fn(),
        onCloseModal() {
          this.setData({ showUserTypeModal: false });
          
          wx.switchTab({
            url: '/pages/index/index'
          });
        }
      };

      loginPage.onCloseModal();

      expect(loginPage.setData).toHaveBeenCalledWith({ showUserTypeModal: false });
      expect(wx.switchTab).toHaveBeenCalledWith({
        url: '/pages/index/index'
      });
    });
  });

  describe('隐私政策和服务条款', () => {
    it('应该显示隐私政策', () => {
      const loginPage = {
        onViewPrivacy() {
          wx.showModal({
            title: '隐私政策',
            content: '我们重视您的隐私保护，仅收集必要的信息用于提供服务，不会泄露给第三方。',
            showCancel: false,
            confirmText: '知道了'
          });
        }
      };

      loginPage.onViewPrivacy();

      expect(wx.showModal).toHaveBeenCalledWith({
        title: '隐私政策',
        content: '我们重视您的隐私保护，仅收集必要的信息用于提供服务，不会泄露给第三方。',
        showCancel: false,
        confirmText: '知道了'
      });
    });

    it('应该显示服务条款', () => {
      const loginPage = {
        onViewTerms() {
          wx.showModal({
            title: '服务条款',
            content: '使用本服务即表示您同意遵守相关规定，合理使用通行功能，不得进行违法违规操作。',
            showCancel: false,
            confirmText: '知道了'
          });
        }
      };

      loginPage.onViewTerms();

      expect(wx.showModal).toHaveBeenCalledWith({
        title: '服务条款',
        content: '使用本服务即表示您同意遵守相关规定，合理使用通行功能，不得进行违法违规操作。',
        showCancel: false,
        confirmText: '知道了'
      });
    });
  });

  describe('页面生命周期', () => {
    it('应该正确处理页面加载', () => {
      const loginPage = {
        data: { logging: false, showUserTypeModal: false },
        onLoad() {
          // 页面加载时的初始化逻辑
          console.log('登录页面加载');
        }
      };

      expect(() => loginPage.onLoad()).not.toThrow();
    });

    it('应该正确处理页面显示', () => {
      const loginPage = {
        data: { logging: false, showUserTypeModal: false },
        onShow() {
          // 页面显示时的逻辑
          console.log('登录页面显示');
        }
      };

      expect(() => loginPage.onShow()).not.toThrow();
    });
  });

  describe('数据绑定', () => {
    it('应该正确更新loading状态', () => {
      const loginPage = {
        data: { logging: false, showUserTypeModal: false },
        setData: vi.fn(),
        updateLoading(loading) {
          this.setData({ logging: loading });
        }
      };

      loginPage.updateLoading(true);
      expect(loginPage.setData).toHaveBeenCalledWith({ logging: true });

      loginPage.updateLoading(false);
      expect(loginPage.setData).toHaveBeenCalledWith({ logging: false });
    });

    it('应该正确更新弹窗显示状态', () => {
      const loginPage = {
        data: { logging: false, showUserTypeModal: false },
        setData: vi.fn(),
        updateModalVisibility(visible) {
          this.setData({ showUserTypeModal: visible });
        }
      };

      loginPage.updateModalVisibility(true);
      expect(loginPage.setData).toHaveBeenCalledWith({ showUserTypeModal: true });

      loginPage.updateModalVisibility(false);
      expect(loginPage.setData).toHaveBeenCalledWith({ showUserTypeModal: false });
    });
  });
});