import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { ConfigProvider } from 'antd'
import DashboardLayout from '../DashboardLayout'
import { AuthProvider } from '../../../contexts/AuthContext'
import { authService } from '../../../services/authService'

// Mock authService
vi.mock('../../../services/authService', () => ({
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

// Mock react-router-dom hooks
const mockNavigate = vi.fn()
const mockLocation = { pathname: '/merchants' }

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => mockLocation,
  }
})

describe('DashboardLayout Simple Test', () => {
  const mockUser = {
    id: 1,
    name: '测试用户',
    email: 'test@example.com',
    userType: 'tenant_admin'
  }

  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.setItem('token', 'mock-token')
    vi.mocked(authService.getCurrentUser).mockResolvedValue(mockUser)
  })

  it('should render without crashing', async () => {
    try {
      render(
        <BrowserRouter>
          <ConfigProvider>
            <AuthProvider>
              <DashboardLayout>
                <div>Test Content</div>
              </DashboardLayout>
            </AuthProvider>
          </ConfigProvider>
        </BrowserRouter>
      )
      
      // If we get here, the component rendered successfully
      expect(true).toBe(true)
    } catch (error) {
      console.error('Render error:', error)
      throw error
    }
  })
})