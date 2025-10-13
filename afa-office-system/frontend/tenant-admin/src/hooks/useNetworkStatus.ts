/**
 * 网络状态 Hook
 * 监控网络连接状态和质量
 */

import { useState, useEffect, useCallback } from 'react'
import { errorHandler, NetworkStatus } from '../utils/errorHandler'

interface NetworkStatusHook {
  isOnline: boolean
  networkStatus: NetworkStatus
  isSlowConnection: boolean
  checkConnection: () => Promise<boolean>
  getSuggestions: () => string[]
}

export function useNetworkStatus(): NetworkStatusHook {
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>(errorHandler.getNetworkStatus())

  // 监听网络状态变化
  useEffect(() => {
    const updateNetworkStatus = () => {
      setNetworkStatus(errorHandler.getNetworkStatus())
    }

    window.addEventListener('online', updateNetworkStatus)
    window.addEventListener('offline', updateNetworkStatus)

    return () => {
      window.removeEventListener('online', updateNetworkStatus)
      window.removeEventListener('offline', updateNetworkStatus)
    }
  }, [])

  // 手动检查连接
  const checkConnection = useCallback(async () => {
    try {
      const response = await fetch('/api/v1/health', {
        method: 'HEAD',
        cache: 'no-cache'
      })
      return response.ok
    } catch (error) {
      return false
    }
  }, [])

  // 获取网络建议
  const getSuggestions = useCallback(() => {
    const suggestions: string[] = []
    
    if (!networkStatus.isOnline) {
      suggestions.push('检查网络连接')
      suggestions.push('确认 WiFi 或移动数据已开启')
    } else if (networkStatus.isSlowConnection) {
      suggestions.push('网络速度较慢，建议切换到更快的网络')
      suggestions.push('关闭其他占用网络的应用')
    }
    
    return suggestions
  }, [networkStatus])

  return {
    isOnline: networkStatus.isOnline,
    networkStatus,
    isSlowConnection: networkStatus.isSlowConnection,
    checkConnection,
    getSuggestions
  }
}