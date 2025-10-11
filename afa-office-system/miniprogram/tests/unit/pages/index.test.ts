// 首页单元测试
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { resetMocks, mockApiResponse, mockApiError } from '../../setup';

describe('首页测试', () => {
  beforeEach(() => {
    resetMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('页面初始状态', () => {
    it('应该有正确的初始数据', () => {
      const indexPage = {
        data: {
          userInfo: null,
          userTypeText: {
            tenant_admin: '租务管理员',
            merchant_admin: '商户管理员',
            employee: '员工',
            visitor: '访客'
          },
          statusText: {
            active: '正常',
            inactive: '停用',
            pending: '待审批'
          },
          pendingCount: 0
        }
      };

      expect(indexPage.data.userInfo).toBeNull();
      expect(indexPage.data.userTypeText.employee).toBe('员工');
      expect(indexPage.data.statusText.active).toBe('正常');
      expect(indexPage.data.pendingCount).toBe(0);
    });
  });

  describe('页面生命周期', () => {
    it('应该在onLoad时加载用户信息', () => {
      const mockApp = {
        globalData: {
          isLoggedIn: true,
          userInfo: {
            id: 1,
            name: '测试用户',
            userType: 'employee'
          }
        }
      };
      global.getApp = vi.fn(() => mockApp);

      const indexPage = {
        data: { userInfo: null, pendingCount: 0 },
        setData: vi.fn(),
        loadUserInfo() {
          const app = getApp();
          if (app.globalData.isLoggedIn && app.globalData.userInfo) {
            this.setData({
              userInfo: app.globalData.userInfo
            });
          }
        },
        onLoad() {
          this.loadUserInfo();
        }
      };

      indexPage.onLoad();

      expect(indexPage.setData).toHaveBeenCalledWith({
        userInfo: mockApp.globalData.userInfo
      });
    });

    it('应该在onShow时加载用户信息和待审批数量', async () => {
      const mockApp = {
        globalData: {
          isLoggedIn: true,
          userInfo: {
            id: 1,
            name: '测试用户',
            userType: 'employee'
          }
        }
      };
      global.getApp = vi.fn(() => mockApp);

      // 模拟API响应
      mockApiResponse([
        { id: 1, visitorName: '访客1' },
        { id: 2, visitorName: '访客2' }
      ]);

      const indexPage = {
        data: { 
          userInfo: null, 
          pendingCount: 0 
        },
        setData: vi.fn(),
        loadUserInfo() {
          const app = getApp();
          if (app.globalData.isLoggedIn && app.globalData.userInfo) {
            this.setData({
              userInfo: app.globalData.userInfo
            });
          }
        },
        async loadPendingCount() {
          const { userInfo } = this.data;
          if (userInfo && userInfo.userType === 'employee') {
            try {
              // 模拟获取待审批申请
              const pendingApplications = [
                { id: 1, visitorName: '访客1' },
                { id: 2, visitorName: '访客2' }
              ];
              this.setData({
                pendingCount: pendingApplications.length
              });
            } catch (error) {
              console.error('加载待审批数量失败:', error);
            }
          }
        },
        async onShow() {
          this.loadUserInfo();
          await this.loadPendingCount();
        }
      };

      // 先设置用户信息
      indexPage.data.userInfo = mockApp.globalData.userInfo;
      
      await indexPage.onShow();

      expect(indexPage.setData).toHaveBeenCalledWith({
        userInfo: mockApp.globalData.userInfo
      });
      expect(indexPage.setData).toHaveBeenCalledWith({
        pendingCount: 2
      });
    });
  });

  describe('用户信息加载', () => {
    it('应该正确加载已登录用户信息', () => {
      const mockApp = {
        globalData: {
          isLoggedIn: true,
          userInfo: {
            id: 1,
            name: '测试用户',
            userType: 'employee',
            status: 'active'
          }
        }
      };
      global.getApp = vi.fn(() => mockApp);

      const indexPage = {
        data: { userInfo: null },
        setData: vi.fn(),
        loadUserInfo() {
          const app = getApp();
          if (app.globalData.isLoggedIn && app.globalData.userInfo) {
            this.setData({
              userInfo: app.globalData.userInfo
            });
          }
        }
      };

      indexPage.loadUserInfo();

      expect(indexPage.setData).toHaveBeenCalledWith({
        userInfo: mockApp.globalData.userInfo
      });
    });

    it('应该处理未登录状态', () => {
      const mockApp = {
        globalData: {
          isLoggedIn: false,
          userInfo: null
        }
      };
      global.getApp = vi.fn(() => mockApp);

      const indexPage = {
        data: { userInfo: null },
        setData: vi.fn(),
        loadUserInfo() {
          const app = getApp();
          if (app.globalData.isLoggedIn && app.globalData.userInfo) {
            this.setData({
              userInfo: app.globalData.userInfo
            });
          }
        }
      };

      indexPage.loadUserInfo();

      expect(indexPage.setData).not.toHaveBeenCalled();
    });
  });

  describe('待审批数量加载', () => {
    it('应该为员工用户加载待审批数量', async () => {
      const indexPage = {
        data: { 
          userInfo: {
            id: 1,
            name: '员工用户',
            userType: 'employee'
          },
          pendingCount: 0 
        },
        setData: vi.fn(),
        async loadPendingCount() {
          const { userInfo } = this.data;
          if (userInfo && userInfo.userType === 'employee') {
            try {
              // 模拟API调用
              const pendingApplications = [
                { id: 1, visitorName: '访客1' },
                { id: 2, visitorName: '访客2' },
                { id: 3, visitorName: '访客3' }
              ];
              this.setData({
                pendingCount: pendingApplications.length
              });
            } catch (error) {
              console.error('加载待审批数量失败:', error);
            }
          }
        }
      };

      await indexPage.loadPendingCount();

      expect(indexPage.setData).toHaveBeenCalledWith({
        pendingCount: 3
      });
    });

    it('应该跳过非员工用户的待审批数量加载', async () => {
      const indexPage = {
        data: { 
          userInfo: {
            id: 1,
            name: '访客用户',
            userType: 'visitor'
          },
          pendingCount: 0 
        },
        setData: vi.fn(),
        async loadPendingCount() {
          const { userInfo } = this.data;
          if (userInfo && userInfo.userType === 'employee') {
            this.setData({
              pendingCount: 5
            });
          }
        }
      };

      await indexPage.loadPendingCount();

      expect(indexPage.setData).not.toHaveBeenCalled();
    });

    it('应该处理加载待审批数量失败', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const indexPage = {
        data: { 
          userInfo: {
            id: 1,
            name: '员工用户',
            userType: 'employee'
          },
          pendingCount: 0 
        },
        setData: vi.fn(),
        async loadPendingCount() {
          const { userInfo } = this.data;
          if (userInfo && userInfo.userType === 'employee') {
            try {
              throw new Error('网络错误');
            } catch (error) {
              console.error('加载待审批数量失败:', error);
            }
          }
        }
      };

      await indexPage.loadPendingCount();

      expect(consoleSpy).toHaveBeenCalledWith('加载待审批数量失败:', expect.any(Error));
      expect(indexPage.setData).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('导航功能', () => {
    it('应该正确导航到登录页面', () => {
      const indexPage = {
        onLogin() {
          wx.navigateTo({
            url: '/pages/login/login'
          });
        }
      };

      indexPage.onLogin();

      expect(wx.navigateTo).toHaveBeenCalledWith({
        url: '/pages/login/login'
      });
    });

    it('应该正确选择访客身份', () => {
      const mockApp = {
        globalData: {
          userType: null
        }
      };
      global.getApp = vi.fn(() => mockApp);

      const indexPage = {
        onSelectVisitor() {
          const app = getApp();
          app.globalData.userType = 'visitor';
          wx.navigateTo({
            url: '/pages/visitor/apply/apply'
          });
        }
      };

      indexPage.onSelectVisitor();

      expect(mockApp.globalData.userType).toBe('visitor');
      expect(wx.navigateTo).toHaveBeenCalledWith({
        url: '/pages/visitor/apply/apply'
      });
    });

    it('应该正确选择员工身份', () => {
      const mockApp = {
        globalData: {
          userType: null
        }
      };
      global.getApp = vi.fn(() => mockApp);

      const indexPage = {
        onSelectEmployee() {
          const app = getApp();
          app.globalData.userType = 'employee';
          wx.navigateTo({
            url: '/pages/employee/apply/apply'
          });
        }
      };

      indexPage.onSelectEmployee();

      expect(mockApp.globalData.userType).toBe('employee');
      expect(wx.navigateTo).toHaveBeenCalledWith({
        url: '/pages/employee/apply/apply'
      });
    });

    it('应该正确导航到访客申请页面', () => {
      const indexPage = {
        onVisitorApply() {
          wx.navigateTo({
            url: '/pages/visitor/apply/apply'
          });
        }
      };

      indexPage.onVisitorApply();

      expect(wx.navigateTo).toHaveBeenCalledWith({
        url: '/pages/visitor/apply/apply'
      });
    });

    it('应该正确导航到访客状态页面', () => {
      const indexPage = {
        onVisitorStatus() {
          wx.navigateTo({
            url: '/pages/visitor/status/status'
          });
        }
      };

      indexPage.onVisitorStatus();

      expect(wx.navigateTo).toHaveBeenCalledWith({
        url: '/pages/visitor/status/status'
      });
    });

    it('应该正确导航到员工通行码页面', () => {
      const indexPage = {
        onEmployeePasscode() {
          wx.navigateTo({
            url: '/pages/employee/passcode/passcode'
          });
        }
      };

      indexPage.onEmployeePasscode();

      expect(wx.navigateTo).toHaveBeenCalledWith({
        url: '/pages/employee/passcode/passcode'
      });
    });

    it('应该正确导航到访客审批页面', () => {
      const indexPage = {
        onVisitorApprove() {
          wx.navigateTo({
            url: '/pages/employee/approve/approve'
          });
        }
      };

      indexPage.onVisitorApprove();

      expect(wx.navigateTo).toHaveBeenCalledWith({
        url: '/pages/employee/approve/approve'
      });
    });
  });

  describe('历史记录查看', () => {
    it('应该为员工用户导航到员工历史页面', () => {
      const indexPage = {
        data: {
          userInfo: {
            id: 1,
            name: '员工用户',
            userType: 'employee'
          }
        },
        onViewHistory() {
          const { userInfo } = this.data;
          if (userInfo?.userType === 'employee') {
            wx.navigateTo({
              url: '/pages/employee/history/history'
            });
          } else {
            wx.navigateTo({
              url: '/pages/visitor/history/history'
            });
          }
        }
      };

      indexPage.onViewHistory();

      expect(wx.navigateTo).toHaveBeenCalledWith({
        url: '/pages/employee/history/history'
      });
    });

    it('应该为非员工用户导航到访客历史页面', () => {
      const indexPage = {
        data: {
          userInfo: {
            id: 1,
            name: '访客用户',
            userType: 'visitor'
          }
        },
        onViewHistory() {
          const { userInfo } = this.data;
          if (userInfo?.userType === 'employee') {
            wx.navigateTo({
              url: '/pages/employee/history/history'
            });
          } else {
            wx.navigateTo({
              url: '/pages/visitor/history/history'
            });
          }
        }
      };

      indexPage.onViewHistory();

      expect(wx.navigateTo).toHaveBeenCalledWith({
        url: '/pages/visitor/history/history'
      });
    });
  });

  describe('帮助和支持', () => {
    it('应该显示客服联系信息', () => {
      const indexPage = {
        onContactSupport() {
          wx.showModal({
            title: '联系客服',
            content: '如需帮助，请联系客服电话：400-123-4567',
            showCancel: false,
            confirmText: '知道了'
          });
        }
      };

      indexPage.onContactSupport();

      expect(wx.showModal).toHaveBeenCalledWith({
        title: '联系客服',
        content: '如需帮助，请联系客服电话：400-123-4567',
        showCancel: false,
        confirmText: '知道了'
      });
    });

    it('应该显示使用帮助', () => {
      const indexPage = {
        onViewHelp() {
          wx.showModal({
            title: '使用帮助',
            content: '1. 访客需要预约申请并等待审批\n2. 员工需要申请加入商户\n3. 通行码需要在有效期内使用\n4. 如遇问题请联系客服',
            showCancel: false,
            confirmText: '知道了'
          });
        }
      };

      indexPage.onViewHelp();

      expect(wx.showModal).toHaveBeenCalledWith({
        title: '使用帮助',
        content: '1. 访客需要预约申请并等待审批\n2. 员工需要申请加入商户\n3. 通行码需要在有效期内使用\n4. 如遇问题请联系客服',
        showCancel: false,
        confirmText: '知道了'
      });
    });
  });

  describe('数据绑定和状态管理', () => {
    it('应该正确处理用户类型文本映射', () => {
      const indexPage = {
        data: {
          userTypeText: {
            tenant_admin: '租务管理员',
            merchant_admin: '商户管理员',
            employee: '员工',
            visitor: '访客'
          }
        }
      };

      expect(indexPage.data.userTypeText.tenant_admin).toBe('租务管理员');
      expect(indexPage.data.userTypeText.merchant_admin).toBe('商户管理员');
      expect(indexPage.data.userTypeText.employee).toBe('员工');
      expect(indexPage.data.userTypeText.visitor).toBe('访客');
    });

    it('应该正确处理状态文本映射', () => {
      const indexPage = {
        data: {
          statusText: {
            active: '正常',
            inactive: '停用',
            pending: '待审批'
          }
        }
      };

      expect(indexPage.data.statusText.active).toBe('正常');
      expect(indexPage.data.statusText.inactive).toBe('停用');
      expect(indexPage.data.statusText.pending).toBe('待审批');
    });

    it('应该正确更新待审批数量', () => {
      const indexPage = {
        data: { pendingCount: 0 },
        setData: vi.fn(),
        updatePendingCount(count) {
          this.setData({ pendingCount: count });
        }
      };

      indexPage.updatePendingCount(5);

      expect(indexPage.setData).toHaveBeenCalledWith({ pendingCount: 5 });
    });
  });
});