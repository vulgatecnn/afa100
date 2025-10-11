import React, { useState } from 'react'
import { Layout, Menu, Avatar, Dropdown, Button, theme } from 'antd'
import { 
  MenuFoldOutlined, 
  MenuUnfoldOutlined,
  ShopOutlined,
  HomeOutlined,
  FileTextOutlined,
  UserOutlined,
  LogoutOutlined,
  SettingOutlined
} from '@ant-design/icons'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import type { MenuProps } from 'antd'

const { Header, Sider, Content } = Layout

interface DashboardLayoutProps {
  children: React.ReactNode
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuth()
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken()

  // 侧边栏菜单项
  const menuItems: MenuProps['items'] = [
    {
      key: '/merchants',
      icon: <ShopOutlined />,
      label: '商户管理',
    },
    {
      key: '/spaces',
      icon: <HomeOutlined />,
      label: '空间管理',
    },
    {
      key: '/access',
      icon: <FileTextOutlined />,
      label: '通行记录',
    },
  ]

  // 用户下拉菜单
  const userMenuItems: MenuProps['items'] = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: '个人资料',
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: '系统设置',
    },
    {
      type: 'divider',
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      onClick: logout,
    },
  ]

  const handleMenuClick = ({ key }: { key: string }) => {
    navigate(key)
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider 
        trigger={null} 
        collapsible 
        collapsed={collapsed}
        breakpoint="lg"
        onBreakpoint={(broken) => {
          // 在移动端自动收起侧边栏
          if (broken) {
            setCollapsed(true)
          }
        }}
        style={{
          overflow: 'auto',
          height: '100vh',
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
        }}
      >
        <div style={{ 
          height: 32, 
          margin: 16, 
          background: 'rgba(255, 255, 255, 0.2)',
          borderRadius: 6,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontWeight: 'bold'
        }}>
          {collapsed ? 'AFA' : 'AFA租务管理'}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={handleMenuClick}
        />
      </Sider>
      <Layout style={{ marginLeft: collapsed ? 80 : 200, transition: 'margin-left 0.2s' }}>
        <Header 
          style={{ 
            padding: '0 16px', 
            background: colorBgContainer,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 1px 4px rgba(0,21,41,.08)'
          }}
        >
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            style={{
              fontSize: '16px',
              width: 64,
              height: 64,
            }}
          />
          
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span>欢迎，{user?.name}</span>
            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
              <Avatar 
                style={{ backgroundColor: '#1890ff', cursor: 'pointer' }} 
                icon={<UserOutlined />} 
              />
            </Dropdown>
          </div>
        </Header>
        <Content
          style={{
            margin: '16px',
            padding: 24,
            minHeight: 280,
            background: colorBgContainer,
            borderRadius: borderRadiusLG,
            overflow: 'auto'
          }}
        >
          {children}
        </Content>
      </Layout>
    </Layout>
  )
}

export default DashboardLayout