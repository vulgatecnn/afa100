import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { message } from 'antd'
import { authService } from '../services/authService'

interface User {
  id: number
  name: string
  email: string
  userType: string
}

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  loading: boolean
  login: (credentials: { email: string; password: string }) => Promise<void>
  logout: () => void
}

interface AuthProviderProps {
  children: ReactNode
}

// 创建并导出AuthContext
export const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  // 检查本地存储的token并验证
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('token')
        if (token) {
          // 验证token有效性
          const userData = await authService.getCurrentUser()
          setUser(userData)
        }
      } catch (error) {
        // Token无效，清除本地存储
        localStorage.removeItem('token')
        console.error('Token验证失败:', error)
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [])

  const login = async (credentials: { email: string; password: string }) => {
    try {
      setLoading(true)
      const response = await authService.login(credentials)
      
      // 保存token到本地存储
      localStorage.setItem('token', response.token)
      setUser(response.user)
      
      message.success('登录成功')
    } catch (error: any) {
      message.error(error.message || '登录失败')
      throw error
    } finally {
      setLoading(false)
    }
  }

  const logout = () => {
    localStorage.removeItem('token')
    setUser(null)
    message.success('已退出登录')
  }

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    loading,
    login,
    logout
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth必须在AuthProvider内部使用')
  }
  return context
}