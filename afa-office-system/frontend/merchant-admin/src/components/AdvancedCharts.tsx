import React from 'react'
import { Card, Row, Col, Typography, Space, Tag } from 'antd'
import { Column, Line, Pie, Area } from '@ant-design/charts'
import { 
  RiseOutlined, 
  FallOutlined,
  MinusOutlined
} from '@ant-design/icons'

const { Title, Text } = Typography

interface ChartData {
  visitorTrend: Array<{
    date: string
    count: number
    type: string
  }>
  departmentStats: Array<{
    department: string
    employees: number
    activeRate: number
  }>
  accessPattern: Array<{
    hour: number
    count: number
  }>
  monthlyComparison: Array<{
    month: string
    visitors: number
    employees: number
  }>
  visitorTypeDistribution: Array<{
    type: string
    value: number
    percentage: number
  }>
}

interface AdvancedChartsProps {
  data: ChartData
  loading?: boolean
}

const AdvancedCharts: React.FC<AdvancedChartsProps> = ({ data, loading = false }) => {
  // 访客趋势图配置
  const visitorTrendConfig = {
    data: data.visitorTrend,
    xField: 'date',
    yField: 'count',
    seriesField: 'type',
    height: 300,
    smooth: true,
    animation: {
      appear: {
        animation: 'path-in',
        duration: 1000,
      },
    },
    color: ['#1890ff', '#52c41a', '#faad14'],
    legend: {
      position: 'top' as const,
    },
    tooltip: {
      formatter: (datum: any) => {
        return {
          name: datum.type,
          value: `${datum.count} 人次`,
        }
      },
    },
  }

  // 部门员工统计配置
  const departmentStatsConfig = {
    data: data.departmentStats,
    xField: 'department',
    yField: 'employees',
    height: 280,
    columnStyle: {
      fill: '#1890ff',
      fillOpacity: 0.8,
    },
    label: {
      position: 'middle' as const,
      style: {
        fill: '#FFFFFF',
        opacity: 0.8,
      },
    },
    tooltip: {
      formatter: (datum: any) => {
        return [
          { name: '员工数量', value: `${datum.employees} 人` },
          { name: '活跃率', value: `${datum.activeRate}%` },
        ]
      },
    },
  }

  // 通行时段分析配置
  const accessPatternConfig = {
    data: data.accessPattern,
    xField: 'hour',
    yField: 'count',
    height: 280,
    smooth: true,
    areaStyle: {
      fill: 'l(270) 0:#ffffff 0.5:#7ec2f3 1:#1890ff',
      fillOpacity: 0.6,
    },
    line: {
      color: '#1890ff',
    },
    point: {
      size: 3,
      shape: 'circle',
      style: {
        fill: '#1890ff',
        stroke: '#ffffff',
        lineWidth: 2,
      },
    },
    tooltip: {
      formatter: (datum: any) => {
        return {
          name: '通行人次',
          value: `${datum.count} 人次`,
        }
      },
    },
  }

  // 月度对比配置
  const monthlyComparisonConfig = {
    data: data.monthlyComparison,
    xField: 'month',
    yField: ['visitors', 'employees'],
    height: 300,
    geometryOptions: [
      {
        geometry: 'column',
        color: '#5B8FF9',
        label: {
          position: 'middle' as const,
        },
      },
      {
        geometry: 'line',
        color: '#5AD8A6',
        lineStyle: {
          lineWidth: 3,
        },
        point: {
          size: 4,
        },
      },
    ],
    legend: {
      position: 'top' as const,
    },
    tooltip: {
      formatter: (datum: any) => {
        const { name, value } = datum
        return {
          name: name === 'visitors' ? '访客数量' : '员工数量',
          value: `${value} 人`,
        }
      },
    },
  }

  // 访客类型分布配置
  const visitorTypeConfig = {
    data: data.visitorTypeDistribution,
    angleField: 'value',
    colorField: 'type',
    radius: 0.8,
    height: 280,
    label: {
      type: 'outer' as const,
      content: '{name} {percentage}%',
    },
    interactions: [{ type: 'element-active' }],
    legend: {
      position: 'bottom' as const,
    },
  }

  // 计算趋势指标
  const getTrendIndicator = (current: number, previous: number) => {
    if (previous === 0) return { icon: <MinusOutlined />, color: '#666', text: '无数据' }
    
    const change = ((current - previous) / previous) * 100
    if (change > 0) {
      return { 
        icon: <RiseOutlined />, 
        color: '#52c41a', 
        text: `+${change.toFixed(1)}%` 
      }
    } else if (change < 0) {
      return { 
        icon: <FallOutlined />, 
        color: '#ff4d4f', 
        text: `${change.toFixed(1)}%` 
      }
    } else {
      return { icon: <MinusOutlined />, color: '#666', text: '0%' }
    }
  }

  return (
    <div>
      <Row gutter={[16, 16]}>
        {/* 访客趋势分析 */}
        <Col xs={24} lg={16}>
          <Card 
            title="访客趋势分析" 
            loading={loading}
            extra={
              <Space>
                <Tag color="blue">申请</Tag>
                <Tag color="green">通过</Tag>
                <Tag color="orange">拒绝</Tag>
              </Space>
            }
          >
            <Line {...visitorTrendConfig} />
          </Card>
        </Col>

        {/* 访客类型分布 */}
        <Col xs={24} lg={8}>
          <Card title="访客类型分布" loading={loading}>
            <Pie {...visitorTypeConfig} />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        {/* 部门员工统计 */}
        <Col xs={24} lg={12}>
          <Card title="部门员工统计" loading={loading}>
            <Column {...departmentStatsConfig} />
            <div style={{ marginTop: 16, fontSize: 12, color: '#666' }}>
              <Text type="secondary">
                * 活跃率 = 本月有通行记录的员工比例
              </Text>
            </div>
          </Card>
        </Col>

        {/* 通行时段分析 */}
        <Col xs={24} lg={12}>
          <Card title="通行时段分析" loading={loading}>
            <Area {...accessPatternConfig} />
            <div style={{ marginTop: 16 }}>
              <Space>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  高峰时段：9:00-10:00, 18:00-19:00
                </Text>
              </Space>
            </div>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        {/* 月度数据对比 */}
        <Col xs={24}>
          <Card 
            title="月度数据对比" 
            loading={loading}
            extra={
              <Space>
                <div>
                  <Text type="secondary">访客环比：</Text>
                  {(() => {
                    const trend = getTrendIndicator(120, 95)
                    return (
                      <Space size={4}>
                        <span style={{ color: trend.color }}>{trend.icon}</span>
                        <Text style={{ color: trend.color }}>{trend.text}</Text>
                      </Space>
                    )
                  })()}
                </div>
                <div>
                  <Text type="secondary">员工环比：</Text>
                  {(() => {
                    const trend = getTrendIndicator(45, 42)
                    return (
                      <Space size={4}>
                        <span style={{ color: trend.color }}>{trend.icon}</span>
                        <Text style={{ color: trend.color }}>{trend.text}</Text>
                      </Space>
                    )
                  })()}
                </div>
              </Space>
            }
          >
            <Line {...monthlyComparisonConfig} />
          </Card>
        </Col>
      </Row>
    </div>
  )
}

export default AdvancedCharts