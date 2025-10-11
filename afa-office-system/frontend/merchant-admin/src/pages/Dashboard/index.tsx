import React, { useState, useEffect } from 'react'
import { 
  Row, 
  Col, 
  Card, 
  Statistic, 
  Typography, 
  List, 
  Avatar, 
  Tag, 
  Button,
  Space,
  Divider,
  Tabs,
  Progress,
  Alert,
  Select,
  DatePicker
} from 'antd'
import { 
  TeamOutlined, 
  UserAddOutlined, 
  CheckCircleOutlined, 
  ClockCircleOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  BarChartOutlined,
  PieChartOutlined,
  LineChartOutlined,
  CalendarOutlined,
  SettingOutlined
} from '@ant-design/icons'
import { Column, Pie } from '@ant-design/charts'
import { useAuth } from '../../hooks/useAuth'
import { visitorService } from '../../services/visitorService'
import { employeeService } from '../../services/employeeService'
import AdvancedCharts from '../../components/AdvancedCharts'
import dayjs from 'dayjs'

const { Title, Text } = Typography
const { TabPane } = Tabs
const { Option } = Select
const { RangePicker } = DatePicker

interface DashboardStats {
  employees: {
    total: number
    active: number
    inactive: number
    newThisMonth: number
    departments: Array<{
      name: string
      count: number
      activeRate: number
    }>
  }
  visitors: {
    total: number
    pending: number
    approved: number
    rejected: number
    todayVisits: number
    weeklyGrowth: number
    monthlyGrowth: number
    averageApprovalTime: number
  }
  access: {
    totalToday: number
    peakHour: string
    averageDaily: number
    weeklyPattern: Array<{
      day: string
      count: number
    }>
  }
  recentApplications: Array<{
    id: number
    visitorName: string
    visitPurpose: string
    status: string
    createdAt: string
    urgency?: 'high' | 'medium' | 'low'
  }>
  alerts: Array<{
    id: number
    type: 'warning' | 'info' | 'error'
    message: string
    time: string
  }>
}

