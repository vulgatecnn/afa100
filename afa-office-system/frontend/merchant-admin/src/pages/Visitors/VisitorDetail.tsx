import React, { useState, useEffect } from 'react'
import { 
  Card, 
  Typography, 
  Space, 
  Button, 
  Descriptions, 
  Tag, 
  message,
  Modal,
  Form,
  InputNumber,
  Divider,
  QRCode
} from 'antd'
import { 
  ArrowLeftOutlined, 
  CheckOutlined, 
  CloseOutlined,
  ClockCircleOutlined,
  StopOutlined
} from '@ant-design/icons'
import { useNavigate, useParams } from 'react-router-dom'
import { visitorService, type VisitorApplication } from '../../services/visitorService'
import dayjs from 'dayjs'

const { Title, Text } = Typography

const VisitorDetail: React.FC = () => {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const [application, setApplication] = useState<VisitorApplication | null>(null)
  const [loading, setLoading] = useState(false)
  const [extendModalVisible, setExtendModalVisible] = useState(false)
  const [form] = Form.useForm()

  useEffect(() => {
    if (id) {
      loadApplication(parseInt(id))
    }
  }, [id])

  const loadApplication = async (applicationId: number) => {
    try {
      setLoading(true)
      const data = await visitorService.getVisitorApplication(applicationId)
      setApplication(data)
    } catch (error) {
      message.error('加载访客申请失败')
      navigate('/visitors')
    } finally {
      setLoading(false)
    }
  }

  // 审批申请
  const handleApproval = async (status: 'approved' | 'rejected') => {
    if (!application) return

    try {
      await visitorService.approveVisitorApplication(application.id, {
        status,
        usageLimit: 2,
        duration: application.duration
      })
      message.success(`${status === 'approved' ? '审批通过' : '审批拒绝'}`)
      loadApplication(application.id)
    } catch (error) {
      message.error('审批失败')
    }
  }

  // 撤销申请
  const handleRevoke = () => {
    if (!application) return

    Modal.confirm({
      title: '确认撤销',
      content: '确定要撤销这个访客申请吗？撤销后通行码将失效。',
      onOk: async () => {
        try {
          await visitorService.revokeVisitorApplication(application.id)
          message.success('撤销成功')
          loadApplication(application.id)
        } catch (error) {
          message.error('撤销失败')
        }
      }
    })
  }

  // 延长有效期
  const handleExtend = async (values: { duration: number }) => {
    if (!application) return

    try {
      await visitorService.extendPasscode(application.id, values.duration)
      message.success('延长成功')
      setExtendModalVisible(false)
      form.resetFields()
      loadApplication(application.id)
    } catch (error) {
      message.error('延长失败')
    }
  }

  // 返回列表
  const handleBack = () => {
    navigate('/visitors')
  }

  // 获取状态颜色
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'orange'
      case 'approved': return 'green'
      case 'rejected': return 'red'
      case 'expired': return 'default'
      default: return 'default'
    }
  }

  // 获取状态文本
  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return '待审批'
      case 'approved': return '已通过'
      case 'rejected': return '已拒绝'
      case 'expired': return '已过期'
      default: return status
    }
  }

  if (!application) {
    return <div>加载中...</div>
  }

  return (
    <div>
      <Card loading={loading}>
        <div style={{ marginBottom: 24 }}>
          <Space>
            <Button 
              icon={<ArrowLeftOutlined />} 
              onClick={handleBack}
            >
              返回
            </Button>
            <Title level={4} style={{ margin: 0 }}>
              访客申请详情
            </Title>
          </Space>
        </div>

        <div style={{ marginBottom: 24 }}>
          <Space>
            {application.status === 'pending' && (
              <>
                <Button
                  type="primary"
                  icon={<CheckOutlined />}
                  onClick={() => handleApproval('approved')}
                >
                  通过申请
                </Button>
                <Button
                  danger
                  icon={<CloseOutlined />}
                  onClick={() => handleApproval('rejected')}
                >
                  拒绝申请
                </Button>
              </>
            )}
            
            {application.status === 'approved' && (
              <>
                <Button
                  icon={<ClockCircleOutlined />}
                  onClick={() => setExtendModalVisible(true)}
                >
                  延长有效期
                </Button>
                <Button
                  danger
                  icon={<StopOutlined />}
                  onClick={handleRevoke}
                >
                  撤销申请
                </Button>
              </>
            )}
          </Space>
        </div>

        <Descriptions column={2} bordered>
          <Descriptions.Item label="访客姓名" span={1}>
            {application.visitorName}
          </Descriptions.Item>
          
          <Descriptions.Item label="联系电话" span={1}>
            {application.visitorPhone}
          </Descriptions.Item>
          
          <Descriptions.Item label="访客公司" span={1}>
            {application.visitorCompany}
          </Descriptions.Item>
          
          <Descriptions.Item label="申请状态" span={1}>
            <Tag color={getStatusColor(application.status)}>
              {getStatusText(application.status)}
            </Tag>
          </Descriptions.Item>
          
          <Descriptions.Item label="访问目的" span={2}>
            {application.visitPurpose}
          </Descriptions.Item>
          
          <Descriptions.Item label="访问类型" span={1}>
            {application.visitType}
          </Descriptions.Item>
          
          <Descriptions.Item label="预约时间" span={1}>
            {dayjs(application.scheduledTime).format('YYYY-MM-DD HH:mm')}
          </Descriptions.Item>
          
          <Descriptions.Item label="访问时长" span={1}>
            {application.duration} 小时
          </Descriptions.Item>
          
          <Descriptions.Item label="申请时间" span={1}>
            {dayjs(application.createdAt).format('YYYY-MM-DD HH:mm:ss')}
          </Descriptions.Item>
          
          {application.approvedBy && (
            <>
              <Descriptions.Item label="审批人" span={1}>
                {application.approvedByName}
              </Descriptions.Item>
              
              <Descriptions.Item label="审批时间" span={1}>
                {dayjs(application.approvedAt).format('YYYY-MM-DD HH:mm:ss')}
              </Descriptions.Item>
            </>
          )}
          
          {application.status === 'approved' && (
            <>
              <Descriptions.Item label="使用次数" span={1}>
                {application.usageCount} / {application.usageLimit}
              </Descriptions.Item>
              
              <Descriptions.Item label="通行码有效期" span={1}>
                <Text type={dayjs(application.passcodeExpiry).isBefore(dayjs()) ? 'danger' : 'success'}>
                  {dayjs(application.passcodeExpiry).format('YYYY-MM-DD HH:mm:ss')}
                </Text>
              </Descriptions.Item>
            </>
          )}
        </Descriptions>

        {/* 通行码展示 */}
        {application.status === 'approved' && application.passcode && (
          <div style={{ marginTop: 24 }}>
            <Divider orientation="left">通行码</Divider>
            <div style={{ textAlign: 'center', padding: 24, background: '#fafafa', borderRadius: 8 }}>
              <QRCode 
                value={application.passcode} 
                size={200}
                status={dayjs(application.passcodeExpiry).isBefore(dayjs()) ? 'expired' : 'active'}
              />
              <div style={{ marginTop: 16 }}>
                <Text code style={{ fontSize: 16 }}>
                  {application.passcode}
                </Text>
              </div>
              <div style={{ marginTop: 8 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  请在有效期内使用，超时将自动失效
                </Text>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* 延长有效期模态框 */}
      <Modal
        title="延长通行码有效期"
        open={extendModalVisible}
        onCancel={() => {
          setExtendModalVisible(false)
          form.resetFields()
        }}
        onOk={() => form.submit()}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleExtend}
          initialValues={{ duration: 2 }}
        >
          <Form.Item
            label="延长时长（小时）"
            name="duration"
            rules={[
              { required: true, message: '请设置延长时长' },
              { min: 1, message: '延长时长至少1小时' },
              { max: 24, message: '延长时长最多24小时' }
            ]}
          >
            <InputNumber min={1} max={24} style={{ width: '100%' }} />
          </Form.Item>
          
          <div style={{ fontSize: 12, color: '#666' }}>
            <p>当前有效期：{dayjs(application.passcodeExpiry).format('YYYY-MM-DD HH:mm:ss')}</p>
            <p>延长后有效期：{dayjs(application.passcodeExpiry).add(form.getFieldValue('duration') || 2, 'hour').format('YYYY-MM-DD HH:mm:ss')}</p>
          </div>
        </Form>
      </Modal>
    </div>
  )
}

export default VisitorDetail