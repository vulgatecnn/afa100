import React, { useState, useEffect } from 'react'
import { 
  Card, 
  Typography, 
  Tree, 
  Button, 
  Space, 
  Modal, 
  Form, 
  Input, 
  Select,
  message,
  Popconfirm,
  Tag,
  Dropdown
} from 'antd'
import { 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined,
  MoreOutlined,
  FolderOutlined,
  HomeOutlined,
  BuildOutlined
} from '@ant-design/icons'
import { spaceService, type SpaceTreeNode, type Project, type Venue, type Floor } from '../../services/spaceService'
import type { DataNode, TreeProps } from 'antd/es/tree'
import type { MenuProps } from 'antd'

const { Title } = Typography
const { TextArea } = Input
const { Option } = Select

interface SpaceFormData {
  code: string
  name: string
  description: string
  parentId?: number
  parentType?: 'project' | 'venue'
}

const SpaceManagement: React.FC = () => {
  const [treeData, setTreeData] = useState<DataNode[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedKeys, setSelectedKeys] = useState<string[]>([])
  const [expandedKeys, setExpandedKeys] = useState<string[]>([])
  
  // 表单相关状态
  const [modalVisible, setModalVisible] = useState(false)
  const [modalType, setModalType] = useState<'project' | 'venue' | 'floor'>('project')
  const [editingItem, setEditingItem] = useState<any>(null)
  const [form] = Form.useForm()

  // 加载空间树
  useEffect(() => {
    loadSpaceTree()
  }, [])

  const loadSpaceTree = async () => {
    try {
      setLoading(true)
      const spaceTree = await spaceService.getSpaceTree()
      const treeNodes = convertToTreeData(spaceTree)
      setTreeData(treeNodes)
      
      // 默认展开所有节点
      const allKeys = getAllKeys(spaceTree)
      setExpandedKeys(allKeys)
    } catch (error) {
      message.error('加载空间数据失败')
    } finally {
      setLoading(false)
    }
  }

  // 获取所有节点的key
  const getAllKeys = (nodes: SpaceTreeNode[]): string[] => {
    const keys: string[] = []
    const traverse = (nodeList: SpaceTreeNode[]) => {
      nodeList.forEach(node => {
        keys.push(node.key)
        if (node.children) {
          traverse(node.children)
        }
      })
    }
    traverse(nodes)
    return keys
  }

  // 转换为Tree组件数据格式
  const convertToTreeData = (nodes: SpaceTreeNode[]): DataNode[] => {
    return nodes.map(node => {
      const icon = node.type === 'project' ? <FolderOutlined /> : 
                   node.type === 'venue' ? <HomeOutlined /> : <BuildOutlined />
      
      return {
        key: node.key,
        title: (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Space>
              {icon}
              <span>{node.title}</span>
              <Tag color={node.status === 'active' ? 'green' : 'red'} size="small">
                {node.status === 'active' ? '启用' : '停用'}
              </Tag>
            </Space>
            <Dropdown
              menu={{ items: getContextMenuItems(node) }}
              trigger={['click']}
              onClick={(e) => e.stopPropagation()}
            >
              <Button 
                type="text" 
                size="small" 
                icon={<MoreOutlined />}
                onClick={(e) => e.stopPropagation()}
              />
            </Dropdown>
          </div>
        ),
        children: node.children ? convertToTreeData(node.children) : undefined,
        isLeaf: !node.children || node.children.length === 0
      }
    })
  }

  // 获取右键菜单项
  const getContextMenuItems = (node: SpaceTreeNode): MenuProps['items'] => {
    const items: MenuProps['items'] = [
      {
        key: 'edit',
        label: '编辑',
        icon: <EditOutlined />,
        onClick: () => handleEdit(node)
      }
    ]

    // 根据节点类型添加创建子项菜单
    if (node.type === 'project') {
      items.unshift({
        key: 'add-venue',
        label: '添加场地',
        icon: <PlusOutlined />,
        onClick: () => handleAdd('venue', node)
      })
    } else if (node.type === 'venue') {
      items.unshift({
        key: 'add-floor',
        label: '添加楼层',
        icon: <PlusOutlined />,
        onClick: () => handleAdd('floor', node)
      })
    }

    // 添加状态切换菜单
    items.push({
      key: 'toggle-status',
      label: node.status === 'active' ? '停用' : '启用',
      onClick: () => handleToggleStatus(node)
    })

    // 添加删除菜单
    items.push({
      type: 'divider'
    })
    items.push({
      key: 'delete',
      label: '删除',
      icon: <DeleteOutlined />,
      danger: true,
      onClick: () => handleDelete(node)
    })

    return items
  }

  // 处理添加操作
  const handleAdd = (type: 'project' | 'venue' | 'floor', parentNode?: SpaceTreeNode) => {
    setModalType(type)
    setEditingItem(null)
    form.resetFields()
    
    if (parentNode) {
      form.setFieldsValue({
        parentId: parentNode.id,
        parentType: parentNode.type
      })
    }
    
    setModalVisible(true)
  }

  // 处理编辑操作
  const handleEdit = (node: SpaceTreeNode) => {
    setModalType(node.type)
    setEditingItem(node)
    form.setFieldsValue({
      code: node.key.split('_')[1], // 从key中提取code
      name: node.title,
      description: ''
    })
    setModalVisible(true)
  }

  // 处理删除操作
  const handleDelete = (node: SpaceTreeNode) => {
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除${node.title}吗？删除后将无法恢复。`,
      okText: '确定',
      cancelText: '取消',
      onOk: async () => {
        try {
          const { type, id } = node
          if (type === 'project') {
            await spaceService.deleteProject(id)
          } else if (type === 'venue') {
            await spaceService.deleteVenue(id)
          } else {
            await spaceService.deleteFloor(id)
          }
          message.success('删除成功')
          loadSpaceTree()
        } catch (error) {
          message.error('删除失败')
        }
      }
    })
  }

  // 处理状态切换
  const handleToggleStatus = async (node: SpaceTreeNode) => {
    try {
      const newStatus = node.status === 'active' ? 'inactive' : 'active'
      await spaceService.toggleSpaceStatus(node.type, node.id, newStatus)
      message.success(`${newStatus === 'active' ? '启用' : '停用'}成功`)
      loadSpaceTree()
    } catch (error) {
      message.error('操作失败')
    }
  }

  // 提交表单
  const handleSubmit = async (values: SpaceFormData) => {
    try {
      if (editingItem) {
        // 编辑模式
        const { type, id } = editingItem
        if (type === 'project') {
          await spaceService.updateProject(id, values)
        } else if (type === 'venue') {
          await spaceService.updateVenue(id, values)
        } else {
          await spaceService.updateFloor(id, values)
        }
        message.success('更新成功')
      } else {
        // 新增模式
        if (modalType === 'project') {
          await spaceService.createProject(values)
        } else if (modalType === 'venue') {
          await spaceService.createVenue({
            ...values,
            projectId: values.parentId!
          })
        } else {
          await spaceService.createFloor({
            ...values,
            venueId: values.parentId!
          })
        }
        message.success('创建成功')
      }
      
      setModalVisible(false)
      loadSpaceTree()
    } catch (error) {
      message.error(editingItem ? '更新失败' : '创建失败')
    }
  }

  const getModalTitle = () => {
    const action = editingItem ? '编辑' : '新增'
    const typeMap = {
      project: '项目',
      venue: '场地',
      floor: '楼层'
    }
    return `${action}${typeMap[modalType]}`
  }

  return (
    <div>
      <Card>
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Title level={4} style={{ margin: 0 }}>空间管理</Title>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => handleAdd('project')}
          >
            新增项目
          </Button>
        </div>

        <div style={{ minHeight: 400 }}>
          <Tree
            treeData={treeData}
            loading={loading}
            selectedKeys={selectedKeys}
            expandedKeys={expandedKeys}
            onSelect={setSelectedKeys}
            onExpand={setExpandedKeys}
            showLine={{ showLeafIcon: false }}
            blockNode
          />
        </div>
      </Card>

      {/* 新增/编辑模态框 */}
      <Modal
        title={getModalTitle()}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={() => form.submit()}
        width={500}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Form.Item
            label="编码"
            name="code"
            rules={[
              { required: true, message: '请输入编码' },
              { pattern: /^[A-Z0-9_]+$/, message: '编码只能包含大写字母、数字和下划线' }
            ]}
          >
            <Input placeholder="请输入编码" style={{ textTransform: 'uppercase' }} />
          </Form.Item>

          <Form.Item
            label="名称"
            name="name"
            rules={[
              { required: true, message: '请输入名称' },
              { max: 100, message: '名称不能超过100个字符' }
            ]}
          >
            <Input placeholder="请输入名称" />
          </Form.Item>

          <Form.Item
            label="描述"
            name="description"
          >
            <TextArea rows={3} placeholder="请输入描述" />
          </Form.Item>

          {/* 隐藏字段 */}
          <Form.Item name="parentId" hidden>
            <Input />
          </Form.Item>
          <Form.Item name="parentType" hidden>
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default SpaceManagement