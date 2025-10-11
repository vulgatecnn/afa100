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
  Modal,
  Drawer
} from 'antd'
import { 
  PlusOutlined, 
  SearchOutlined, 
  EditOutlined, 
  DeleteOutlined,
  SettingOutlined,
  EyeOutlined
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { merchantService, type Merchant } from '../../services/merchantService'
import PermissionModal from './components/PermissionModal'
import MerchantDetail from './components/MerchantDetail'
import type { ColumnsType } from 'antd/es/table'

const { Title } = Typography
const { Search } = Input
const { Option } = Select

const MerchantList: React.FC = () => {
  const navigate = useNavigate()
  const [merchants, setMerchants] = useState<Merchant[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [searchText, setSearchText] = useState('')
  const [statusFilter, setStatusFilter] = useState<'active' | 'inactive' | undefined>()
  
  // 权限分配模态框
  const [permissionModalVisible, setPermissionModalVisible] = useState(false)
  const [selectedMerchant, setSelectedMerchant] = useState<Merchant | null>(null)
  
  // 商户详情抽屉
  const [detailDrawerVisible, setDetailDrawerVisible] = useState(false)

  // 加载商户列表
  const loadMerchants = async () => {
    try {
      setLoading(true)
      const response = await merchantService.getMerchants({
        page: currentPage,
        pageSize,
        search: searchText || undefined,
        status: statusFilter
      })
      setMerchants(response.merchants)
      setTotal(response.total)
    } catch (error) {
      message.error('加载商户列表失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadMerchants()
  }, [currentPage, pageSize, searchText, statusFilter])

  // 删除商户
  const handleDelete = async (id: number) => {
    try {
      await merchantService.deleteMerchant(id)
      message.success('删除成功')
      loadMerchants()
    } catch (error) {
      message.error('删除失败')
    }
  }

  // 切换商户状态
  const handleToggleStatus = async (merchant: Merchant) => {
    try {
      const newStatus = merchant.status === 'active' ? 'inactive' : 'active'
      await merchantService.toggleMerchantStatus(merchant.id, newStatus)
      message.success(`${newStatus === 'active' ? '启用' : '停用'}成功`)
      loadMerchants()
    } catch (error) {
      message.error('操作失败')
    }
  }

  // 打开权限分配模态框
  const handleOpenPermissionModal = (merchant: Merchant) => {
    setSelectedMerchant(merchant)
    setPermissionModalVisible(true)
  }

  // 权限分配成功回调
  const handlePermissionAssigned = () => {
    setPermissionModalVisible(false)
    setSelectedMerchant(null)
    loadMerchants()
  }

  // 查看商户详情
  const handleViewDetail = (merchant: Merchant) => {
    setSelectedMerchant(merchant)
    setDetailDrawerVisible(true)
  }

  // 表格列定义
  const columns: ColumnsType<Merchant> = [
    {
      title: '商户名称',
      dataIndex: 'name',
      key: 'name',
      width: 200,
      ellipsis: true,
    },
    {
      title: '商户编码',
      dataIndex: 'code',
      key: 'code',
      width: 120,
    },
    {
      title: '联系人',
      dataIndex: 'contact',
      key: 'contact',
      width: 100,
    },
    {
      title: '联系电话',
      dataIndex: 'phone',
      key: 'phone',
      width: 130,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 80,
      render: (status: string) => (
        <Tag color={status === 'active' ? 'green' : 'red'}>
          {status === 'active' ? '启用' : '停用'}
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
      width: 150,
      render: (date: string) => new Date(date).toLocaleDateString(),
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
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => navigate(`/merchants/${record.id}/edit`)}
            title="编辑"
          />
          <Button
            type="text"
            icon={<SettingOutlined />}
            onClick={() => handleOpenPermissionModal(record)}
            title="权限设置"
          />
          <Button
            type="text"
            onClick={() => handleToggleStatus(record)}
            title={record.status === 'active' ? '停用' : '启用'}
          >
            {record.status === 'active' ? '停用' : '启用'}
          </Button>
          <Popconfirm
            title="确定要删除这个商户吗？"
            description="删除后将无法恢复，且会影响该商户下的所有员工。"
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
          <Title level={4} style={{ margin: 0 }}>商户管理</Title>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => navigate('/merchants/new')}
          >
            新增商户
          </Button>
        </div>

        <div style={{ marginBottom: 16, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <Search
            placeholder="搜索商户名称、编码或联系人"
            allowClear
            style={{ width: 300 }}
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
            <Option value="active">启用</Option>
            <Option value="inactive">停用</Option>
          </Select>
        </div>

        <Table
          columns={columns}
          dataSource={merchants}
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

      {/* 权限分配模态框 */}
      <PermissionModal
        visible={permissionModalVisible}
        merchant={selectedMerchant}
        onCancel={() => {
          setPermissionModalVisible(false)
          setSelectedMerchant(null)
        }}
        onSuccess={handlePermissionAssigned}
      />

      {/* 商户详情抽屉 */}
      <Drawer
        title="商户详情"
        width={600}
        open={detailDrawerVisible}
        onClose={() => {
          setDetailDrawerVisible(false)
          setSelectedMerchant(null)
        }}
      >
        {selectedMerchant && (
          <MerchantDetail merchant={selectedMerchant} />
        )}
      </Drawer>
    </div>
  )
}

export default MerchantList