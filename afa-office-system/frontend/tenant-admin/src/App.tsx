import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from 'antd'
import { AuthProvider } from './contexts/AuthContext'
import { useAuth } from './hooks/useAuth'
import LoginPage from './pages/Login'
import ProtectedRoute from './components/ProtectedRoute'
import DashboardLayout from './components/Layout/DashboardLayout'
import MerchantList from './pages/Merchants/MerchantList'
import MerchantForm from './pages/Merchants/MerchantForm'
import SpaceManagement from './pages/Spaces/SpaceManagement'
import AccessRecords from './pages/Access/AccessRecords'

const { Content } = Layout

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
                    <Route path="/" element={<Navigate to="/merchants" replace />} />
                    <Route path="/merchants" element={<MerchantList />} />
                    <Route path="/merchants/new" element={<MerchantForm />} />
                    <Route path="/merchants/:id/edit" element={<MerchantForm />} />
                    <Route path="/spaces" element={<SpaceManagement />} />
                    <Route path="/access" element={<AccessRecords />} />
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