const Dashboard: React.FC = () => {
  const { user } = useAuth()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
    dayjs().subtract(7, 'day'),
    dayjs()
  ])
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null)

  useEffect(() => {
    loadDashboardData()
    
    // 设置自动刷新
    const interval = setInterval(loadDashboardData, 5 * 60 * 1000) // 5分钟刷新一次
    setRefreshInterval(interval)
    
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [dateRange])

  useEffect(() => {
    return () => {
      if (refreshInterval) clearInterval(refreshInterval)
    }
  }, [refreshInterval])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      
      // 增强的模拟数据
      const mockStats: DashboardStats = {
        employees: {
          total: 45,
          active: 42,
          inactive: 3,
          newThisMonth: 5,
          departments: [
            { name: '技术部', count: 18, activeRate: 95 },
            { name: '市场部', count: 12, activeRate: 88 },
            { name: '人事部', count: 8, activeRate: 92 },
            { name: '财务部', count: 7, activeRate: 85 }
          ]
        },
        visitors: {
          total: 128,
          pending: 8,
          approved: 95,
          rejected: 25,
          todayVisits: 12,
          weeklyGrowth: 15.2,
          monthlyGrowth: 28.5,
          averageApprovalTime: 2.5
        },
        access: {
          totalToday: 156,
          peakHour: '09:00-10:00',
          averageDaily: 142,
          weeklyPattern: [
            { day: '周一', count: 165 },
            { day: '周二', count: 148 },
            { day: '周三', count: 152 },
            { day: '周四', count: 139 },
            { day: '周五', count: 171 },
            { day: '周六', count: 89 },
            { day: '周日', count: 67 }
          ]
        },
        recentApplications: [
          {
            id: 1,
            visitorName: '张三',
            visitPurpose: '商务洽谈',
            status: 'pending',
            createdAt: '2024-01-15T10:30:00Z',
            urgency: 'high'
          },
          {
            id: 2,
            visitorName: '李四',
            visitPurpose: '技术交流',
            status: 'approved',
            createdAt: '2024-01-15T09:15:00Z',
            urgency: 'medium'
          },
          {
            id: 3,
            visitorName: '王五',
            visitPurpose: '面试',
            status: 'pending',
            createdAt: '2024-01-15T08:45:00Z',
            urgency: 'high'
          },
          {
            id: 4,
            visitorName: '赵六',
            visitPurpose: '设备维护',
            status: 'approved',
            createdAt: '2024-01-15T08:00:00Z',
            urgency: 'low'
          }
        ],
        alerts: [
          {
            id: 1,
            type: 'warning',
            message: '有 3 个高优先级访客申请待处理',
            time: '2024-01-15T10:30:00Z'
          },
          {
            id: 2,
            type: 'info',
            message: '今日通行人次已达到日均水平的 110%',
            time: '2024-01-15T10:00:00Z'
          }
        ]
      }
      
      setStats(mockStats)
    } catch (error) {
      console.error('加载仪表板数据失败:', error)
    } finally {
      setLoading(false)
    }
  }

  // 访客状态分布图数据
  const visitorStatusData = stats ? [
    { type: '待审批', value: stats.visitors.pending },
    { type: '已通过', value: stats.visitors.approved },
    { type: '已拒绝', value: stats.visitors.rejected },
  ] : []

  // 员工状态分布图数据
  const employeeStatusData = stats ? [
    { type: '在职', value: stats.employees.active },
    { type: '离职', value: stats.employees.inactive },
  ] : []

  // 最近7天访客趋势数据（模拟）
  const visitorTrendData = [
    { date: '01-09', count: 8 },
    { date: '01-10', count: 12 },
    { date: '01-11', count: 6 },
    { date: '01-12', count: 15 },
    { date: '01-13', count: 9 },
    { date: '01-14', count: 11 },
    { date: '01-15', count: 12 },
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'orange'
      case 'approved': return 'green'
      case 'rejected': return 'red'
      default: return 'default'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return '待审批'
      case 'approved': return '已通过'
      case 'rejected': return '已拒绝'
      default: return status
    }
  }

  // 生成高级图表数据
  const getAdvancedChartsData = () => {
    return {
      visitorTrend: [
        { date: '01-09', count: 8, type: '申请' },
        { date: '01-09', count: 6, type: '通过' },
        { date: '01-09', count: 2, type: '拒绝' },
        { date: '01-10', count: 12, type: '申请' },
        { date: '01-10', count: 9, type: '通过' },
        { date: '01-10', count: 3, type: '拒绝' },
        { date: '01-11', count: 6, type: '申请' },
        { date: '01-11', count: 5, type: '通过' },
        { date: '01-11', count: 1, type: '拒绝' },
        { date: '01-12', count: 15, type: '申请' },
        { date: '01-12', count: 12, type: '通过' },
        { date: '01-12', count: 3, type: '拒绝' },
        { date: '01-13', count: 9, type: '申请' },
        { date: '01-13', count: 7, type: '通过' },
        { date: '01-13', count: 2, type: '拒绝' },
        { date: '01-14', count: 11, type: '申请' },
        { date: '01-14', count: 8, type: '通过' },
        { date: '01-14', count: 3, type: '拒绝' },
        { date: '01-15', count: 12, type: '申请' },
        { date: '01-15', count: 10, type: '通过' },
        { date: '01-15', count: 2, type: '拒绝' }
      ],
      departmentStats: (stats?.employees.departments || []).map(dept => ({
        department: dept.name,
        employees: dept.count,
        activeRate: dept.activeRate
      })),
      accessPattern: [
        { hour: 8, count: 12 },
        { hour: 9, count: 45 },
        { hour: 10, count: 38 },
        { hour: 11, count: 25 },
        { hour: 12, count: 15 },
        { hour: 13, count: 8 },
        { hour: 14, count: 22 },
        { hour: 15, count: 28 },
        { hour: 16, count: 35 },
        { hour: 17, count: 42 },
        { hour: 18, count: 48 },
        { hour: 19, count: 25 },
        { hour: 20, count: 8 }
      ],
      monthlyComparison: [
        { month: '10月', visitors: 95, employees: 40 },
        { month: '11月', visitors: 108, employees: 42 },
        { month: '12月', visitors: 120, employees: 43 },
        { month: '1月', visitors: 128, employees: 45 }
      ],
      visitorTypeDistribution: [
        { type: '商务访问', value: 45, percentage: 35.2 },
        { type: '面试', value: 32, percentage: 25.0 },
        { type: '技术交流', value: 28, percentage: 21.9 },
        { type: '设备维护', value: 15, percentage: 11.7 },
        { type: '其他', value: 8, percentage: 6.2 }
      ]
    }
  }

  return (
    <div>
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Title level={4}>工作台</Title>
          <Text type="secondary">
            欢迎回来，{user?.name}！今天是 {dayjs().format('YYYY年MM月DD日')}
          </Text>
        </div>
        <Space>
          <RangePicker
            value={dateRange}
            onChange={(dates) => dates && setDateRange(dates as [dayjs.Dayjs, dayjs.Dayjs])}
            style={{ width: 240 }}
          />
          <Button 
            icon={<SettingOutlined />} 
            onClick={loadDashboardData}
            loading={loading}
          >
            刷新
          </Button>
        </Space>
      </div>

      {/* 系统警告 */}
      {stats?.alerts && stats.alerts.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          {stats.alerts.map(alert => (
            <Alert
              key={alert.id}
              message={alert.message}
              type={alert.type}
              showIcon
              closable
              style={{ marginBottom: 8 }}
            />
          ))}
        </div>
      )}

      {/* 增强的统计卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="员工总数"
              value={stats?.employees.total || 0}
              prefix={<TeamOutlined />}
              valueStyle={{ color: '#1890ff' }}
              suffix={
                <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
                  <div>在职: {stats?.employees.active || 0}</div>
                  <div>本月新增: +{stats?.employees.newThisMonth || 0}</div>
                </div>
              }
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="今日访客"
              value={stats?.visitors.todayVisits || 0}
              prefix={<UserAddOutlined />}
              valueStyle={{ color: '#52c41a' }}
              suffix={
                <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
                  <div style={{ color: '#52c41a' }}>
                    <ArrowUpOutlined /> 周增长 {stats?.visitors.weeklyGrowth || 0}%
                  </div>
                  <div>日均: {Math.round((stats?.access.averageDaily || 0) / 7)}</div>
                </div>
              }
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="待审批"
              value={stats?.visitors.pending || 0}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#faad14' }}
              suffix={
                <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
                  <div>平均审批: {stats?.visitors.averageApprovalTime || 0}h</div>
                  <div>高优先级: {stats?.recentApplications.filter(app => app.urgency === 'high').length || 0}</div>
                </div>
              }
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="今日通行"
              value={stats?.access.totalToday || 0}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#722ed1' }}
              suffix={
                <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
                  <div>高峰: {stats?.access.peakHour || 'N/A'}</div>
                  <div>
                    <Progress 
                      percent={Math.round(((stats?.access.totalToday || 0) / (stats?.access.averageDaily || 1)) * 100)} 
                      size="small" 
                      showInfo={false}
                    />
                  </div>
                </div>
              }
            />
          </Card>
        </Col>
      </Row>

      {/* 数据分析标签页 */}
      <Tabs activeKey={activeTab} onChange={setActiveTab} style={{ marginBottom: 16 }}>
        <TabPane 
          tab={
            <span>
              <BarChartOutlined />
              概览
            </span>
          } 
          key="overview"
        >
          <Row gutter={[16, 16]}>
            {/* 访客趋势图 */}
            <Col xs={24} lg={16}>
              <Card title="最近7天访客趋势" loading={loading}>
                <Column
                  data={visitorTrendData}
                  xField="date"
                  yField="count"
                  height={300}
                  columnStyle={{
                    fill: '#1890ff',
                    fillOpacity: 0.8,
                  }}
                  label={{
                    position: 'middle',
                    style: {
                      fill: '#FFFFFF',
                      opacity: 0.6,
                    },
                  }}
                />
              </Card>
            </Col>

            {/* 访客状态分布 */}
            <Col xs={24} lg={8}>
              <Card title="访客状态分布" loading={loading}>
                <Pie
                  data={visitorStatusData}
                  angleField="value"
                  colorField="type"
                  radius={0.8}
                  height={300}
                  label={{
                    type: 'outer',
                    content: '{name} {percentage}',
                  }}
                  interactions={[{ type: 'element-active' }]}
                />
              </Card>
            </Col>
          </Row>
        </TabPane>

        <TabPane 
          tab={
            <span>
              <LineChartOutlined />
              高级分析
            </span>
          } 
          key="advanced"
        >
          <AdvancedCharts data={getAdvancedChartsData()} loading={loading} />
        </TabPane>
      </Tabs>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        {/* 最近申请 */}
        <Col xs={24} lg={16}>
          <Card 
            title="最近访客申请" 
            loading={loading}
            extra={<Button type="link">查看全部</Button>}
          >
            <List
              itemLayout="horizontal"
              dataSource={stats?.recentApplications || []}
              renderItem={(item) => (
                <List.Item
                  actions={[
                    <Space>
                      {item.urgency && (
                        <Tag color={
                          item.urgency === 'high' ? 'red' : 
                          item.urgency === 'medium' ? 'orange' : 'blue'
                        }>
                          {item.urgency === 'high' ? '高优先级' : 
                           item.urgency === 'medium' ? '中优先级' : '低优先级'}
                        </Tag>
                      )}
                      <Tag color={getStatusColor(item.status)}>
                        {getStatusText(item.status)}
                      </Tag>
                    </Space>
                  ]}
                >
                  <List.Item.Meta
                    avatar={
                      <Avatar 
                        icon={<UserAddOutlined />} 
                        style={{ 
                          backgroundColor: item.urgency === 'high' ? '#ff4d4f' : 
                                          item.urgency === 'medium' ? '#faad14' : '#1890ff'
                        }}
                      />
                    }
                    title={
                      <Space>
                        <span>{item.visitorName}</span>
                        {item.status === 'pending' && item.urgency === 'high' && (
                          <Tag color="red" style={{ fontSize: '12px', height: '20px', lineHeight: '18px' }}>急</Tag>
                        )}
                      </Space>
                    }
                    description={
                      <Space direction="vertical" size={0}>
                        <Text>{item.visitPurpose}</Text>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {dayjs(item.createdAt).format('MM-DD HH:mm')}
                        </Text>
                      </Space>
                    }
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>

        {/* 快捷操作和系统状态 */}
        <Col xs={24} lg={8}>
          <Card title="快捷操作" loading={loading} style={{ marginBottom: 16 }}>
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
              <Button type="primary" block icon={<TeamOutlined />}>
                添加员工
              </Button>
              <Button block icon={<UserAddOutlined />}>
                处理访客申请
              </Button>
              <Button block icon={<CheckCircleOutlined />}>
                批量审批
              </Button>
            </Space>
          </Card>

          <Card title="系统状态" loading={loading}>
            <Space direction="vertical" style={{ width: '100%' }} size="small">
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text type="secondary">系统状态</Text>
                <Tag color="green">正常运行</Tag>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text type="secondary">数据同步</Text>
                <Text style={{ fontSize: 12 }}>{dayjs().format('HH:mm:ss')}</Text>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text type="secondary">在线员工</Text>
                <Text style={{ fontSize: 12 }}>{stats?.employees.active || 0} 人</Text>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text type="secondary">今日通行率</Text>
                <Progress 
                  percent={Math.round(((stats?.access.totalToday || 0) / (stats?.access.averageDaily || 1)) * 100)} 
                  size="small"
                  style={{ width: 60 }}
                />
              </div>
              <Divider style={{ margin: '8px 0' }} />
              <div>
                <Text type="secondary" style={{ fontSize: 11 }}>
                  数据更新频率：5分钟
                </Text>
              </div>
            </Space>
          </Card>
        </Col>
      </Row>
    </div>
  )
}

export default Dashboard