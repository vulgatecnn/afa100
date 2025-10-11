import React, { useState, useEffect } from 'react'
import { 
  Table, 
  Card, 
  Typography, 
  Space, 
  Input, 
  Select, 
  DatePicker, 
  Tag, 
  Button,
  message,
  Tooltip
} from 'antd'
import { SearchOutlined, ReloadOutlined, DownloadOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import { accessService, type AccessRecord, type AccessRecordsParams } from '../../services/accessService'

const { Title } = Typography
const { Search } = Input
const { Option } = Select
const { RangePicker } = DatePicker



const AccessRecords: React.FC = () => {
  const [records, setRecords] = useState<AccessRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  
  // 筛选条件
  const [searchText, setSearchText] = useState('')
  const [userTypeFilter, setUserTypeFilter] = useState<'employee' | 'visitor' | undefined>()
  const [resultFilter, setResultFilter] = useState<'success' | 'failed' | undefined>()
  const [directionFilter, setDirectionFilter] = useState<'in' | 'out' | undefined>()
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null)

  // 加载通行记录数据
  const loadAccessRecords = async () => {
    try {
      setLoading(true)
      
      const params: AccessRecordsParams = {
        page: currentPage,
        pageSize,
        search: searchText || undefined,
        userType: userTypeFilter,
        result: resultFilter,
        direction: directionFilter,
        startDate: dateRange?.[0]?.toISOString(),
        endDate: dateRange?.[1]?.toISOString()
      }
      
      const response = await accessService.getAccessRecords(params)
      setRecords(response.records)
      setTotal(response.total)
    } catch (error) {
      console.error('加载通行记录失败:', error)
      message.error('加载通行记录失败')
      setRecords([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAccessRecords()
  }, [currentPage, pageSize, searchText, userTypeFilter, resultFilter, directionFilter, dateRange])

  // 导出记录
  const handleExport = async () => {
    try {
      setLoading(true)
      message.info('导出功能开发中...')
      
      // TODO: 实现实际的导出功能
      // const params = {
      //   format: 'excel' as const,
      //   filters: {
      //     search: searchText || undefined,
      //     userType: userTypeFilter,
      //     result: resultFilter,
      //     direction: directionFilter,
      //     startDate: dateRange?.[0]?.toISOString(),
      //     endDate: dateRange?.[1]?.toISOString()
      //   }
      // }
      // 
      // const blob = await accessService.exportAccessRecords(params)
      // const url = window.URL.createObjectURL(blob)
      // const link = document.createElement('a')
      // link.href = url
      // link.download = `access-records-${dayjs().format('YYYY-MM-DD')}.xlsx`
      // document.body.appendChild(link)
      // link.click()
      // document.body.removeChild(link)
      // window.URL.revokeObjectURL(url)
      // message.success('导出成功')
    } catch (error) {
      console.error('导出失败:', error)
      message.error('导出失败')
    } finally {
      setLoading(false)
    }
  }

  // 刷新数据
  const handleRefresh = () => {
    loadAccessRecords()
  }

  // 表格列定义
  const columns: ColumnsType<AccessRecord> = [
    {
      title: '时间',
      dataIndex: 'timestamp',
      key: 'timestamp',
      width: 150,
      render: (timestamp: string) => (
        <div>
          <div>{dayjs(timestamp).format('YYYY-MM-DD')}</div>
          <div style={{ fontSize: 12, color: '#666' }}>
            {dayjs(timestamp).format('HH:mm:ss')}
          </div>
        </div>
      ),
      sorter: (a, b) => dayjs(a.timestamp).unix() - dayjs(b.timestamp).unix(),
      defaultSortOrder: 'descend'
    },
    {
      title: '用户信息',
      key: 'user',
      width: 150,
      render: (_, record) => (
        <div>
          <div>{record.userName}</div>
          <Tag 
            color={record.userType === 'employee' ? 'blue' : 'orange'} 
            size="small"
          >
            {record.userType === 'employee' ? '员工' : '访客'}
          </Tag>
        </div>
      ),
    },
    {
      title: '所属商户',
      dataIndex: 'merchantName',
      key: 'merchantName',
      width: 120,
      ellipsis: true,
    },
    {
      title: '通行方向',
      dataIndex: 'direction',
      key: 'direction',
      width: 80,
      render: (direction: string) => (
        <Tag color={direction === 'in' ? 'green' : 'red'}>
          {direction === 'in' ? '进入' : '离开'}
        </Tag>
      ),
    },
    {
      title: '通行结果',
      key: 'result',
      width: 100,
      render: (_, record) => (
        <div>
          <Tag color={record.result === 'success' ? 'success' : 'error'}>
            {record.result === 'success' ? '成功' : '失败'}
          </Tag>
          {record.failReason && (
            <Tooltip title={record.failReason}>
              <div style={{ fontSize: 12, color: '#ff4d4f', marginTop: 2 }}>
                {record.failReason}
              </div>
            </Tooltip>
          )}
        </div>
      ),
    },
    {
      title: '位置',
      key: 'location',
      width: 200,
      render: (_, record) => (
        <div>
          <div>{record.location.projectName}</div>
          <div style={{ fontSize: 12, color: '#666' }}>
            {record.location.venueName} - {record.location.floorName}
          </div>
        </div>
      ),
    },
    {
      title: '设备信息',
      key: 'device',
      width: 150,
      render: (_, record) => (
        <div>
          <div>{record.deviceType}</div>
          <div style={{ fontSize: 12, color: '#666' }}>
            {record.deviceId}
          </div>
        </div>
      ),
    },
  ]

  return (
    <div>
      <Card>
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Title level={4} style={{ margin: 0 }}>通行记录</Title>
          <Space>
            <Button 
              icon={<ReloadOutlined />} 
              onClick={handleRefresh}
            >
              刷新
            </Button>
            <Button 
              icon={<DownloadOutlined />} 
              onClick={handleExport}
            >
              导出
            </Button>
          </Space>
        </div>

        <div style={{ marginBottom: 16 }}>
          <Space wrap>
            <Search
              placeholder="搜索用户姓名或商户名称"
              allowClear
              style={{ width: 250 }}
              onSearch={setSearchText}
              enterButton={<SearchOutlined />}
            />
            
            <Select
              placeholder="用户类型"
              allowClear
              style={{ width: 120 }}
              value={userTypeFilter}
              onChange={setUserTypeFilter}
            >
              <Option value="employee">员工</Option>
              <Option value="visitor">访客</Option>
            </Select>
            
            <Select
              placeholder="通行方向"
              allowClear
              style={{ width: 120 }}
              value={directionFilter}
              onChange={setDirectionFilter}
            >
              <Option value="in">进入</Option>
              <Option value="out">离开</Option>
            </Select>
            
            <Select
              placeholder="通行结果"
              allowClear
              style={{ width: 120 }}
              value={resultFilter}
              onChange={setResultFilter}
            >
              <Option value="success">成功</Option>
              <Option value="failed">失败</Option>
            </Select>
            
            <RangePicker
              placeholder={['开始日期', '结束日期']}
              value={dateRange}
              onChange={setDateRange}
              style={{ width: 240 }}
            />
          </Space>
        </div>

        <Table
          columns={columns}
          dataSource={records}
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
    </div>
  )
}

export default AccessRecords