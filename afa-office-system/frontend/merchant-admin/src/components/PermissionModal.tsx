import React, { useState, useEffect } from 'react'
import {
  Modal,
  Form,
  Checkbox,
  Row,
  Col,
  Divider,
  Typography,
  Space,
  Tag,
  message,
  Spin
} from 'antd'
import { employeeService, type Employee } from '../services/employeeService'

const { Title, Text } = Typography

interface PermissionModalProps {
  visible: boolean
  employee: Employee | null
  onCancel: () => void
  onSuccess: () => void
}

interface PermissionGroup {
  title: string
  description: string
  permissions: Array<{
    code: string
    name: string
    description: string
  }>
}

const PermissionModal: React.FC<PermissionModalProps> = ({
  visible,
  employee,
  onCancel,
  onSuccess
}) => {
  const [form] = Form.useForm()
  const [saving, setSaving] = useState(false)

  // 权限分组配置
  const permissionGroups: PermissionGroup[] = [
    {
      title: '空间访问权限',
      description: '控制员工可以访问的物理空间',
      permissions: [
        {
          code: 'project_1_access',
          name: 'AFA大厦访问权限',
          description: '可以进入AFA大厦'
        },
        {
          code: 'venue_1_access',
          name: 'A座访问权限',
          description: '可以进入A座区域'
        },
        {
          code: 'venue_2_access',
          name: 'B座访问权限',
          description: '可以进入B座区域'
        },
        {
          code: 'floor_1_access',
          name: '1-10楼访问权限',
          description: '可以访问1-10楼层'
        },
        {
          code: 'floor_2_access',
          name: '11-20楼访问权限',
          description: '可以访问11-20楼层'
        }
      ]
    },
    {
      title: '管理权限',
      description: '控制员工在系统中的管理功能',
      permissions: [
        {
          code: 'visitor_approve',
          name: '访客审批权限',
          description: '可以审批访客申请'
        },
        {
          code: 'employee_manage',
          name: '员工管理权限',
          description: '可以管理其他员工'
        },
        {
          code: 'report_view',
          name: '报表查看权限',
          description: '可以查看统计报表'
        }
      ]
    },
    {
      title: '系统权限',
      description: '控制员工的系统功能使用权限',
      permissions: [
        {
          code: 'passcode_generate',
          name: '通行码生成权限',
          description: '可以生成临时通行码'
        },
        {
          code: 'access_log_view',
          name: '通行记录查看权限',
          description: '可以查看通行记录'
        },
        {
          code: 'system_config',
          name: '系统配置权限',
          description: '可以修改系统配置'
        }
      ]
    }
  ]

  useEffect(() => {
    if (visible && employee) {
      form.setFieldsValue({
        permissions: employee.permissions || []
      })
    }
  }, [visible, employee, form])

  const handleSubmit = async (values: { permissions: string[] }) => {
    if (!employee) return

    try {
      setSaving(true)
      await employeeService.assignPermissions(employee.id, values.permissions)
      message.success('权限设置成功')
      onSuccess()
    } catch (error) {
      message.error('权限设置失败')
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    form.resetFields()
    onCancel()
  }

  // 获取权限统计
  const getPermissionStats = () => {
    const selectedPermissions = form.getFieldValue('permissions') || []
    const totalPermissions = permissionGroups.reduce((sum, group) => sum + group.permissions.length, 0)
    return {
      selected: selectedPermissions.length,
      total: totalPermissions
    }
  }

  const stats = getPermissionStats()

  return (
    <Modal
      title={
        <Space>
          <span>权限设置</span>
          {employee && (
            <Tag color="blue">{employee.name}</Tag>
          )}
        </Space>
      }
      open={visible}
      onCancel={handleCancel}
      onOk={() => form.submit()}
      confirmLoading={saving}
      width={800}
      styles={{ body: { maxHeight: '70vh', overflowY: 'auto' } }}
    >
      <div style={{ marginBottom: 16 }}>
        <Space>
          <Text type="secondary">
            已选择 {stats.selected} / {stats.total} 项权限
          </Text>
          {employee && (
            <Text type="secondary">
              部门：{employee.department} | 职位：{employee.position}
            </Text>
          )}
        </Space>
      </div>

        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Form.Item name="permissions">
            <Checkbox.Group style={{ width: '100%' }}>
              {permissionGroups.map((group, groupIndex) => (
                <div key={group.title} style={{ marginBottom: 24 }}>
                  <Divider orientation="left">
                    <Title level={5} style={{ margin: 0 }}>
                      {group.title}
                    </Title>
                  </Divider>
                  <Text type="secondary" style={{ marginBottom: 12, display: 'block' }}>
                    {group.description}
                  </Text>
                  
                  <Row gutter={[16, 12]}>
                    {group.permissions.map((permission) => (
                      <Col xs={24} sm={12} key={permission.code}>
                        <div style={{ 
                          padding: 12, 
                          border: '1px solid #f0f0f0', 
                          borderRadius: 6,
                          height: '100%'
                        }}>
                          <Checkbox value={permission.code} style={{ marginBottom: 8 }}>
                            <Text strong>{permission.name}</Text>
                          </Checkbox>
                          <div>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              {permission.description}
                            </Text>
                          </div>
                        </div>
                      </Col>
                    ))}
                  </Row>
                </div>
              ))}
            </Checkbox.Group>
          </Form.Item>
        </Form>

        <Divider />
        
        <div style={{ background: '#fafafa', padding: 12, borderRadius: 6 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            <strong>权限说明：</strong>
            <br />
            • 空间访问权限：控制员工的物理通行范围
            <br />
            • 管理权限：控制员工在系统中的管理功能
            <br />
            • 系统权限：控制员工的高级系统功能
            <br />
            • 权限变更将在下次登录时生效
          </Text>
        </div>
    </Modal>
  )
}

export default PermissionModal