/**
 * 网络状态监控器
 * 监控网络连接状态、速度和质量
 */

export interface NetworkInfo {
  isOnline: boolean
  connectionType?: string
  effectiveType?: string
  downlink?: number
  rtt?: number
  saveData?: boolean
}

export interface NetworkQuality {
  speed: 'fast' | 'medium' | 'slow' | 'offline'
  latency: 'low' | 'medium' | 'high'
  stability: 'stable' | 'unstable'
  score: number // 0-100
}

export interface NetworkEvent {
  type: 'online' | 'offline' | 'slow' | 'fast' | 'unstable'
  timestamp: number
  networkInfo: NetworkInfo
  quality: NetworkQuality
}

export class NetworkMonitor {
  private networkInfo: NetworkInfo = { isOnline: navigator.onLine }
  private quality: NetworkQuality = { speed: 'medium', latency: 'medium', stability: 'stable', score: 50 }
  private listeners: Array<(event: NetworkEvent) => void> = []
  private pingInterval?: number
  private qualityCheckInterval?: number
  private pingHistory: number[] = []
  private readonly maxPingHistory = 10

  constructor() {
    this.setupEventListeners()
    this.startQualityMonitoring()
    this.updateNetworkInfo()
  }

  /**
   * 获取当前网络信息
   */
  getNetworkInfo(): NetworkInfo {
    return { ...this.networkInfo }
  }

  /**
   * 获取网络质量
   */
  getNetworkQuality(): NetworkQuality {
    return { ...this.quality }
  }

  /**
   * 添加网络事件监听器
   */
  addEventListener(listener: (event: NetworkEvent) => void): () => void {
    this.listeners.push(listener)
    
    return () => {
      const index = this.listeners.indexOf(listener)
      if (index > -1) {
        this.listeners.splice(index, 1)
      }
    }
  }

  /**
   * 开始监控
   */
  startMonitoring(): void {
    this.startPingMonitoring()
    this.startQualityMonitoring()
  }

