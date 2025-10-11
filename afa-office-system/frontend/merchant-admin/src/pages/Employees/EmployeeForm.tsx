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
  Select,
  Divider,
  Checkbox
} from 'antd'
import { ArrowLeftOutlined, SaveOutlined } from '@ant-design/icons'
import { useNavigate, useParams } from 'react-router-dom'
import { employeeService, type Employee, type CreateEmployeeData } from '../../services/employeeService'

const { Title } = Typography
const { Option } = Select

const EmployeeForm: React.FC = () => {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const isEdit = !!id
  
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [employee, setEmployee] = useState<Employee | null>(null)
  const [departments, setDepartments] = useState<string[]>([])
  const [availablePermissions] = useState([
    'project_1_access',
    'venue_1_access', 
    'venue_2_access',
    'floor_1_access',
    'floor_2_access',
    'visitor_approve'
  ])

  // 加载员工数据（编辑模式）
  useEffect(() => {
    if (isEdit && id) {
      loadEmployee(parseInt(id))
    }
    loadDepartments()
  }, [isEdit, id])

  const loadEmployee = async (employeeId: number) => {
    try {
      setLoading(true)
      const data = await employeeService.getEmployee(employeeId)
      setEmployee(data)
      form.setFieldsValue(data)
    } catch (error) {
      message.error('加载员工信息失败')
      navigate('/employees')
    } finally {
      setLoading(false)
    }
  }

  const loadDepartments = async () => {
    try {
      const depts = await employeeService.getDepartments()
      setDepartments(depts)
    } catch (error) {
      console.error('加载部门列表失败:', error)
    }
  }

  // 提交表单
  const handleSubmit = async (values: CreateEmployeeData) => {
    try {
      setLoading(true)
      
      if (isEdit && id) {
        await employeeService.updateEmployee(parseInt(id), values)
        message.success('更新成功')
      } else {
        await employeeService.createEmployee(values)
        message.success('创建成功')
      }
      
      navigate('/employees')
    } catch (error) {
      message.error(isEdit ? '更新失败' : '创建失败')
    } finally {
      setLoading(false)
    }
  }

  // 返回列表
  const handleBack = () => {
    navigate('/employees')
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
              {isEdit ? '编辑员工' : '新增员工'}
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
                label="姓名"
                name="name"
                rules={[
                  { required: true, message: '请输入员工姓名' },
                  { max: 50, message: '姓名不能超过50个字符' }
                ]}
              >
                <Input placeholder="请输入员工姓名" />
              </Form.Item>
            </Col>
            
            <Col xs={24} md={12}>
              <Form.Item
                label="手机号"
                name="phone"
                rules={[
                  { required: true, message: '请输入手机号' },
                  { pattern: /^1[3-9]\d{9}$/, message: '请输入有效的手机号码' }
                ]}
              >
                <Input placeholder="请输入手机号" />
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
            
            <Col xs={24} md={12}>
              <Form.Item
                label="部门"
                name="department"
                rules={[
                  { required: true, message: '请选择部门' }
                ]}
              >
                <Select 
                  placeholder="请选择部门"
                  showSearch
                  optionFilterProp="children"
                >
                  {departments.map(dept => (
                    <Option key={dept} value={dept}>{dept}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={24}>
            <Col xs={24} md={12}>
              <Form.Item
                label="职位"
                name="position"
                rules={[
                  { required: true, message: '请输入职位' },
                  { max: 50, message: '职位不能超过50个字符' }
                ]}
              >
                <Input placeholder="请输入职位" />
              </Form.Item>
            </Col>
          </Row>

          <Divider orientation="left">权限设置</Divider>

          <Form.Item
            label="通行权限"
            name="permissions"
            tooltip="选择该员工可以访问的区域"
          >
            <Checkbox.Group>
              <Row gutter={[16, 8]}>
                {availablePermissions.map(permission => (
                  <Col xs={24} sm={12} md={8} key={permission}>
                    <Checkbox value={permission}>
                      {getPermissionLabel(permission)}
                    </Checkbox>
                  </Col>
                ))}
              </Row>
            </Checkbox.Group>
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

// 权限标签映射
const getPermissionLabel = (permission: string): string => {
  const labelMap: Record<string, string> = {
    'project_1_access': 'AFA大厦访问权限',
    'venue_1_access': 'A座访问权限',
    'venue_2_access': 'B座访问权限', 
    'floor_1_access': '1-10楼访问权限',
    'floor_2_access': '11-20楼访问权限',
    'visitor_approve': '访客审批权限'
  }
  return labelMap[permission] || permission
}

export default EmployeeForm