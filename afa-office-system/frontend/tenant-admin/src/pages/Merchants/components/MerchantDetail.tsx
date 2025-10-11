import React from 'react'
import { Descriptions, Tag, Space, Typography } from 'antd'
import { type Merchant } from '../../../services/merchantService'

const { Text } = Typography

interface MerchantDetailProps {
  merchant: Merchant
}

const MerchantDetail: React.FC<MerchantDetailProps> = ({ merchant }) => {
  return (
    <div>
      <Descriptions column={1} bordered>
        <Descriptions.Item label="商户名称">
          {merchant.name}
        </Descriptions.Item>
        
        <Descriptions.Item label="商户编码">
          <Text code>{merchant.code}</Text>
        </Descriptions.Item>
        
        <Descriptions.Item label="状态">
          <Tag color={merchant.status === 'active' ? 'green' : 'red'}>
            {merchant.status === 'active' ? '启用' : '停用'}
          </Tag>
        </Descriptions.Item>
        
        <Descriptions.Item label="联系人">
          {merchant.contact}
        </Descriptions.Item>
        
        <Descriptions.Item label="联系电话">
          {merchant.phone}
        </Descriptions.Item>
        
        <Descriptions.Item label="邮箱地址">
          {merchant.email}
        </Descriptions.Item>
        
        <Descriptions.Item label="地址">
          {merchant.address}
        </Descriptions.Item>
        
        <Descriptions.Item label="权限数量">
          <Space>
            <span>{merchant.permissions?.length || 0} 个权限</span>
            {merchant.permissions && merchant.permissions.length > 0 && (
              <Text type="secondary">
                (点击权限设置查看详情)
              </Text>
            )}
          </Space>
        </Descriptions.Item>
        
        <Descriptions.Item label="创建时间">
          {new Date(merchant.createdAt).toLocaleString()}
        </Descriptions.Item>
        
        <Descriptions.Item label="更新时间">
          {new Date(merchant.updatedAt).toLocaleString()}
        </Descriptions.Item>
      </Descriptions>
      
      {merchant.permissions && merchant.permissions.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <Typography.Title level={5}>权限列表</Typography.Title>
          <div style={{ maxHeight: 200, overflow: 'auto' }}>
            <Space wrap>
              {merchant.permissions.map((permission, index) => (
                <Tag key={index} color="blue">
                  {permission}
                </Tag>
              ))}
            </Space>
          </div>
        </div>
      )}
    </div>
  )
}

export default MerchantDetail