import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useAuth } from '../useAuth'
import { AuthProvider } from '../../contexts/AuthContext'

// Mock authService
vi.mock('../../services/authService', () => ({
  authService: {
    login: vi.fn(),
    getCurrentUser: vi.fn(),
  }
}))

// Mock antd message
vi.mock('antd', async () => {
  const actual = await vi.importActual('antd')
  return {
    ...actual,
    message: {
      success: vi.fn(),
      error: vi.fn(),
    }
  }
})

describe('useAuth Hook', () => {
  it('应该返回AuthContext的值', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider>{children}</AuthProvider>
    )

    const { result } = renderHook(() => useAuth(), { wrapper })

    expect(result.current).toHaveProperty('user')
    expect(result.current).toHaveProperty('isAuthenticated')
    expect(result.current).toHaveProperty('loading')
    expect(result.current).toHaveProperty('login')
    expect(result.current).toHaveProperty('logout')
    expect(typeof result.current.login).toBe('function')
    expect(typeof result.current.logout).toBe('function')
  })

  it('应该在AuthProvider外使用时抛出错误', () => {
    // 使用console.error的mock来避免测试输出中的错误信息
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    
    expect(() => {
      renderHook(() => useAuth())
    }).toThrow('useAuth必须在AuthProvider内部使用')
    
    consoleSpy.mockRestore()
  })

  it('应该返回正确的初始状态', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider>{children}</AuthProvider>
    )

    const { result } = renderHook(() => useAuth(), { wrapper })

    expect(result.current.user).toBeNull()
    expect(result.current.isAuthenticated).toBe(false)
    expect(typeof result.current.loading).toBe('boolean')
  })
})