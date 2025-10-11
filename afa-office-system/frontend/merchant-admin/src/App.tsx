import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from 'antd'
import { AuthProvider } from './contexts/AuthContext'
import { useAuth } from './hooks/useAuth'
import LoginPage from './pages/Login'
import DashboardLayout from './components/Layout/DashboardLayout'
import Dashboard from './pages/Dashboard'
import EmployeeList from './pages/Employees/EmployeeList'
import EmployeeForm from './pages/Employees/EmployeeForm'
import VisitorList from './pages/Visitors/VisitorList'
import VisitorDetail from './pages/Visitors/VisitorDetail'
import Settings from './pages/Settings'

const { Content } = Layout

// 受保护的路由组件
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth()
  
  if (loading) {
    return <div>加载中...</div>
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }
  
  return <>{children}</>
}

// 主应用组件
const AppContent: React.FC = () => {
  const { isAuthenticated } = useAuth()
  
  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Content>
        <Routes>
          <Route 
            path="/login" 
            element={
              isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />
            } 
          />
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/employees" element={<EmployeeList />} />
                    <Route path="/employees/new" element={<EmployeeForm />} />
                    <Route path="/employees/:id/edit" element={<EmployeeForm />} />
                    <Route path="/visitors" element={<VisitorList />} />
                    <Route path="/visitors/:id" element={<VisitorDetail />} />
                    <Route path="/settings" element={<Settings />} />
                  </Routes>
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
        </Routes>
      </Content>
    </Layout>
  )
}

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}

export default App