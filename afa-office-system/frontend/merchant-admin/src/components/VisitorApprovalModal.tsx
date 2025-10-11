import React, { useState } from 'react'
import {
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  Checkbox,
  Row,
  Col,
  Typography,
  Space,
  Tag,
  Divider,
  Alert,
  Card
} from 'antd'
import { 
  CheckCircleOutlined, 
  CloseCircleOutlined,
  UserOutlined
} from '@ant-design/icons'
import { type VisitorApplication } from '../services/visitorService'
import dayjs from 'dayjs'

const { Title, Text } = Typography
const { TextArea } = Input

interface VisitorApprovalModalProps {
  visible: boolean
  application: VisitorApplication | null
  onCancel: () => void
  onSubmit: (values: any) => void
  loading?: boolean
}

const VisitorApprovalModal: React.FC<VisitorApprovalModalProps> = ({
  visible,
  application,
  onCancel,
  onSubmit,
  loading = false
}) => {
  const [form] = Form.useForm()
  const [approvalType, setApprovalType] = useState<'approved' | 'rejected'>('approved')

  const handleSubmit = (values: any) => {
    onSubmit({
      ...values,
      status: approvalType
    })
  }

  const handleApprovalTypeChange = (type: 'approved' | 'rejected') => {
    setApprovalType(type)
    form.setFieldsValue({ status: type })
  }

  if (!application) return null

  return (
    <Modal
      title={
        <Space>
          <UserOutlined />
          <span>访客申请审批</span>
          <Tag color="blue">{application.visitorName}</Tag>
        </Space>
      }
      open={visible}
      onCancel={onCancel}
      onOk={() => form.submit()}
      confirmLoading={loading}
      width={700}
      styles={{ body: { maxHeight: '70vh', overflowY: 'auto' } }}
    >
      {/* 访客信息概览 */}
      <Card size="small" style={{ marginBottom: 16, background: '#fafafa' }}>
        <Row gutter={16}>
          <Col span={12}>
            <Text type="secondary">访客姓名：</Text>
            <Text strong>{application.visitorName}</Text>
          </Col>
          <Col span={12}>
            <Text type="secondary">联系电话：</Text>
            <Text>{application.visitorPhone}</Text>
          </Col>
          <Col span={12} style={{ marginTop: 8 }}>
            <Text type="secondary">访客公司：</Text>
            <Text>{application.visitorCompany}</Text>
          </Col>
          <Col span={12} style={{ marginTop: 8 }}>
            <Text type="secondary">预约时间：</Text>
            <Text>{dayjs(application.scheduledTime).format('MM-DD HH:mm')}</Text>
          </Col>
          <Col span={24} style={{ marginTop: 8 }}>
            <Text type="secondary">访问目的：</Text>
            <Text>{application.visitPurpose}</Text>
          </Col>
        </Row>
      </Card>

      {/* 审批类型选择 */}
      <div style={{ marginBottom: 16 }}>
        <Title level={5}>审批决定</Title>
        <Space size="large">
          <div 
            onClick={() => handleApprovalTypeChange('approved')}
            style={{ 
              cursor: 'pointer',
              padding: '8px 16px',
              border: `2px solid ${approvalType === 'approved' ? '#52c41a' : '#d9d9d9'}`,
              borderRadius: 6,
              background: approvalType === 'approved' ? '#f6ffed' : 'transparent'
            }}
          >
            <Space>
              <CheckCircleOutlined style={{ color: '#52c41a' }} />
              <Text strong style={{ color: approvalType === 'approved' ? '#52c41a' : undefined }}>
                通过申请
              </Text>
            </Space>
          </div>
          <div 
            onClick={() => handleApprovalTypeChange('rejected')}
            style={{ 
              cursor: 'pointer',
              padding: '8px 16px',
              border: `2px solid ${approvalType === 'rejected' ? '#ff4d4f' : '#d9d9d9'}`,
              borderRadius: 6,
              background: approvalType === 'rejected' ? '#fff2f0' : 'transparent'
            }}
          >
            <Space>
              <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
              <Text strong style={{ color: approvalType === 'rejected' ? '#ff4d4f' : undefined }}>
                拒绝申请
              </Text>
            </Space>
          </div>
        </Space>
      </div>

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          status: 'approved',
          usageLimit: 2,
          duration: application.duration,
          allowedAreas: ['lobby', 'office'],
          notifyVisitor: true,
          notifyApplicant: true
        }}
      >
        <Form.Item name="status" hidden>
          <Input />
        </Form.Item>

        {approvalType === 'approved' && (
          <>
            <Divider orientation="left">通行设置</Divider>
            
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  label="使用次数限制"
                  name="usageLimit"
                  rules={[{ required: true, message: '请设置使用次数' }]}
                  tooltip="访客可以使用通行码的次数"
                >
                  <InputNumber 
                    min={1} 
                    max={10} 
                    style={{ width: '100%' }}
                    addonAfter="次"
                  />
                </Form.Item>
              </Col>
              
              <Col span={12}>
                <Form.Item
                  label="访问时长（小时）"
                  name="duration"
                  rules={[{ required: true, message: '请设置访问时长' }]}
                  tooltip="通行码的有效时长"
                >
                  <InputNumber 
                    min={1} 
                    max={24} 
                    style={{ width: '100%' }}
                    addonAfter="小时"
                  />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item
              label="允许访问区域"
              name="allowedAreas"
              tooltip="选择访客可以访问的区域"
            >
              <Checkbox.Group>
                <Row gutter={[16, 8]}>
                  <Col span={8}>
                    <Checkbox value="lobby">大厅</Checkbox>
                  </Col>
                  <Col span={8}>
                    <Checkbox value="office">办公区</Checkbox>
                  </Col>
                  <Col span={8}>
                    <Checkbox value="meeting">会议室</Checkbox>
                  </Col>
                  <Col span={8}>
                    <Checkbox value="parking">停车场</Checkbox>
                  </Col>
                  <Col span={8}>
                    <Checkbox value="cafe">咖啡厅</Checkbox>
                  </Col>
                  <Col span={8}>
                    <Checkbox value="rooftop">天台</Checkbox>
                  </Col>
                </Row>
              </Checkbox.Group>
            </Form.Item>

            <Form.Item
              label="特殊说明"
              name="specialInstructions"
              tooltip="给访客的特殊提醒或说明"
            >
              <TextArea 
                rows={2} 
                placeholder="如：请从A座电梯上楼，到达后联系前台等"
                maxLength={200}
                showCount
              />
            </Form.Item>

            <Divider orientation="left">通知设置</Divider>
            
            <Form.Item name="notifications">
              <Checkbox.Group>
                <Space direction="vertical">
                  <Checkbox value="notifyVisitor">
                    通知访客（发送通行码和访问说明）
                  </Checkbox>
                  <Checkbox value="notifyApplicant">
                    通知申请人（告知审批结果）
                  </Checkbox>
                  <Checkbox value="notifyReception">
                    通知前台（访客到访提醒）
                  </Checkbox>
                </Space>
              </Checkbox.Group>
            </Form.Item>
          </>
        )}

        <Form.Item
          label={approvalType === 'approved' ? '审批备注' : '拒绝原因'}
          name="reason"
          rules={approvalType === 'rejected' ? [{ required: true, message: '请填写拒绝原因' }] : []}
        >
          <TextArea 
            rows={3} 
            placeholder={
              approvalType === 'approved' 
                ? '请输入审批备注（可选）' 
                : '请说明拒绝原因，将发送给申请人'
            }
            maxLength={500}
            showCount
          />
        </Form.Item>

        {approvalType === 'rejected' && (
          <Alert
            message="拒绝申请后"
            description="系统将自动通知申请人和访客，并说明拒绝原因。申请人可以修改申请后重新提交。"
            type="warning"
            showIcon
            style={{ marginTop: 16 }}
          />
        )}

        {approvalType === 'approved' && (
          <Alert
            message="通过申请后"
            description={
              <div>
                <p>• 系统将自动生成通行码并发送给访客</p>
                <p>• 通行码将在设定时间后自动失效</p>
                <p>• 可在访客详情页面查看使用情况和延长有效期</p>
              </div>
            }
            type="success"
            showIcon
            style={{ marginTop: 16 }}
          />
        )}
      </Form>
    </Modal>
  )
}

export default VisitorApprovalModal