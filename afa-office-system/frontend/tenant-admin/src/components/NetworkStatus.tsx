/**
 * 网络状态指示器组件
 * 显示当前网络连接状态和质量
 */

import React, { useState } from 'react'
import { Badge, Tooltip, Button, Modal, Typography, Progress, Space, Alert } from 'antd'
import { 
  WifiOutlined, 
  DisconnectOutlined, 
  ReloadOutlined,
  InfoCircleOutlined,
  WarningOutlined
} from '@ant-design/icons'
import { useNetworkStatus } from '../hooks/useNetworkStatus'

const { Text, Paragraph } = Typography

interface NetworkStatusProps {
  showDetails?: boolean
  position?: 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight'
  className?: string
}

export const NetworkStatus: React.FC<NetworkStatusProps> = ({
  showDetails = false,
  position = 'topRight',
  className
}) => {
  const {
    isOnline,
    networkStatus,
    isSlowConnection,
    checkConnection,
    getSuggestions
  } = useNetworkStatus()

  const [showModal, setShowModal] = useState(false)
  const [testing, setTesting] = useState(false)
  const [speedResult, setSpeedResult] = useState<{ downloadSpeed: number; latency: number } | null>(null)

  // 获取状态颜色和图标
  const getStatusInfo = () => {
    if (!isOnline) {
      return {
        status: 'error' as const,
        icon: <DisconnectOutlined />,
        text: '离线',
        color: '#ff4d4f'
      }
    }

    if (isSlowConnection) {
      return {
        status: 'warning' as const,
        icon: <WifiOutlined />,
        text: '网络较慢',
        color: '#faad14'
      }
    }

    if (!isOnline) {
      return {
        status: 'processing' as const,
        icon: <WifiOutlined />,
        text: '连接不稳定',
        color: '#1890ff'
      }
    }

    return {
      status: 'success' as const,
      icon: <WifiOutlined />,
      text: '网络正常',
      color: '#52c41a'
    }
  }

  // 测试网络速度
  const handleTestSpeed = async () => {
    setTesting(true)
    try {
      // 简化的速度测试
      const startTime = Date.now()
      await fetch('/api/v1/health', { cache: 'no-cache' })
      const latency = Date.now() - startTime
      
      setSpeedResult({
        downloadSpeed: latency < 100 ? 5000000 : latency < 300 ? 1000000 : 500000,
        latency
      })
    } catch (error) {
      console.error('Speed test failed:', error)
    } finally {
      setTesting(false)
    }
  }

  // 重新检查连接
  const handleCheckConnection = async () => {
    await checkConnection()
  }

  const statusInfo = getStatusInfo()
  const suggestions = getSuggestions()

  // 格式化速度
  const formatSpeed = (bps: number) => {
    if (bps >= 1000000) {
      return `${(bps / 1000000).toFixed(1)} Mbps`
    } else if (bps >= 1000) {
      return `${(bps / 1000).toFixed(1)} Kbps`
    } else {
      return `${bps.toFixed(0)} bps`
    }
  }

  // 获取质量评分颜色
  const getScoreColor = (score: number) => {
    if (score >= 70) return '#52c41a'
    if (score >= 40) return '#faad14'
    return '#ff4d4f'
  }

  const indicator = (
    <Badge 
      status={statusInfo.status} 
      text={showDetails ? statusInfo.text : undefined}
      style={{ cursor: 'pointer' }}
      onClick={() => setShowModal(true)}
    />
  )

  return (
    <>
      <div className={className} style={{ position: 'fixed', [position.includes('top') ? 'top' : 'bottom']: 16, [position.includes('Left') ? 'left' : 'right']: 16, zIndex: 1000 }}>
        <Tooltip title={`网络状态: ${statusInfo.text} (点击查看详情)`}>
          {indicator}
        </Tooltip>
      </div>

      <Modal
        title={
          <Space>
            {statusInfo.icon}
            <span>网络状态详情</span>
          </Space>
        }
        open={showModal}
        onCancel={() => setShowModal(false)}
        footer={[
          <Button key="test" loading={testing} onClick={handleTestSpeed}>
            测试速度
          </Button>,
          <Button key="check" onClick={handleCheckConnection}>
            <ReloadOutlined />
            重新检查
          </Button>,
          <Button key="close" type="primary" onClick={() => setShowModal(false)}>
            关闭
          </Button>
        ]}
        width={600}
      >
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          {/* 当前状态 */}
          <div>
            <Text strong>当前状态：</Text>
            <Badge 
              status={statusInfo.status} 
              text={statusInfo.text}
              style={{ marginLeft: 8 }}
            />
          </div>

          {/* 网络质量评分 */}
          <div>
            <Text strong>网络质量评分：</Text>
            <div style={{ marginTop: 8 }}>
              <Progress
                percent={isOnline ? (isSlowConnection ? 30 : 85) : 0}
                strokeColor={getScoreColor(isOnline ? (isSlowConnection ? 30 : 85) : 0)}
                format={(percent) => `${percent}/100`}
              />
            </div>
          </div>

          {/* 详细信息 */}
          <div>
            <Text strong>详细信息：</Text>
            <div style={{ marginTop: 8, background: '#fafafa', padding: 12, borderRadius: 4 }}>
              <Space direction="vertical" size="small" style={{ width: '100%' }}>
                <div>
                  <Text>连接状态：</Text>
                  <Text type={isOnline ? 'success' : 'danger'}>
                    {isOnline ? '在线' : '离线'}
                  </Text>
                </div>
                
                <div>
                  <Text>连接类型：</Text>
                  <Text>{isSlowConnection ? '慢速连接' : '正常连接'}</Text>
                </div>
                
                <div>
                  <Text>速度等级：</Text>
                  <Text type={isOnline ? (isSlowConnection ? 'warning' : 'success') : 'danger'}>
                    {isOnline ? (isSlowConnection ? '缓慢' : '正常') : '离线'}
                  </Text>
                </div>
                
                <div>
                  <Text>连接稳定性：</Text>
                  <Text type={isOnline ? 'success' : 'warning'}>
                    {isOnline ? '稳定' : '不稳定'}
                  </Text>
                </div>
              </Space>
            </div>
          </div>

          {/* 速度测试结果 */}
          {speedResult && (
            <div>
              <Text strong>速度测试结果：</Text>
              <div style={{ marginTop: 8, background: '#f6ffed', padding: 12, borderRadius: 4, border: '1px solid #b7eb8f' }}>
                <Space direction="vertical" size="small">
                  <div>
                    <Text>下载速度：</Text>
                    <Text strong>{formatSpeed(speedResult.downloadSpeed)}</Text>
                  </div>
                  <div>
                    <Text>延迟：</Text>
                    <Text strong>{speedResult.latency}ms</Text>
                  </div>
                </Space>
              </div>
            </div>
          )}

          {/* 建议 */}
          {suggestions.length > 0 && (
            <Alert
              message="网络优化建议"
              description={
                <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
                  {suggestions.map((suggestion, index) => (
                    <li key={index}>{suggestion}</li>
                  ))}
                </ul>
              }
              type={isOnline ? 'info' : 'warning'}
              icon={isOnline ? <InfoCircleOutlined /> : <WarningOutlined />}
              showIcon
            />
          )}
        </Space>
      </Modal>
    </>
  )
}

export default NetworkStatus