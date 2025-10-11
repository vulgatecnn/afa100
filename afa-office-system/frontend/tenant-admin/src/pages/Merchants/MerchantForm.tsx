import React, { useState, useEffect } from 'react'
import { 
  Form, 
  Input, 
  Button, 
  Card, 
  Typography, 
  Space, 
  message,
  Row,
  Col,
  Divider
} from 'antd'
import { ArrowLeftOutlined, SaveOutlined } from '@ant-design/icons'
import { useNavigate, useParams } from 'react-router-dom'
import { merchantService, type Merchant, type CreateMerchantData } from '../../services/merchantService'

const { Title } = Typography
const { TextArea } = Input

const MerchantForm: React.FC = () => {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const isEdit = !!id
  
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [merchant, setMerchant] = useState<Merchant | null>(null)

  // 加载商户数据（编辑模式）
  useEffect(() => {
    if (isEdit && id) {
      loadMerchant(parseInt(id))
    }
  }, [isEdit, id])

  const loadMerchant = async (merchantId: number) => {
    try {
      setLoading(true)
      const data = await merchantService.getMerchant(merchantId)
      setMerchant(data)
      form.setFieldsValue(data)
    } catch (error) {
      message.error('加载商户信息失败')
      navigate('/merchants')
    } finally {
      setLoading(false)
    }
  }

  // 提交表单
  const handleSubmit = async (values: CreateMerchantData) => {
    try {
      setLoading(true)
      
      if (isEdit && id) {
        await merchantService.updateMerchant(parseInt(id), values)
        message.success('更新成功')
      } else {
        await merchantService.createMerchant(values)
        message.success('创建成功')
      }
      
      navigate('/merchants')
    } catch (error) {
      message.error(isEdit ? '更新失败' : '创建失败')
    } finally {
      setLoading(false)
    }
  }

  // 返回列表
  const handleBack = () => {
    navigate('/merchants')
  }

  return (
    <div>
      <Card>
        <div style={{ marginBottom: 24 }}>
          <Space>
            <Button 
              icon={<ArrowLeftOutlined />} 
              onClick={handleBack}
            >
              返回
            </Button>
            <Title level={4} style={{ margin: 0 }}>
              {isEdit ? '编辑商户' : '新增商户'}
            </Title>
          </Space>
        </div>

        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{
            permissions: []
          }}
        >
          <Row gutter={24}>
            <Col xs={24} md={12}>
              <Form.Item
                label="商户名称"
                name="name"
                rules={[
                  { required: true, message: '请输入商户名称' },
                  { max: 100, message: '商户名称不能超过100个字符' }
                ]}
              >
                <Input placeholder="请输入商户名称" />
              </Form.Item>
            </Col>
            
            <Col xs={24} md={12}>
              <Form.Item
                label="商户编码"
                name="code"
                rules={[
                  { required: true, message: '请输入商户编码' },
                  { pattern: /^[A-Z0-9_]+$/, message: '编码只能包含大写字母、数字和下划线' },
                  { max: 20, message: '编码不能超过20个字符' }
                ]}
              >
                <Input 
                  placeholder="请输入商户编码" 
                  style={{ textTransform: 'uppercase' }}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={24}>
            <Col xs={24} md={12}>
              <Form.Item
                label="联系人"
                name="contact"
                rules={[
                  { required: true, message: '请输入联系人姓名' },
                  { max: 50, message: '联系人姓名不能超过50个字符' }
                ]}
              >
                <Input placeholder="请输入联系人姓名" />
              </Form.Item>
            </Col>
            
            <Col xs={24} md={12}>
              <Form.Item
                label="联系电话"
                name="phone"
                rules={[
                  { required: true, message: '请输入联系电话' },
                  { pattern: /^1[3-9]\d{9}$/, message: '请输入有效的手机号码' }
                ]}
              >
                <Input placeholder="请输入联系电话" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={24}>
            <Col xs={24} md={12}>
              <Form.Item
                label="邮箱地址"
                name="email"
                rules={[
                  { required: true, message: '请输入邮箱地址' },
                  { type: 'email', message: '请输入有效的邮箱地址' }
                ]}
              >
                <Input placeholder="请输入邮箱地址" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            label="地址"
            name="address"
            rules={[
              { required: true, message: '请输入地址' },
              { max: 200, message: '地址不能超过200个字符' }
            ]}
          >
            <TextArea 
              rows={3} 
              placeholder="请输入详细地址"
              showCount
              maxLength={200}
            />
          </Form.Item>

          <Divider />

          <Form.Item>
            <Space>
              <Button 
                type="primary" 
                htmlType="submit" 
                loading={loading}
                icon={<SaveOutlined />}
              >
                {isEdit ? '更新' : '创建'}
              </Button>
              <Button onClick={handleBack}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  )
}

export default MerchantForm