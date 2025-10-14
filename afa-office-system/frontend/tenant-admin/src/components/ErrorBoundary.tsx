/**
 * 错误边界组件
 * 捕获 React 组件树中的 JavaScript 错误并显示友好的错误界面
 */

import React, { Component, ReactNode } from 'react'
import { Result, Button, Typography, Collapse } from 'antd'
import { ReloadOutlined, BugOutlined } from '@ant-design/icons'

const { Paragraph, Text } = Typography
const { Panel } = Collapse

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: React.ErrorInfo | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({
      error,
      errorInfo
    })

    // 调用错误回调
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }

    // 记录错误到控制台
    console.error('ErrorBoundary caught an error:', error, errorInfo)

    // 这里可以集成错误报告服务
    this.reportError(error, errorInfo)
  }

  /**
   * 报告错误到服务器
   */
  private reportError(error: Error, errorInfo: React.ErrorInfo) {
    try {
      const errorReport = {
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href
      }

      // 发送错误报告
      fetch('/api/v1/errors/report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(errorReport)
      }).catch(reportError => {
        console.error('Failed to report error:', reportError)
      })
    } catch (reportError) {
      console.error('Error in error reporting:', reportError)
    }
  }

  /**
   * 重置错误状态
   */
  private handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    })
  }

  /**
   * 刷新页面
   */
  private handleReload = () => {
    window.location.reload()
  }

  /**
   * 反馈问题
   */
  private handleFeedback = () => {
    // 这里可以打开反馈对话框或跳转到反馈页面
    const subject = encodeURIComponent('页面错误反馈')
    const body = encodeURIComponent(`
页面发生错误，详细信息：

错误信息: ${this.state.error?.message}
发生时间: ${new Date().toLocaleString()}
页面地址: ${window.location.href}
浏览器: ${navigator.userAgent}

请描述您在错误发生前的操作步骤：
1. 
2. 
3. 
    `)
    
    window.open(`mailto:support@afa.com?subject=${subject}&body=${body}`)
  }

  render() {
    if (this.state.hasError) {
      // 如果提供了自定义 fallback，使用它
      if (this.props.fallback) {
        return this.props.fallback
      }

      // 默认错误界面
      return (
        <div style={{ padding: '50px 20px', minHeight: '400px' }}>
          <Result
            status="error"
            title="页面出现错误"
            subTitle="抱歉，页面遇到了一个错误。您可以尝试刷新页面或联系技术支持。"
            extra={[
              <Button 
                type="primary" 
                icon={<ReloadOutlined />} 
                onClick={this.handleReload}
                key="reload"
              >
                刷新页面
              </Button>,
              <Button 
                onClick={this.handleReset}
                key="reset"
              >
                重试
              </Button>,
              <Button 
                icon={<BugOutlined />} 
                onClick={this.handleFeedback}
                key="feedback"
              >
                反馈问题
              </Button>
            ]}
          >
            <div style={{ textAlign: 'left', maxWidth: '600px', margin: '0 auto' }}>
              <Paragraph>
                <Text strong>可能的解决方案：</Text>
              </Paragraph>
              <Paragraph>
                <ul>
                  <li>刷新页面重新加载</li>
                  <li>清除浏览器缓存后重试</li>
                  <li>检查网络连接是否正常</li>
                  <li>如果问题持续存在，请联系技术支持</li>
                </ul>
              </Paragraph>

              {/* 开发环境显示详细错误信息 */}
              {process.env['NODE_ENV'] === 'development' && this.state.error && (
                <Collapse ghost>
                  <Panel header="错误详情（开发模式）" key="error-details">
                    <Paragraph>
                      <Text strong>错误消息：</Text>
                      <br />
                      <Text code>{this.state.error.message}</Text>
                    </Paragraph>
                    
                    {this.state.error.stack && (
                      <Paragraph>
                        <Text strong>错误堆栈：</Text>
                        <br />
                        <Text code style={{ whiteSpace: 'pre-wrap', fontSize: '12px' }}>
                          {this.state.error.stack}
                        </Text>
                      </Paragraph>
                    )}
                    
                    {this.state.errorInfo?.componentStack && (
                      <Paragraph>
                        <Text strong>组件堆栈：</Text>
                        <br />
                        <Text code style={{ whiteSpace: 'pre-wrap', fontSize: '12px' }}>
                          {this.state.errorInfo.componentStack}
                        </Text>
                      </Paragraph>
                    )}
                  </Panel>
                </Collapse>
              )}
            </div>
          </Result>
        </div>
      )
    }

    return this.props.children
  }
}

/**
 * 高阶组件：为组件添加错误边界
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  )

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`
  
  return WrappedComponent
}