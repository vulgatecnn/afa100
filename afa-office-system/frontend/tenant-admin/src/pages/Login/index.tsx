import React, { useState } from 'react'
import { Form, Input, Button, Card, Typography, message } from 'antd'
import { UserOutlined, LockOutlined } from '@ant-design/icons'
import { useAuth } from '../../hooks/useAuth'
import './Login.css'

const { Title, Text } = Typography

interface LoginFormData {
  email: string
  password: string
}

const LoginPage: React.FC = () => {
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()

  const handleSubmit = async (values: LoginFormData) => {
    try {
      setLoading(true)
      await login(values)
    } catch (error) {
      // 错误已在AuthContext中处理
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-container">
      <div className="login-content">
        <Card className="login-card">
          <div className="login-header">
            <Title level={2} style={{ textAlign: 'center', marginBottom: 8 }}>
              AFA租务管理系统
            </Title>
            <Text type="secondary" style={{ display: 'block', textAlign: 'center', marginBottom: 32 }}>
              请使用您的账号登录系统
            </Text>
          </div>
          
          <Form
            name="login"
            onFinish={handleSubmit}
            autoComplete="off"
            size="large"
          >
            <Form.Item
              name="email"
              rules={[
                { required: true, message: '请输入邮箱地址' },
                { type: 'email', message: '请输入有效的邮箱地址' }
              ]}
            >
              <Input
                prefix={<UserOutlined />}
                placeholder="邮箱地址"
                autoComplete="email"
              />
            </Form.Item>

            <Form.Item
              name="password"
              rules={[
                { required: true, message: '请输入密码' },
                { min: 6, message: '密码至少6位字符' }
              ]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="密码"
                autoComplete="current-password"
              />
            </Form.Item>

            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                block
                style={{ height: 48 }}
              >
                登录
              </Button>
            </Form.Item>
          </Form>
          
          <div className="login-footer">
            <Text type="secondary" style={{ fontSize: 12 }}>
              © 2024 AFA办公小程序. 保留所有权利.
            </Text>
          </div>
        </Card>
      </div>
    </div>
  )
}

export default LoginPage