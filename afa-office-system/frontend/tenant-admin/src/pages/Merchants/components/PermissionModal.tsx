import React, { useState, useEffect } from 'react'
import { Modal, Tree, Button, message, Spin } from 'antd'
import { spaceService, type SpaceTreeNode } from '../../../services/spaceService'
import { merchantService, type Merchant } from '../../../services/merchantService'
import type { DataNode } from 'antd/es/tree'

interface PermissionModalProps {
  visible: boolean
  merchant: Merchant | null
  onCancel: () => void
  onSuccess: () => void
}

const PermissionModal: React.FC<PermissionModalProps> = ({
  visible,
  merchant,
  onCancel,
  onSuccess
}) => {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [treeData, setTreeData] = useState<DataNode[]>([])
  const [checkedKeys, setCheckedKeys] = useState<string[]>([])

  // 加载空间树和商户权限
  useEffect(() => {
    if (visible && merchant) {
      loadData()
    }
  }, [visible, merchant])

  const loadData = async () => {
    try {
      setLoading(true)
      
      // 加载空间树结构
      const spaceTree = await spaceService.getSpaceTree()
      
      // 转换为Tree组件需要的格式
      const treeNodes = convertToTreeData(spaceTree)
      setTreeData(treeNodes)
      
      // 设置已选中的权限
      if (merchant?.permissions) {
        setCheckedKeys(merchant.permissions)
      }
    } catch (error) {
      message.error('加载权限数据失败')
    } finally {
      setLoading(false)
    }
  }

  // 转换空间树数据格式
  const convertToTreeData = (nodes: SpaceTreeNode[]): DataNode[] => {
    return nodes.map(node => ({
      key: `${node.type}_${node.id}`,
      title: `${node.title} (${node.type === 'project' ? '项目' : node.type === 'venue' ? '场地' : '楼层'})`,
      children: node.children ? convertToTreeData(node.children) : [],
      disabled: node.status === 'inactive'
    }))
  }

  // 处理权限选择
  const handleCheck = (checkedKeysValue: any) => {
    setCheckedKeys(checkedKeysValue)
  }

  // 保存权限设置
  const handleSave = async () => {
    if (!merchant) return

    try {
      setSaving(true)
      await merchantService.assignPermissions(merchant.id, checkedKeys)
      message.success('权限设置成功')
      onSuccess()
    } catch (error) {
      message.error('权限设置失败')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      title={`设置商户权限 - ${merchant?.name}`}
      open={visible}
      onCancel={onCancel}
      width={600}
      footer={[
        <Button key="cancel" onClick={onCancel}>
          取消
        </Button>,
        <Button 
          key="save" 
          type="primary" 
          loading={saving}
          onClick={handleSave}
        >
          保存
        </Button>
      ]}
    >
      <div style={{ marginBottom: 16 }}>
        <p>请选择该商户可以访问的空间权限：</p>
      </div>
      
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <Spin size="large" />
        </div>
      ) : (
        <Tree
          checkable
          checkedKeys={checkedKeys}
          onCheck={handleCheck}
          treeData={treeData}
          height={400}
          style={{ border: '1px solid #d9d9d9', borderRadius: 6, padding: 8 }}
        />
      )}
      
      <div style={{ marginTop: 16, fontSize: 12, color: '#666' }}>
        <p>说明：</p>
        <ul style={{ paddingLeft: 20, margin: 0 }}>
          <li>选中项目将自动包含其下所有场地和楼层</li>
          <li>选中场地将自动包含其下所有楼层</li>
          <li>灰色项目表示已停用，无法选择</li>
        </ul>
      </div>
    </Modal>
  )
}

export default PermissionModal