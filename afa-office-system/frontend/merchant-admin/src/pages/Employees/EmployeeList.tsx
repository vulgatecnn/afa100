import React, { useState, useEffect } from 'react'
import { 
  Table, 
  Button, 
  Space, 
  Input, 
  Select, 
  Card, 
  Typography, 
  Tag, 
  Popconfirm,
  message,
  Upload,
  Modal,
  Progress,
  Tooltip
} from 'antd'
import { 
  PlusOutlined, 
  SearchOutlined, 
  EditOutlined, 
  DeleteOutlined,
  UploadOutlined,
  DownloadOutlined,
  SettingOutlined,
  ExportOutlined,
  ReloadOutlined
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { employeeService, type Employee } from '../../services/employeeService'
import PermissionModal from '../../components/PermissionModal'
import type { ColumnsType } from 'antd/es/table'
import type { UploadProps } from 'antd'

const { Title } = Typography
const { Search } = Input
const { Option } = Select

const EmployeeList: React.FC = () => {
  const navigate = useNavigate()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [searchText, setSearchText] = useState('')
  const [departmentFilter, setDepartmentFilter] = useState<string | undefined>()
  const [statusFilter, setStatusFilter] = useState<'active' | 'inactive' | undefined>()
  const [departments, setDepartments] = useState<string[]>([])
  
  // 批量导入相关状态
  const [importModalVisible, setImportModalVisible] = useState(false)
  const [importProgress, setImportProgress] = useState(0)
  const [importing, setImporting] = useState(false)
  
  // 权限管理相关状态
  const [permissionModalVisible, setPermissionModalVisible] = useState(false)
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)

  // 加载员工列表
  const loadEmployees = async () => {
    try {
      setLoading(true)
      const response = await employeeService.getEmployees({
        page: currentPage,
        pageSize,
        search: searchText || undefined,
        department: departmentFilter,
        status: statusFilter
      })
      setEmployees(response.employees)
      setTotal(response.total)
    } catch (error) {
      message.error('加载员工列表失败')
    } finally {
      setLoading(false)
    }
  }

  // 加载部门列表
  const loadDepartments = async () => {
    try {
      const depts = await employeeService.getDepartments()
      setDepartments(depts)
    } catch (error) {
      console.error('加载部门列表失败:', error)
    }
  }

  useEffect(() => {
    loadEmployees()
  }, [currentPage, pageSize, searchText, departmentFilter, statusFilter])

  useEffect(() => {
    loadDepartments()
  }, [])

  // 删除员工
  const handleDelete = async (id: number) => {
    try {
      await employeeService.deleteEmployee(id)
      message.success('删除成功')
      loadEmployees()
    } catch (error) {
      message.error('删除失败')
    }
  }

  // 切换员工状态
  const handleToggleStatus = async (employee: Employee) => {
    try {
      const newStatus = employee.status === 'active' ? 'inactive' : 'active'
      await employeeService.toggleEmployeeStatus(employee.id, newStatus)
      message.success(`${newStatus === 'active' ? '启用' : '停用'}成功`)
      loadEmployees()
    } catch (error) {
      message.error('操作失败')
    }
  }

  // 下载导入模板
  const handleDownloadTemplate = async () => {
    try {
      const blob = await employeeService.downloadTemplate()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = '员工导入模板.xlsx'
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      message.error('下载模板失败')
    }
  }

  // 批量导入配置
  const uploadProps: UploadProps = {
    name: 'file',
    accept: '.xlsx,.xls',
    showUploadList: false,
    beforeUpload: (file) => {
      const isExcel = file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
                     file.type === 'application/vnd.ms-excel'
      if (!isExcel) {
        message.error('只能上传Excel文件！')
        return false
      }
      
      handleImport(file)
      return false
    }
  }

  // 处理批量导入
  const handleImport = async (file: File) => {
    try {
      setImporting(true)
      setImportProgress(0)
      setImportModalVisible(true)
      
      // 模拟进度
      const progressInterval = setInterval(() => {
        setImportProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return prev
          }
          return prev + 10
        })
      }, 200)
      
      const result = await employeeService.batchImportEmployees(file)
      
      clearInterval(progressInterval)
      setImportProgress(100)
      
      setTimeout(() => {
        setImportModalVisible(false)
        setImporting(false)
        setImportProgress(0)
        
        if (result.failed > 0) {
          Modal.info({
            title: '导入完成',
            content: (
              <div>
                <p>成功导入：{result.success} 条</p>
                <p>失败：{result.failed} 条</p>
                {result.errors.length > 0 && (
                  <div style={{ marginTop: 8 }}>
                    <p>错误详情：</p>
                    <ul>
                      {result.errors.map((error, index) => (
                        <li key={index}>第{error.row}行：{error.message}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )
          })
        } else {
          message.success(`成功导入 ${result.success} 条员工记录`)
        }
        
        loadEmployees()
      }, 1000)
    } catch (error) {
      setImporting(false)
      setImportModalVisible(false)
      setImportProgress(0)
      message.error('导入失败')
    }
  }

  // 打开权限设置模态框
  const handleOpenPermissionModal = (employee: Employee) => {
    setSelectedEmployee(employee)
    setPermissionModalVisible(true)
  }

  // 关闭权限设置模态框
  const handleClosePermissionModal = () => {
    setSelectedEmployee(null)
    setPermissionModalVisible(false)
  }

  // 权限设置成功回调
  const handlePermissionSuccess = () => {
    handleClosePermissionModal()
    loadEmployees() // 重新加载员工列表
  }

  // 导出员工列表
  const handleExportEmployees = async () => {
    try {
      const blob = await employeeService.exportEmployees({
        search: searchText || undefined,
        department: departmentFilter,
        status: statusFilter
      })
      
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `员工列表_${new Date().toISOString().split('T')[0]}.xlsx`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      message.success('导出成功')
    } catch (error) {
      message.error('导出失败')
    }
  }

  // 表格列定义
  const columns: ColumnsType<Employee> = [
    {
      title: '姓名',
      dataIndex: 'name',
      key: 'name',
      width: 100,
    },
    {
      title: '手机号',
      dataIndex: 'phone',
      key: 'phone',
      width: 120,
    },
    {
      title: '邮箱',
      dataIndex: 'email',
      key: 'email',
      width: 180,
      ellipsis: true,
    },
    {
      title: '部门',
      dataIndex: 'department',
      key: 'department',
      width: 100,
    },
    {
      title: '职位',
      dataIndex: 'position',
      key: 'position',
      width: 120,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 80,
      render: (status: string) => (
        <Tag color={status === 'active' ? 'green' : 'red'}>
          {status === 'active' ? '在职' : '离职'}
        </Tag>
      ),
    },
    {
      title: '权限数量',
      dataIndex: 'permissions',
      key: 'permissions',
      width: 100,
      render: (permissions: string[]) => (
        <span>{permissions?.length || 0}</span>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 120,
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
    {
      title: '操作',
      key: 'actions',
      width: 180,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => navigate(`/employees/${record.id}/edit`)}
            title="编辑"
          />
          <Tooltip title="权限设置">
            <Button
              type="text"
              icon={<SettingOutlined />}
              onClick={() => handleOpenPermissionModal(record)}
            />
          </Tooltip>
          <Button
            type="text"
            onClick={() => handleToggleStatus(record)}
            title={record.status === 'active' ? '停用' : '启用'}
          >
            {record.status === 'active' ? '停用' : '启用'}
          </Button>
          <Popconfirm
            title="确定要删除这个员工吗？"
            description="删除后将无法恢复。"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              title="删除"
            />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div>
      <Card>
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Title level={4} style={{ margin: 0 }}>员工管理</Title>
          <Space>
            <Button
              icon={<ReloadOutlined />}
              onClick={loadEmployees}
              title="刷新"
            />
            <Button
              icon={<ExportOutlined />}
              onClick={handleExportEmployees}
            >
              导出列表
            </Button>
            <Button
              icon={<DownloadOutlined />}
              onClick={handleDownloadTemplate}
            >
              下载模板
            </Button>
            <Upload {...uploadProps}>
              <Button icon={<UploadOutlined />}>
                批量导入
              </Button>
            </Upload>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => navigate('/employees/new')}
            >
              新增员工
            </Button>
          </Space>
        </div>

        <div style={{ marginBottom: 16, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <Search
            placeholder="搜索员工姓名、手机号或邮箱"
            allowClear
            style={{ width: 300 }}
            onSearch={setSearchText}
            enterButton={<SearchOutlined />}
          />
          <Select
            placeholder="部门筛选"
            allowClear
            style={{ width: 150 }}
            value={departmentFilter}
            onChange={setDepartmentFilter}
          >
            {departments.map(dept => (
              <Option key={dept} value={dept}>{dept}</Option>
            ))}
          </Select>
          <Select
            placeholder="状态筛选"
            allowClear
            style={{ width: 120 }}
            value={statusFilter}
            onChange={setStatusFilter}
          >
            <Option value="active">在职</Option>
            <Option value="inactive">离职</Option>
          </Select>
        </div>

        <Table
          columns={columns}
          dataSource={employees}
          rowKey="id"
          loading={loading}
          scroll={{ x: 1200 }}
          pagination={{
            current: currentPage,
            pageSize,
            total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 条`,
            onChange: (page, size) => {
              setCurrentPage(page)
              setPageSize(size || 10)
            },
          }}
        />
      </Card>

      {/* 导入进度模态框 */}
      <Modal
        title="批量导入员工"
        open={importModalVisible}
        footer={null}
        closable={false}
        centered
      >
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <Progress 
            type="circle" 
            percent={importProgress} 
            status={importing ? 'active' : 'success'}
          />
          <div style={{ marginTop: 16 }}>
            {importing ? '正在导入员工数据...' : '导入完成'}
          </div>
        </div>
      </Modal>

      {/* 权限设置模态框 */}
      <PermissionModal
        visible={permissionModalVisible}
        employee={selectedEmployee}
        onCancel={handleClosePermissionModal}
        onSuccess={handlePermissionSuccess}
      />
    </div>
  )
}

export default EmployeeList