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
  DatePicker,
  message,
  Modal,
  Form,
  InputNumber,
  Checkbox,
  Tooltip,
  Statistic,
  Row,
  Col
} from 'antd'
import { 
  SearchOutlined, 
  CheckOutlined, 
  CloseOutlined,
  EyeOutlined,
  DownloadOutlined,
  ExclamationCircleOutlined,
  ReloadOutlined,
  FilterOutlined,
  CalendarOutlined
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { visitorService, type VisitorApplication } from '../../services/visitorService'
import VisitorApprovalModal from '../../components/VisitorApprovalModal'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'

const { Title } = Typography
const { Search } = Input
const { Option } = Select
const { RangePicker } = DatePicker
const { TextArea } = Input

const VisitorList: React.FC = () => {
  const navigate = useNavigate()
  const [applications, setApplications] = useState<VisitorApplication[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [searchText, setSearchText] = useState('')
  const [statusFilter, setStatusFilter] = useState<'pending' | 'approved' | 'rejected' | 'expired' | undefined>()
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null)
  const [selectedRowKeys, setSelectedRowKeys] = useState<number[]>([])
  
  // 审批模态框相关状态
  const [approvalModalVisible, setApprovalModalVisible] = useState(false)
  const [currentApplication, setCurrentApplication] = useState<VisitorApplication | null>(null)
  const [approvalLoading, setApprovalLoading] = useState(false)
  
  // 统计数据
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    todayVisits: 0
  })

  // 加载访客申请列表
  const loadApplications = async () => {
    try {
      setLoading(true)
      const [applicationsResponse, statsResponse] = await Promise.all([
        visitorService.getVisitorApplications({
          page: currentPage,
          pageSize,
          search: searchText || undefined,
          status: statusFilter,
          startDate: dateRange?.[0]?.format('YYYY-MM-DD'),
          endDate: dateRange?.[1]?.format('YYYY-MM-DD')
        }),
        visitorService.getVisitorStats()
      ])
      
      setApplications(applicationsResponse.applications)
      setTotal(applicationsResponse.total)
      setStats(statsResponse)
    } catch (error) {
      message.error('加载访客申请失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadApplications()
  }, [currentPage, pageSize, searchText, statusFilter, dateRange])

  // 打开审批模态框
  const handleOpenApproval = (application: VisitorApplication) => {
    setCurrentApplication(application)
    setApprovalModalVisible(true)
  }

  // 提交审批
  const handleApproval = async (values: any) => {
    if (!currentApplication) return

    try {
      setApprovalLoading(true)
      await visitorService.approveVisitorApplication(currentApplication.id, values)
      message.success(`${values.status === 'approved' ? '审批通过' : '审批拒绝'}`)
      setApprovalModalVisible(false)
      setCurrentApplication(null)
      loadApplications()
    } catch (error) {
      message.error('审批失败')
    } finally {
      setApprovalLoading(false)
    }
  }

  // 关闭审批模态框
  const handleCloseApproval = () => {
    setApprovalModalVisible(false)
    setCurrentApplication(null)
  }

  // 批量审批
  const handleBatchApproval = (status: 'approved' | 'rejected') => {
    if (selectedRowKeys.length === 0) {
      message.warning('请选择要审批的申请')
      return
    }

    Modal.confirm({
      title: `确认批量${status === 'approved' ? '通过' : '拒绝'}`,
      icon: <ExclamationCircleOutlined />,
      content: `确定要${status === 'approved' ? '通过' : '拒绝'}选中的 ${selectedRowKeys.length} 个申请吗？`,
      onOk: async () => {
        try {
          await visitorService.batchApproveApplications(selectedRowKeys, {
            status,
            usageLimit: 2
          })
          message.success(`批量${status === 'approved' ? '通过' : '拒绝'}成功`)
          setSelectedRowKeys([])
          loadApplications()
        } catch (error) {
          message.error('批量审批失败')
        }
      }
    })
  }

  // 导出记录
  const handleExport = async () => {
    try {
      const blob = await visitorService.exportVisitorRecords({
        search: searchText || undefined,
        status: statusFilter,
        startDate: dateRange?.[0]?.format('YYYY-MM-DD'),
        endDate: dateRange?.[1]?.format('YYYY-MM-DD')
      })
      
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `访客记录_${dayjs().format('YYYY-MM-DD')}.xlsx`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      message.error('导出失败')
    }
  }

  // 查看详情
  const handleViewDetail = (application: VisitorApplication) => {
    navigate(`/visitors/${application.id}`)
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

  // 表格列定义
  const columns: ColumnsType<VisitorApplication> = [
    {
      title: '访客信息',
      key: 'visitor',
      width: 150,
      render: (_, record) => (
        <div>
          <div>{record.visitorName}</div>
          <div style={{ fontSize: 12, color: '#666' }}>
            {record.visitorPhone}
          </div>
        </div>
      ),
    },
    {
      title: '访问公司',
      dataIndex: 'visitorCompany',
      key: 'visitorCompany',
      width: 120,
      ellipsis: true,
    },
    {
      title: '访问目的',
      dataIndex: 'visitPurpose',
      key: 'visitPurpose',
      width: 120,
      ellipsis: true,
    },
    {
      title: '预约时间',
      key: 'scheduledTime',
      width: 150,
      render: (_, record) => (
        <div>
          <div>{dayjs(record.scheduledTime).format('MM-DD HH:mm')}</div>
          <div style={{ fontSize: 12, color: '#666' }}>
            {record.duration}小时
          </div>
        </div>
      ),
      sorter: (a, b) => dayjs(a.scheduledTime).unix() - dayjs(b.scheduledTime).unix(),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => (
        <Tag color={getStatusColor(status)}>
          {getStatusText(status)}
        </Tag>
      ),
    },
    {
      title: '申请时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 120,
      render: (date: string) => dayjs(date).format('MM-DD HH:mm'),
      sorter: (a, b) => dayjs(a.createdAt).unix() - dayjs(b.createdAt).unix(),
      defaultSortOrder: 'descend'
    },
    {
      title: '操作',
      key: 'actions',
      width: 200,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button
            type="text"
            icon={<EyeOutlined />}
            onClick={() => handleViewDetail(record)}
            title="查看详情"
          />
          {record.status === 'pending' && (
            <>
              <Tooltip title="审批">
                <Button
                  type="text"
                  icon={<CheckOutlined />}
                  onClick={() => handleOpenApproval(record)}
                  style={{ color: '#52c41a' }}
                />
              </Tooltip>
            </>
          )}
        </Space>
      ),
    },
  ]

  // 行选择配置
  const rowSelection = {
    selectedRowKeys,
    onChange: (keys: React.Key[]) => {
      setSelectedRowKeys(keys as number[])
    },
    getCheckboxProps: (record: VisitorApplication) => ({
      disabled: record.status !== 'pending'
    })
  }

  return (
    <div>
      {/* 统计卡片 */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={6}>
          <Card size="small">
            <Statistic
              title="总申请数"
              value={stats.total}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card size="small">
            <Statistic
              title="待审批"
              value={stats.pending}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card size="small">
            <Statistic
              title="已通过"
              value={stats.approved}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card size="small">
            <Statistic
              title="今日访客"
              value={stats.todayVisits}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
      </Row>

      <Card>
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Title level={4} style={{ margin: 0 }}>访客管理</Title>
          <Space>
            <Button
              icon={<ReloadOutlined />}
              onClick={loadApplications}
              title="刷新"
            />
            {selectedRowKeys.length > 0 && (
              <>
                <Button
                  icon={<CheckOutlined />}
                  onClick={() => handleBatchApproval('approved')}
                  style={{ color: '#52c41a' }}
                >
                  批量通过 ({selectedRowKeys.length})
                </Button>
                <Button
                  icon={<CloseOutlined />}
                  onClick={() => handleBatchApproval('rejected')}
                  style={{ color: '#ff4d4f' }}
                >
                  批量拒绝 ({selectedRowKeys.length})
                </Button>
              </>
            )}
            <Button
              icon={<DownloadOutlined />}
              onClick={handleExport}
            >
              导出记录
            </Button>
          </Space>
        </div>

        <div style={{ marginBottom: 16 }}>
          <Space wrap>
            <Search
              placeholder="搜索访客姓名、手机号或公司"
              allowClear
              style={{ width: 250 }}
              onSearch={setSearchText}
              enterButton={<SearchOutlined />}
            />
            
            <Select
              placeholder="状态筛选"
              allowClear
              style={{ width: 120 }}
              value={statusFilter}
              onChange={setStatusFilter}
            >
              <Option value="pending">待审批</Option>
              <Option value="approved">已通过</Option>
              <Option value="rejected">已拒绝</Option>
              <Option value="expired">已过期</Option>
            </Select>
            
            <RangePicker
              placeholder={['开始日期', '结束日期']}
              value={dateRange}
              onChange={(dates) => setDateRange(dates as [dayjs.Dayjs, dayjs.Dayjs] | null)}
              style={{ width: 240 }}
            />
          </Space>
        </div>

        <Table
          columns={columns}
          dataSource={applications}
          rowKey="id"
          loading={loading}
          rowSelection={rowSelection}
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

      {/* 增强的审批模态框 */}
      <VisitorApprovalModal
        visible={approvalModalVisible}
        application={currentApplication}
        onCancel={handleCloseApproval}
        onSubmit={handleApproval}
        loading={approvalLoading}
      />
    </div>
  )
}

export default VisitorList