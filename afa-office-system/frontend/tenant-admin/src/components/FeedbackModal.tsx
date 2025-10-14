/**
 * 用户反馈模态框组件
 * 收集用户反馈和错误报告
 */

import React, { useState } from 'react'
import {
  Modal,
  Form,
  Input,
  Select,
  Button,
  Upload,
  message,
  Space,
  Typography,
  Rate,
  Divider
} from 'antd'
import {
  BugOutlined,
  BulbOutlined,
  FrownOutlined,
  SmileOutlined,
  CameraOutlined,
  UploadOutlined
} from '@ant-design/icons'
import type { UploadFile } from 'antd/es/upload/interface'

// 用户反馈接口
interface UserFeedback {
  type: 'bug' | 'suggestion' | 'complaint' | 'praise'
  message: string
  email?: string
  screenshot?: string
  context?: Record<string, any>
  timestamp: number
}

const { TextArea } = Input
const { Option } = Select
const { Text } = Typography

interface FeedbackModalProps {
  open: boolean
  onCancel: () => void
  onSubmit?: (feedback: UserFeedback) => void
  initialType?: 'bug' | 'suggestion' | 'complaint' | 'praise'
  errorContext?: Record<string, any> | undefined
}

export const FeedbackModal: React.FC<FeedbackModalProps> = ({
  open,
  onCancel,
  onSubmit,
  initialType = 'suggestion',
  errorContext
}) => {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [fileList, setFileList] = useState<UploadFile[]>([])

  // 反馈类型配置
  const feedbackTypes = [
    {
      value: 'bug',
      label: '错误报告',
      icon: <BugOutlined />,
      color: '#ff4d4f',
      description: '报告系统错误或异常行为'
    },
    {
      value: 'suggestion',
      label: '功能建议',
      icon: <BulbOutlined />,
      color: '#1890ff',
      description: '提出新功能或改进建议'
    },
    {
      value: 'complaint',
      label: '问题投诉',
      icon: <FrownOutlined />,
      color: '#faad14',
      description: '反馈使用中遇到的问题'
    },
    {
      value: 'praise',
      label: '表扬建议',
      icon: <SmileOutlined />,
      color: '#52c41a',
      description: '分享使用体验或表扬'
    }
  ]

  // 处理文件上传
  const handleUploadChange = ({ fileList: newFileList }: { fileList: UploadFile[] }) => {
    setFileList(newFileList)
  }

  // 自定义上传处理
  const customUpload = ({ file, onSuccess }: any) => {
    // 这里可以实现文件上传到服务器的逻辑
    // 现在只是模拟上传成功
    setTimeout(() => {
      onSuccess('ok')
    }, 1000)
  }

  // 截图功能
  const handleScreenshot = async () => {
    try {
      // 使用 Screen Capture API（需要用户授权）
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true
      })

      const video = document.createElement('video')
      video.srcObject = stream
      video.play()

      video.addEventListener('loadedmetadata', () => {
        const canvas = document.createElement('canvas')
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight

        const ctx = canvas.getContext('2d')
        ctx?.drawImage(video, 0, 0)

        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], 'screenshot.png', { type: 'image/png' })
            const uploadFile: UploadFile = {
              uid: Date.now().toString(),
              name: 'screenshot.png',
              status: 'done',
              size: file.size,
              type: file.type
            }
            setFileList([...fileList, uploadFile])
          }
        })

        // 停止屏幕捕获
        stream.getTracks().forEach(track => track.stop())
      })
    } catch (error) {
      message.error('截图失败，请手动上传图片')
    }
  }

  // 提交反馈
  const handleSubmit = async (values: any) => {
    setLoading(true)
    
    try {
      // 处理上传的文件
      let screenshot = ''
      if (fileList.length > 0 && fileList[0]?.originFileObj) {
        // 将图片转换为 base64
        const file = fileList[0].originFileObj
        if (file) {
          const reader = new FileReader()
          screenshot = await new Promise((resolve) => {
            reader.onload = () => resolve(reader.result as string)
            reader.readAsDataURL(file)
          })
        }
      }

      const feedback: UserFeedback = {
        type: values.type,
        message: values.message,
        email: values.email,
        screenshot,
        context: {
          ...errorContext,
          rating: values.rating,
          url: window.location.href,
          userAgent: navigator.userAgent,
          timestamp: Date.now()
        },
        timestamp: Date.now()
      }

      // 提交反馈 (简化版本，实际项目中应该发送到服务器)
      console.log('Feedback submitted:', feedback)
      
      // 模拟 API 调用
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // 调用外部回调
      if (onSubmit) {
        onSubmit(feedback)
      }

      message.success('反馈提交成功，感谢您的建议！')
      
      // 重置表单
      form.resetFields()
      setFileList([])
      onCancel()
    } catch (error) {
      console.error('Submit feedback failed:', error)
      message.error('反馈提交失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  // 获取当前选择的反馈类型
  const selectedType = Form.useWatch('type', form) || initialType
  const currentTypeConfig = feedbackTypes.find(type => type.value === selectedType)

  return (
    <Modal
      title={
        <Space>
          {currentTypeConfig?.icon}
          <span>用户反馈</span>
        </Space>
      }
      open={open}
      onCancel={onCancel}
      footer={null}
      width={600}
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          type: initialType,
          rating: 5
        }}
        onFinish={handleSubmit}
      >
        {/* 反馈类型 */}
        <Form.Item
          name="type"
          label="反馈类型"
          rules={[{ required: true, message: '请选择反馈类型' }]}
        >
          <Select placeholder="请选择反馈类型">
            {feedbackTypes.map(type => (
              <Option key={type.value} value={type.value}>
                <Space>
                  <span style={{ color: type.color }}>{type.icon}</span>
                  <span>{type.label}</span>
                </Space>
              </Option>
            ))}
          </Select>
        </Form.Item>

        {/* 类型描述 */}
        {currentTypeConfig && (
          <div style={{ marginBottom: 16, padding: 12, background: '#fafafa', borderRadius: 4 }}>
            <Text type="secondary">{currentTypeConfig.description}</Text>
          </div>
        )}

        {/* 满意度评分（仅对表扬和投诉显示） */}
        {(selectedType === 'praise' || selectedType === 'complaint') && (
          <Form.Item
            name="rating"
            label="满意度评分"
          >
            <Rate />
          </Form.Item>
        )}

        {/* 反馈内容 */}
        <Form.Item
          name="message"
          label="详细描述"
          rules={[
            { required: true, message: '请输入详细描述' },
            { min: 10, message: '描述至少需要10个字符' }
          ]}
        >
          <TextArea
            rows={6}
            placeholder={
              selectedType === 'bug' 
                ? '请详细描述遇到的错误，包括操作步骤、预期结果和实际结果...'
                : selectedType === 'suggestion'
                ? '请描述您的建议或想法，我们会认真考虑...'
                : selectedType === 'complaint'
                ? '请描述遇到的问题，我们会尽快处理...'
                : '请分享您的使用体验或建议...'
            }
            showCount
            maxLength={1000}
          />
        </Form.Item>

        {/* 联系邮箱 */}
        <Form.Item
          name="email"
          label="联系邮箱（可选）"
          rules={[
            { type: 'email', message: '请输入有效的邮箱地址' }
          ]}
        >
          <Input placeholder="如需回复，请留下您的邮箱地址" />
        </Form.Item>

        {/* 截图上传 */}
        <Form.Item label="相关截图（可选）">
          <Space direction="vertical" style={{ width: '100%' }}>
            <Space>
              <Upload
                fileList={fileList}
                onChange={handleUploadChange}
                customRequest={customUpload}
                accept="image/*"
                maxCount={3}
                listType="picture-card"
              >
                {fileList.length < 3 && (
                  <div>
                    <UploadOutlined />
                    <div style={{ marginTop: 8 }}>上传图片</div>
                  </div>
                )}
              </Upload>
            </Space>
            
            <Button
              type="dashed"
              icon={<CameraOutlined />}
              onClick={handleScreenshot}
              size="small"
            >
              截取当前屏幕
            </Button>
            
            <Text type="secondary" style={{ fontSize: '12px' }}>
              支持 PNG、JPG 格式，最多上传 3 张图片
            </Text>
          </Space>
        </Form.Item>

        <Divider />

        {/* 提交按钮 */}
        <Form.Item style={{ marginBottom: 0 }}>
          <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
            <Button onClick={onCancel}>
              取消
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              icon={currentTypeConfig?.icon}
            >
              提交反馈
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  )
}

export default FeedbackModal