  /**
   * 停止监控
   */
  stopMonitoring(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval)
      this.pingInterval = undefined
    }
    
    if (this.qualityCheckInterval) {
      clearInterval(this.qualityCheckInterval)
      this.qualityCheckInterval = undefined
    }
  }

  /**
   * 手动检查网络连接
   */
  async checkConnection(): Promise<boolean> {
    try {
      const startTime = Date.now()
      const response = await fetch('/api/v1/auth/health', {
        method: 'HEAD',
        cache: 'no-cache',
        signal: AbortSignal.timeout(5000)
      })
      
      const latency = Date.now() - startTime
      this.updatePingHistory(latency)
      
      const isOnline = response.ok
      this.updateOnlineStatus(isOnline)
      
      return isOnline
    } catch (error) {
      this.updateOnlineStatus(false)
      return false
    }
  }

  /**
   * 测试网络速度
   */
  async testSpeed(): Promise<{ downloadSpeed: number; latency: number }> {
    try {
      const startTime = Date.now()
      
      // 下载一个小文件来测试速度
      const response = await fetch('/api/v1', {
        cache: 'no-cache',
        signal: AbortSignal.timeout(10000)
      })
      
      const endTime = Date.now()
      const latency = endTime - startTime
      
      // 估算下载速度（这里使用响应大小和时间）
      const contentLength = response.headers.get('content-length')
      const size = contentLength ? parseInt(contentLength) : 1024 // 默认 1KB
      const downloadSpeed = (size * 8) / (latency / 1000) // bps
      
      return { downloadSpeed, latency }
    } catch (error) {
      return { downloadSpeed: 0, latency: Infinity }
    }
  }

  /**
   * 设置事件监听器
   */
  private setupEventListeners(): void {
    if (typeof window === 'undefined') return

    // 在线/离线事件
    window.addEventListener('online', () => {
      this.updateOnlineStatus(true)
    })

    window.addEventListener('offline', () => {
      this.updateOnlineStatus(false)
    })

    // 网络连接变化事件
    if ('connection' in navigator) {
      const connection = (navigator as any).connection
      if (connection) {
        connection.addEventListener('change', () => {
          this.updateNetworkInfo()
        })
      }
    }

    // 页面可见性变化时检查网络
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        this.checkConnection()
      }
    })
  }

  /**
   * 开始 Ping 监控
   */
  private startPingMonitoring(): void {
    if (this.pingInterval) return

    this.pingInterval = window.setInterval(async () => {
      if (this.networkInfo.isOnline) {
        await this.checkConnection()
      }
    }, 30000) // 每30秒检查一次
  }

  /**
   * 开始质量监控
   */
  private startQualityMonitoring(): void {
    if (this.qualityCheckInterval) return

    this.qualityCheckInterval = window.setInterval(async () => {
      if (this.networkInfo.isOnline) {
        await this.updateNetworkQuality()
      }
    }, 60000) // 每分钟检查一次质量
  }

  /**
   * 更新网络信息
   */
  private updateNetworkInfo(): void {
    const newInfo: NetworkInfo = {
      isOnline: navigator.onLine
    }

    // 获取连接信息（如果支持）
    if ('connection' in navigator) {
      const connection = (navigator as any).connection
      if (connection) {
        newInfo.connectionType = connection.type
        newInfo.effectiveType = connection.effectiveType
        newInfo.downlink = connection.downlink
        newInfo.rtt = connection.rtt
        newInfo.saveData = connection.saveData
      }
    }

    const oldOnlineStatus = this.networkInfo.isOnline
    this.networkInfo = newInfo

    // 如果在线状态发生变化，触发事件
    if (oldOnlineStatus !== newInfo.isOnline) {
      this.emitEvent({
        type: newInfo.isOnline ? 'online' : 'offline',
        timestamp: Date.now(),
        networkInfo: this.networkInfo,
        quality: this.quality
      })
    }
  }

  /**
   * 更新在线状态
   */
  private updateOnlineStatus(isOnline: boolean): void {
    if (this.networkInfo.isOnline !== isOnline) {
      this.networkInfo.isOnline = isOnline
      
      this.emitEvent({
        type: isOnline ? 'online' : 'offline',
        timestamp: Date.now(),
        networkInfo: this.networkInfo,
        quality: this.quality
      })
    }
  }

  /**
   * 更新 Ping 历史
   */
  private updatePingHistory(latency: number): void {
    this.pingHistory.push(latency)
    
    if (this.pingHistory.length > this.maxPingHistory) {
      this.pingHistory.shift()
    }
  }

  /**
   * 更新网络质量
   */
  private async updateNetworkQuality(): Promise<void> {
    const { downloadSpeed, latency } = await this.testSpeed()
    
    // 计算平均延迟
    const avgLatency = this.pingHistory.length > 0 
      ? this.pingHistory.reduce((sum, ping) => sum + ping, 0) / this.pingHistory.length
      : latency

    // 计算延迟稳定性
    const latencyVariance = this.calculateVariance(this.pingHistory)
    
    // 评估速度
    let speed: NetworkQuality['speed']
    if (!this.networkInfo.isOnline) {
      speed = 'offline'
    } else if (downloadSpeed > 5000000) { // > 5 Mbps
      speed = 'fast'
    } else if (downloadSpeed > 1000000) { // > 1 Mbps
      speed = 'medium'
    } else {
      speed = 'slow'
    }

    // 评估延迟
    let latencyLevel: NetworkQuality['latency']
    if (avgLatency < 100) {
      latencyLevel = 'low'
    } else if (avgLatency < 300) {
      latencyLevel = 'medium'
    } else {
      latencyLevel = 'high'
    }

    // 评估稳定性
    const stability: NetworkQuality['stability'] = latencyVariance < 50 ? 'stable' : 'unstable'

    // 计算综合评分
    let score = 0
    if (speed === 'fast') score += 40
    else if (speed === 'medium') score += 25
    else if (speed === 'slow') score += 10

    if (latencyLevel === 'low') score += 30
    else if (latencyLevel === 'medium') score += 20
    else score += 10

    if (stability === 'stable') score += 30
    else score += 15

    const oldQuality = { ...this.quality }
    this.quality = { speed, latency: latencyLevel, stability, score }

    // 检查是否需要触发质量变化事件
    if (oldQuality.speed !== speed) {
      this.emitEvent({
        type: speed === 'slow' ? 'slow' : 'fast',
        timestamp: Date.now(),
        networkInfo: this.networkInfo,
        quality: this.quality
      })
    }

    if (oldQuality.stability !== stability && stability === 'unstable') {
      this.emitEvent({
        type: 'unstable',
        timestamp: Date.now(),
        networkInfo: this.networkInfo,
        quality: this.quality
      })
    }
  }

  /**
   * 计算方差
   */
  private calculateVariance(values: number[]): number {
    if (values.length === 0) return 0
    
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length
    
    return Math.sqrt(variance)
  }

  /**
   * 触发事件
   */
  private emitEvent(event: NetworkEvent): void {
    this.listeners.forEach(listener => {
      try {
        listener(event)
      } catch (error) {
        console.error('Error in network event listener:', error)
      }
    })
  }

  /**
   * 获取网络建议
   */
  getNetworkSuggestions(): string[] {
    const suggestions: string[] = []

    if (!this.networkInfo.isOnline) {
      suggestions.push('检查网络连接')
      suggestions.push('确认 WiFi 或移动数据已开启')
    } else {
      if (this.quality.speed === 'slow') {
        suggestions.push('网络速度较慢，建议切换到更快的网络')
        suggestions.push('关闭其他占用网络的应用')
      }

      if (this.quality.latency === 'high') {
        suggestions.push('网络延迟较高，可能影响实时功能')
        suggestions.push('尝试靠近路由器或切换网络')
      }

      if (this.quality.stability === 'unstable') {
        suggestions.push('网络连接不稳定')
        suggestions.push('检查网络设备或联系网络服务商')
      }
    }

    return suggestions
  }

  /**
   * 销毁监控器
   */
  destroy(): void {
    this.stopMonitoring()
    this.listeners = []
  }
}