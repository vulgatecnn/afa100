// 小程序入口文件
interface IAppOption {
  globalData: {
    apiBase: string;
    userInfo: any;
    isLoggedIn: boolean;
    userType: 'visitor' | 'employee' | null;
  };
  checkLoginStatus(): void;
  validateToken(token: string): void;
}

App<IAppOption>({
  onLaunch() {
    // 小程序启动时执行
    console.log('AFA办公小程序启动');
    
    // 检查登录状态
    this.checkLoginStatus();
  },

  onShow() {
    // 小程序显示时执行
  },

  onHide() {
    // 小程序隐藏时执行
  },

  // 检查登录状态
  checkLoginStatus() {
    const token = wx.getStorageSync('access_token') as string;
    if (token) {
      // 验证token有效性
      this.validateToken(token);
    }
  },

  // 验证token
  validateToken(token: string) {
    wx.request({
      url: `${this.globalData.apiBase}/api/v1/auth/validate`,
      method: 'POST',
      header: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      success: (res) => {
        if (res.data.success) {
          this.globalData.userInfo = res.data.data;
          this.globalData.isLoggedIn = true;
        } else {
          // token无效，清除本地存储
          wx.removeStorageSync('access_token');
          this.globalData.isLoggedIn = false;
        }
      },
      fail: () => {
        this.globalData.isLoggedIn = false;
      }
    });
  },

  // 全局数据
  globalData: {
    apiBase: 'http://localhost:3000', // 开发环境API地址
    userInfo: null,
    isLoggedIn: false,
    userType: null // 'visitor', 'employee'
  }
});