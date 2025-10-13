/**
 * 错误处理演示页面
 * 展示统一错误处理和用户反馈功能
 */

import React, { useState } from 'react'
import {
  Card,
  Button,
  Space,
  Typography,
  Divider,
  Row,
  Col,
  Alert,
  Input,
  Form
} from 'antd'
import {
  BugOutlined,
  GlobalOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  InfoCircleOutlined,
  ReloadOutlined
} from '@ant-design/icons'
import { useError } from '../contexts/ErrorContext'

const { Title, Paragraph, Text } = Typography

const ErrorHandlingDemo: React.FC = () => {
  const {
    handleError,
    showSuccess,
    showInfo,
    showWarning,
    showError,
    isOnline,
    networkQuality,
    showFeedback,
    retryOperation
  } = useError()

  const [loading, setLoading] = useState(false)
  const [customMessage, setCustomMessage] = useState('')

  // 模拟网络错误
  const simulateNetworkError = () => {
    const error = new Error('网络连接失败')
    error.name = 'NetworkError'
    handleError(error, { operation: 'simulateNetworkError' })
  }

  // 模拟认证错误
  const simulateAuthError = () => {
    const error = {
      response: {
        status: 401,
        data: { message: '登录已过期' }
      }
    }
    handleError(error, { operation: 'simulateAuthError' })
  }

  // 模拟权限错误
  const simulatePermissionError = () => {
    const error = {
      response: {
        status: 403,
        data: { message: '权限不足' }
      }
    }
    handleError(error, { operation: 'simulatePermissionError' })
  }

  // 模拟服务器错误
  const simulateServerError = () => {
    const error = {
      response: {
        status: 500,
        data: { message: '服务器内部错误' }
      }
    }
    handleError(error, { operation: 'simulateServerError' })
  }

  // 模拟异步操作
  const simulateAsyncOperation = async () => {
    setLoading(true)
    try {
      await retryOperation(async () => {
        // 模拟可能失败的操作
        if (Math.random() < 0.7) {
          throw new Error('操作失败，正在重试...')
        }
        return '操作成功'
      })
      showSuccess('异步操作完成')
    } catch (error) {
      handleError(error, { operation: 'simulateAsyncOperation' })
    } finally {
      setLoading(false)
    }
  }

  // 显示自定义消息
  const showCustomMessage = (type: 'success' | 'info' | 'warning' | 'error') => {
    const message = customMessage || '这是一条测试消息'
    
    switch (type) {
      case 'success':
        showSuccess(message)
        break
      case 'info':
        showInfo(message)
        break
      case 'warning':
        showWarning(message)
        break
      case 'error':
        showError(message)
        break
    }
  }

  return (
    <div style={{ padding: '24px' }}>
      <Title level={2}>错误处理和用户反馈演示</Title>
      
      <Paragraph>
        这个页面演示了统一的错误处理、用户反馈和网络状态监控功能。
        点击下面的按钮来测试不同类型的错误处理和用户反馈。
      </Paragraph>

      {/* 网络状态显示 */}
      <Alert
        message={`网络状态: ${isOnline ? '在线' : '离线'} | 网络质量: ${networkQuality}`}
        type={isOnline ? 'success' : 'error'}
        icon={<GlobalOutlined />}
        style={{ marginBottom: 24 }}
      />

      <Row gutter={[16, 16]}>
        {/* 错误模拟 */}
        <Col xs={24} lg={12}>
          <Card title="错误处理演示">
            <Space direction="vertical" style={{ width: '100%' }}>
              <Button 
                type="primary" 
                danger 
                onClick={simulateNetworkError}
                block
              >
                模拟网络错误
              </Button>
              
              <Button 
                type="primary" 
                danger 
                onClick={simulateAuthError}
                block
              >
                模拟认证错误 (401)
              </Button>
              
              <Button 
                type="primary" 
                danger 
                onClick={simulatePermissionError}
                block
              >
                模拟权限错误 (403)
              </Button>
              
              <Button 
                type="primary" 
                danger 
                onClick={simulateServerError}
                block
              >
                模拟服务器错误 (500)
              </Button>

              <Button 
                type="primary" 
                loading={loading}
                onClick={simulateAsyncOperation}
                icon={<ReloadOutlined />}
                block
              >
                模拟重试操作
              </Button>
            </Space>
          </Card>
        </Col>

        {/* 用户反馈演示 */}
        <Col xs={24} lg={12}>
          <Card title="用户反馈演示">
            <Space direction="vertical" style={{ width: '100%' }}>
              <Input
                placeholder="输入自定义消息（可选）"
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
              />
              
              <Button 
                type="primary" 
                onClick={() => showCustomMessage('success')}
                icon={<CheckCircleOutlined />}
                block
              >
                显示成功消息
              </Button>
              
              <Button 
                onClick={() => showCustomMessage('info')}
                icon={<InfoCircleOutlined />}
                block
              >
                显示信息消息
              </Button>
              
              <Button 
                onClick={() => showCustomMessage('warning')}
                icon={<WarningOutlined />}
                block
              >
                显示警告消息
              </Button>
              
              <Button 
                danger 
                onClick={() => showCustomMessage('error')}
                icon={<BugOutlined />}
                block
              >
                显示错误消息
              </Button>
            </Space>
          </Card>
        </Col>

        {/* 反馈收集 */}
        <Col xs={24}>
          <Card title="反馈收集演示">
            <Space>
              <Button 
                type="primary"
                onClick={() => showFeedback('bug')}
              >
                报告错误
              </Button>
              
              <Button 
                onClick={() => showFeedback('suggestion')}
              >
                提出建议
              </Button>
              
              <Button 
                onClick={() => showFeedback('complaint')}
              >
                问题投诉
              </Button>
              
              <Button 
                onClick={() => showFeedback('praise')}
              >
                表扬反馈
              </Button>
            </Space>
          </Card>
        </Col>
      </Row>

      <Divider />

      {/* 功能说明 */}
      <Card title="功能说明">
        <Row gutter={[16, 16]}>
          <Col xs={24} md={8}>
            <Title level={4}>🔧 错误处理</Title>
            <ul>
              <li>统一的错误分类和处理</li>
              <li>用户友好的错误消息</li>
              <li>自动错误重试机制</li>
              <li>错误上下文记录</li>
            </ul>
          </Col>
          
          <Col xs={24} md={8}>
            <Title level={4}>💬 用户反馈</Title>
            <ul>
              <li>多种消息类型支持</li>
              <li>可配置的显示时长</li>
              <li>操作建议提示</li>
              <li>反馈收集功能</li>
            </ul>
          </Col>
          
          <Col xs={24} md={8}>
            <Title level={4}>🌐 网络监控</Title>
            <ul>
              <li>实时网络状态监控</li>
              <li>网络质量评估</li>
              <li>离线状态处理</li>
              <li>网络恢复提醒</li>
            </ul>
          </Col>
        </Row>
      </Card>
    </div>
  )
}

export default ErrorHandlingDemo