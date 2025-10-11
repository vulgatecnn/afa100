/**
 * 小程序页面测试工具使用示例
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { PageTestHelper, withPageTestEnvironment } from '../utils/page-test-helper'

// 示例页面逻辑
function createLoginPage() {
  return PageTestHelper.createPageContext(
    // 初始数据
    {
      username: '',
      password: '',
      loading: false,
      errors: {}
    },
    // 页面方法
    {
      onLoad(options: any) {
        console.log('页面加载', options)
        this.setData({
          username: options.username || ''
        })
      },

      onShow() {
        console.log('页面显示')
      },

      onUsernameInput(e: any) {
        this.setData({
          username: e.detail.value,
          'errors.username': ''
        })
      },

      onPasswordInput(e: any) {
        this.setData({
          password: e.detail.value,
          'errors.password': ''
        })
      },

      async onLoginTap() {
        if (!this.validateForm()) {
          return
        }

        this.setData({ loading: true })

        try {
          const result = await this.login()
          
          wx.showToast({
            title: '登录成功',
            icon: 'success'
          })

          wx.switchTab({
            url: '/pages/index/index'
          })
        } catch (error) {
          wx.showToast({
            title: error.message || '登录失败',
            icon: 'none'
          })
        } finally {
          this.setData({ loading: false })
        }
      },

      validateForm() {
        const errors: any = {}
        
        if (!this.data.username) {
          errors.username = '请输入用户名'
        }
        
        if (!this.data.password) {
          errors.password = '请输入密码'
        } else if (this.data.password.length < 6) {
          errors.password = '密码长度至少6位'
        }

        this.setData({ errors })
        return Object.keys(errors).length === 0
      },

      async login() {
        return new Promise((resolve, reject) => {
          wx.request({
            url: '/api/v1/auth/login',
            method: 'POST',
            data: {
              username: this.data.username,
              password: this.data.password
            },
            success: (res) => {
              if (res.data.success) {
                resolve(res.data)
              } else {
                reject(new Error(res.data.message))
              }
            },
            fail: (error) => {
              reject(error)
            }
          })
        })
      },

      onShareAppMessage() {
        return {
          title: 'AFA办公小程序',
          path: '/pages/login/login'
        }
      }
    }
  )
}

describe('小程序页面测试工具示例', () => {
  describe('页面生命周期测试', () => {
    it('应该正确测试页面加载', withPageTestEnvironment(async (helper) => {
      const pageContext = createLoginPage()
      
      // 测试onLoad生命周期
      await helper.simulatePageLifecycle(pageContext, 'onLoad', {
        username: 'testuser'
      })
      
      // 验证页面数据
      helper.expectPageData(pageContext, {
        username: 'testuser'
      })
    }))

    it('应该正确测试完整生命周期', withPageTestEnvironment(async (helper) => {
      const pageContext = createLoginPage()
      
      // 测试完整生命周期
      await helper.testPageLifecycle(pageContext, {
        username: 'test'
      })
      
      // 验证生命周期方法被调用
      expect(pageContext.setData).toHaveBeenCalled()
    }))
  })

  describe('页面事件测试', () => {
    it('应该正确处理用户输入', withPageTestEnvironment(async (helper) => {
      const pageContext = createLoginPage()
      
      // 模拟用户名输入
      await helper.simulatePageEvent(pageContext, 'onUsernameInput', {
        detail: { value: 'newuser' }
      })
      
      // 验证数据更新
      helper.expectPageData(pageContext, {
        username: 'newuser'
      })
      
      // 验证setData调用
      helper.expectSetDataCall(pageContext, {
        username: 'newuser',
        'errors.username': ''
      })
    }))

    it('应该正确处理表单提交', withPageTestEnvironment(async (helper) => {
      const pageContext = createLoginPage()
      
      // 设置表单数据
      pageContext.data.username = 'testuser'
      pageContext.data.password = 'password123'
      
      // Mock成功的登录响应
      wx.request = vi.fn().mockImplementation((options: any) => {
        setTimeout(() => {
          options.success({
            data: {
              success: true,
              data: { token: 'mock-token' }
            }
          })
        }, 0)
      })
      
      // 模拟登录按钮点击
      await helper.simulatePageEvent(pageContext, 'onLoginTap')
      
      // 等待异步操作完成
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // 验证成功反馈
      helper.expectPageSuccess(pageContext, '登录成功')
      
      // 验证页面跳转
      helper.expectPageNavigation('/pages/index/index', 'switchTab')
    }))
  })

  describe('表单验证测试', () => {
    it('应该正确验证必填字段', withPageTestEnvironment(async (helper) => {
      const pageContext = createLoginPage()
      
      // 不填写任何字段，直接提交
      await helper.simulatePageEvent(pageContext, 'onLoginTap')
      
      // 验证表单验证错误
      helper.expectFormValidation(pageContext, 'username', false, '请输入用户名')
      helper.expectFormValidation(pageContext, 'password', false, '请输入密码')
    }))

    it('应该正确验证密码长度', withPageTestEnvironment(async (helper) => {
      const pageContext = createLoginPage()
      
      // 设置短密码
      pageContext.data.username = 'testuser'
      pageContext.data.password = '123'
      
      // 提交表单
      await helper.simulatePageEvent(pageContext, 'onLoginTap')
      
      // 验证密码长度错误
      helper.expectFormValidation(pageContext, 'password', false, '密码长度至少6位')
    }))
  })

  describe('网络请求测试', () => {
    it('应该正确处理网络成功', withPageTestEnvironment(async (helper) => {
      const pageContext = createLoginPage()
      
      // 设置表单数据
      pageContext.data.username = 'testuser'
      pageContext.data.password = 'password123'
      
      // 模拟成功场景
      await helper.simulateNetworkScenario(
        pageContext,
        'success',
        async () => {
          await helper.simulatePageEvent(pageContext, 'onLoginTap')
        }
      )
      
      // 验证成功处理
      helper.expectPageSuccess(pageContext, '登录成功')
    }))

    it('应该正确处理网络错误', withPageTestEnvironment(async (helper) => {
      const pageContext = createLoginPage()
      
      // 设置表单数据
      pageContext.data.username = 'testuser'
      pageContext.data.password = 'wrongpassword'
      
      // 模拟错误场景
      await helper.simulateNetworkScenario(
        pageContext,
        'error',
        async () => {
          await helper.simulatePageEvent(pageContext, 'onLoginTap')
        }
      )
      
      // 验证错误处理
      helper.expectPageError(pageContext, '服务器错误')
    }))

    it('应该正确处理网络超时', withPageTestEnvironment(async (helper) => {
      const pageContext = createLoginPage()
      
      // 设置表单数据
      pageContext.data.username = 'testuser'
      pageContext.data.password = 'password123'
      
      // 模拟超时场景
      await helper.simulateNetworkScenario(
        pageContext,
        'timeout',
        async () => {
          await helper.simulatePageEvent(pageContext, 'onLoginTap')
        }
      )
      
      // 验证超时处理
      helper.expectPageError(pageContext, '网络超时')
    }))
  })

  describe('页面状态测试', () => {
    it('应该正确显示加载状态', withPageTestEnvironment(async (helper) => {
      const pageContext = createLoginPage()
      
      // 设置加载状态
      pageContext.setData({ loading: true })
      
      // 验证加载状态
      helper.expectPageLoading(pageContext, true, '登录中...')
      
      // 取消加载状态
      pageContext.setData({ loading: false })
      
      // 验证加载状态取消
      helper.expectPageLoading(pageContext, false)
    }))

    it('应该等待页面状态变化', withPageTestEnvironment(async (helper) => {
      const pageContext = createLoginPage()
      
      // 异步改变状态
      setTimeout(() => {
        pageContext.setData({ loading: true })
      }, 100)
      
      // 等待状态变化
      await helper.waitForPageState(
        pageContext,
        (data) => data.loading === true,
        1000
      )
      
      // 验证状态已变化
      expect(pageContext.data.loading).toBe(true)
    }))
  })

  describe('页面分享测试', () => {
    it('应该正确处理页面分享', withPageTestEnvironment(async (helper) => {
      const pageContext = createLoginPage()
      
      // 模拟分享
      const shareResult = await helper.simulatePageShare(pageContext, {
        from: 'menu'
      })
      
      // 验证分享配置
      expect(shareResult).toEqual({
        title: 'AFA办公小程序',
        path: '/pages/login/login'
      })
    }))
  })

  describe('页面方法批量测试', () => {
    it('应该批量测试页面方法', withPageTestEnvironment(async (helper) => {
      const pageContext = createLoginPage()
      
      await helper.testPageMethods(pageContext, [
        {
          methodName: 'validateForm',
          expectedResult: false,
          description: '空表单验证应该失败'
        },
        {
          methodName: 'onUsernameInput',
          params: [{ detail: { value: 'test' } }],
          expectedSideEffects: () => {
            expect(pageContext.data.username).toBe('test')
          },
          description: '用户名输入应该更新数据'
        }
      ])
    }))
  })

  describe('页面测试套件示例', () => {
    PageTestHelper.createPageTestSuite(
      '登录页面',
      () => createLoginPage(),
      [
        {
          name: '应该正确初始化页面',
          test: async (pageContext) => {
            expect(pageContext.data.username).toBe('')
            expect(pageContext.data.password).toBe('')
            expect(pageContext.data.loading).toBe(false)
          }
        },
        {
          name: '应该正确处理页面加载',
          test: async (pageContext) => {
            await PageTestHelper.simulatePageLifecycle(pageContext, 'onLoad', {
              username: 'prefilleduser'
            })
            
            expect(pageContext.data.username).toBe('prefilleduser')
          }
        }
      ]
    )
  })
})