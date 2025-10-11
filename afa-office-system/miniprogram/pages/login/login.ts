// 登录页面逻辑
import ApiService from '../../services/api';

interface PageData {
  logging: boolean;
  showUserTypeModal: boolean;
}

Page<PageData>({
  data: {
    logging: false,
    showUserTypeModal: false
  },

  // 微信授权登录
  async onWechatLogin() {
    try {
      this.setData({ logging: true });
      
      // 获取微信授权
      const loginRes = await this.getWechatLogin();
      
      // 调用后端登录接口
      const response = await ApiService.post('/api/v1/auth/wechat-login', {
        code: loginRes.code
      });
      
      if (response.success) {
        const { token, user, isNewUser } = response.data;
        
        // 保存token和用户信息
        wx.setStorageSync('access_token', token);
        
        const app = getApp<IAppOption>();
        app.globalData.userInfo = user;
        app.globalData.isLoggedIn = true;
        
        if (isNewUser) {
          // 新用户需要选择身份类型
          this.setData({ showUserTypeModal: true });
        } else {
          // 老用户直接跳转到首页
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
      } else {
        throw new Error(response.message || '登录失败');
      }
      
    } catch (error) {
      wx.showToast({
        title: error.message || '登录失败',
        icon: 'error'
      });
    } finally {
      this.setData({ logging: false });
    }
  },

  // 获取微信登录凭证
  getWechatLogin(): Promise<{ code: string }> {
    return new Promise((resolve, reject) => {
      wx.login({
        success: (res) => {
          if (res.code) {
            resolve({ code: res.code });
          } else {
            reject(new Error('获取微信登录凭证失败'));
          }
        },
        fail: (error) => {
          reject(error);
        }
      });
    });
  },

  // 选择用户类型
  onSelectUserType(e: any) {
    const userType = e.currentTarget.dataset.type;
    const app = getApp<IAppOption>();
    app.globalData.userType = userType;
    
    this.setData({ showUserTypeModal: false });
    
    wx.showToast({
      title: '登录成功',
      icon: 'success'
    });
    
    // 根据用户类型跳转到对应页面
    setTimeout(() => {
      if (userType === 'visitor') {
        wx.navigateTo({
          url: '/pages/visitor/apply/apply'
        });
      } else if (userType === 'employee') {
        wx.navigateTo({
          url: '/pages/employee/apply/apply'
        });
      } else {
        wx.switchTab({
          url: '/pages/index/index'
        });
      }
    }, 1500);
  },

  // 关闭身份选择弹窗
  onCloseModal() {
    this.setData({ showUserTypeModal: false });
    
    // 直接跳转到首页
    wx.switchTab({
      url: '/pages/index/index'
    });
  },

  // 查看隐私政策
  onViewPrivacy() {
    wx.showModal({
      title: '隐私政策',
      content: '我们重视您的隐私保护，仅收集必要的信息用于提供服务，不会泄露给第三方。',
      showCancel: false,
      confirmText: '知道了'
    });
  },

  // 查看服务条款
  onViewTerms() {
    wx.showModal({
      title: '服务条款',
      content: '使用本服务即表示您同意遵守相关规定，合理使用通行功能，不得进行违法违规操作。',
      showCancel: false,
      confirmText: '知道了'
    });
  }
});