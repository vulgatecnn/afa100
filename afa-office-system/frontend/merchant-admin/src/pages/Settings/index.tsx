import React from 'react'
import { Card, Typography, Form, Input, Button, Switch, InputNumber, Select, message, Divider } from 'antd'
import { SaveOutlined } from '@ant-design/icons'

const { Title } = Typography
const { Option } = Select

const Settings: React.FC = () => {
  const [form] = Form.useForm()

  const handleSubmit = async (values: any) => {
    try {
      // 这里应该调用API保存设置
      console.log('保存设置:', values)
      message.success('设置保存成功')
    } catch (error) {
      message.error('保存设置失败')
    }
  }

  return (
    <div>
      <Card>
        <Title level={4}>系统设置</Title>
        
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{
            visitorApprovalMode: 'admin',
            passcodeUpdateFreq: 30,
            visitorPasscodeLimit: 2,
            autoApprove: false,
            notificationEnabled: true
          }}
        >
          <Divider orientation="left">访客管理设置</Divider>
          
          <Form.Item
            label="访客审批模式"
            name="visitorApprovalMode"
            tooltip="选择访客申请的审批方式"
          >
            <Select>
              <Option value="admin">管理员审批</Option>
              <Option value="visitee">被访人审批</Option>
              <Option value="both">双重审批</Option>
            </Select>
          </Form.Item>

          <Form.Item
            label="通行码使用次数限制"
            name="visitorPasscodeLimit"
            tooltip="访客通行码的默认使用次数限制"
          >
            <InputNumber min={1} max={10} />
          </Form.Item>

          <Form.Item
            label="自动审批"
            name="autoApprove"
            valuePropName="checked"
            tooltip="启用后，符合条件的访客申请将自动通过"
          >
            <Switch />
          </Form.Item>

          <Divider orientation="left">通行码设置</Divider>

          <Form.Item
            label="通行码更新频率（分钟）"
            name="passcodeUpdateFreq"
            tooltip="员工通行码的自动更新间隔"
          >
            <InputNumber min={5} max={120} />
          </Form.Item>

          <Divider orientation="left">通知设置</Divider>

          <Form.Item
            label="启用通知"
            name="notificationEnabled"
            valuePropName="checked"
            tooltip="启用后将接收访客申请等相关通知"
          >
            <Switch />
          </Form.Item>

          <Form.Item>
            <Button 
              type="primary" 
              htmlType="submit" 
              icon={<SaveOutlined />}
            >
              保存设置
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  )
}

export default Settings