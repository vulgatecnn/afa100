import { api } from './api'

export interface Project {
  id: number
  code: string
  name: string
  description: string
  status: 'active' | 'inactive'
  createdAt: string
  updatedAt: string
}

export interface Venue {
  id: number
  projectId: number
  code: string
  name: string
  description: string
  status: 'active' | 'inactive'
  createdAt: string
  updatedAt: string
}

export interface Floor {
  id: number
  venueId: number
  code: string
  name: string
  description: string
  status: 'active' | 'inactive'
  createdAt: string
  updatedAt: string
}

export interface SpaceTreeNode {
  key: string
  title: string
  type: 'project' | 'venue' | 'floor'
  id: number
  status: 'active' | 'inactive'
  children?: SpaceTreeNode[]
}

export interface CreateProjectData {
  code: string
  name: string
  description: string
}

export interface CreateVenueData {
  projectId: number
  code: string
  name: string
  description: string
}

export interface CreateFloorData {
  venueId: number
  code: string
  name: string
  description: string
}

class SpaceService {
  /**
   * 获取空间树形结构
   */
  async getSpaceTree(): Promise<SpaceTreeNode[]> {
    const response = await api.get('/tenant/spaces/tree')
    return response.data
  }

  /**
   * 获取所有项目
   */
  async getProjects(): Promise<Project[]> {
    const response = await api.get('/tenant/spaces/projects')
    return response.data
  }

  /**
   * 获取项目下的场地
   */
  async getVenues(projectId: number): Promise<Venue[]> {
    const response = await api.get(`/tenant/spaces/projects/${projectId}/venues`)
    return response.data
  }

  /**
   * 获取场地下的楼层
   */
  async getFloors(venueId: number): Promise<Floor[]> {
    const response = await api.get(`/tenant/spaces/venues/${venueId}/floors`)
    return response.data
  }

  /**
   * 创建项目
   */
  async createProject(data: CreateProjectData): Promise<Project> {
    const response = await api.post('/tenant/spaces/projects', data)
    return response.data
  }

  /**
   * 创建场地
   */
  async createVenue(data: CreateVenueData): Promise<Venue> {
    const response = await api.post('/tenant/spaces/venues', data)
    return response.data
  }

  /**
   * 创建楼层
   */
  async createFloor(data: CreateFloorData): Promise<Floor> {
    const response = await api.post('/tenant/spaces/floors', data)
    return response.data
  }

  /**
   * 更新项目
   */
  async updateProject(id: number, data: Partial<CreateProjectData>): Promise<Project> {
    const response = await api.put(`/tenant/spaces/projects/${id}`, data)
    return response.data
  }

  /**
   * 更新场地
   */
  async updateVenue(id: number, data: Partial<CreateVenueData>): Promise<Venue> {
    const response = await api.put(`/tenant/spaces/venues/${id}`, data)
    return response.data
  }

  /**
   * 更新楼层
   */
  async updateFloor(id: number, data: Partial<CreateFloorData>): Promise<Floor> {
    const response = await api.put(`/tenant/spaces/floors/${id}`, data)
    return response.data
  }

  /**
   * 删除项目
   */
  async deleteProject(id: number): Promise<void> {
    await api.delete(`/tenant/spaces/projects/${id}`)
  }

  /**
   * 删除场地
   */
  async deleteVenue(id: number): Promise<void> {
    await api.delete(`/tenant/spaces/venues/${id}`)
  }

  /**
   * 删除楼层
   */
  async deleteFloor(id: number): Promise<void> {
    await api.delete(`/tenant/spaces/floors/${id}`)
  }

  /**
   * 切换空间状态
   */
  async toggleSpaceStatus(type: 'project' | 'venue' | 'floor', id: number, status: 'active' | 'inactive'): Promise<void> {
    await api.patch(`/tenant/spaces/${type}s/${id}/status`, { status })
  }
}

export const spaceService = new SpaceService()