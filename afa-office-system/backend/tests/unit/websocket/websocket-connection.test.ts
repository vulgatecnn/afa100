import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { EventEmitter } from 'events';

// WebSocket连接管理器
class WebSocketConnectionManager extends EventEmitter {
  private connections: Map<string, any> = new Map();
  private connectionPool: any[] = [];
  private maxConnections: number = 100;
  private connectionTimeout: number = 30000;
  private heartbeatInterval: number = 30000;
  private reconnectAttempts: Map<string, number> = new Map();
  private maxReconnectAttempts: number = 5;

  constructor(options?: {
    maxConnections?: number;
    connectionTimeout?: number;
    heartbeatInterval?: number;
    maxReconnectAttempts?: number;
  }) {
    super();
    
    if (options) {
      this.maxConnections = options.maxConnections || this.maxConnections;
      this.connectionTimeout = options.connectionTimeout || this.connectionTimeout;
      this.heartbeatInterval = options.heartbeatInterval || this.heartbeatInterval;
      this.maxReconnectAttempts = options.maxReconnectAttempts || this.maxReconnectAttempts;
    }
  }

  /**
   * 创建新连接
   */
  createConnection(connectionId: string, url: string): Promise<any> {
    return new Promise((resolve, reject) => {
      if (this.connections.has(connectionId)) {
        reject(new Error(`连接 ${connectionId} 已存在`));
        return;
      }

      if (this.connections.size >= this.maxConnections) {
        reject(new Error('连接数已达上限'));
        return;
      }

      const connection = {
        id: connectionId,
        url,
        status: 'connecting',
        createdAt: new Date(),
        lastActivity: new Date(),
        heartbeatTimer: null,
        timeoutTimer: null,
        reconnectCount: 0,
      };

      // 设置连接超时
      connection.timeoutTimer = setTimeout(() => {
        this.handleConnectionTimeout(connectionId);
      }, this.connectionTimeout);

      // 模拟连接过程
      setTimeout(() => {
        if (this.connections.has(connectionId)) {
          connection.status = 'connected';
          this.startHeartbeat(connectionId);
          this.emit('connectionEstablished', connectionId);
          resolve(connection);
        }
      }, 100);

      this.connections.set(connectionId, connection);
      this.emit('connectionCreated', connectionId);
    });
  }

  /**
   * 关闭连接
   */
  closeConnection(connectionId: string, reason?: string): boolean {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      return false;
    }

    // 清理定时器
    if (connection.heartbeatTimer) {
      clearInterval(connection.heartbeatTimer);
    }
    if (connection.timeoutTimer) {
      clearTimeout(connection.timeoutTimer);
    }

    connection.status = 'closed';
    connection.closedAt = new Date();
    connection.closeReason = reason;

    this.connections.delete(connectionId);
    this.reconnectAttempts.delete(connectionId);

    this.emit('connectionClosed', connectionId, reason);
    return true;
  }

  /**
   * 获取连接信息
   */
  getConnection(connectionId: string): any | null {
    return this.connections.get(connectionId) || null;
  }

  /**
   * 获取所有连接
   */
  getAllConnections(): any[] {
    return Array.from(this.connections.values());
  }

  /**
   * 获取连接统计
   */
  getConnectionStats(): {
    total: number;
    connected: number;
    connecting: number;
    disconnected: number;
    maxConnections: number;
  } {
    const connections = this.getAllConnections();
    
    return {
      total: connections.length,
      connected: connections.filter(c => c.status === 'connected').length,
      connecting: connections.filter(c => c.status === 'connecting').length,
      disconnected: connections.filter(c => c.status === 'disconnected').length,
      maxConnections: this.maxConnections,
    };
  }

  /**
   * 更新连接活动时间
   */
  updateActivity(connectionId: string): boolean {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      return false;
    }

    connection.lastActivity = new Date();
    return true;
  }

  /**
   * 检查连接健康状态
   */
  checkConnectionHealth(connectionId: string): {
    isHealthy: boolean;
    lastActivity: Date;
    timeSinceLastActivity: number;
  } {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      return {
        isHealthy: false,
        lastActivity: new Date(0),
        timeSinceLastActivity: Infinity,
      };
    }

    const now = new Date();
    const timeSinceLastActivity = now.getTime() - connection.lastActivity.getTime();
    const isHealthy = timeSinceLastActivity < this.heartbeatInterval * 2;

    return {
      isHealthy,
      lastActivity: connection.lastActivity,
      timeSinceLastActivity,
    };
  }

  /**
   * 清理不活跃的连接
   */
  cleanupInactiveConnections(): string[] {
    const cleanedConnections: string[] = [];
    const now = new Date();

    for (const [connectionId, connection] of this.connections) {
      const timeSinceLastActivity = now.getTime() - connection.lastActivity.getTime();
      
      if (timeSinceLastActivity > this.heartbeatInterval * 3) {
        this.closeConnection(connectionId, 'inactive');
        cleanedConnections.push(connectionId);
      }
    }

    if (cleanedConnections.length > 0) {
      this.emit('inactiveConnectionsCleaned', cleanedConnections);
    }

    return cleanedConnections;
  }

  /**
   * 尝试重连
   */
  attemptReconnect(connectionId: string, url: string): Promise<boolean> {
    return new Promise((resolve) => {
      const currentAttempts = this.reconnectAttempts.get(connectionId) || 0;
      
      if (currentAttempts >= this.maxReconnectAttempts) {
        this.emit('reconnectFailed', connectionId, 'max_attempts_reached');
        resolve(false);
        return;
      }

      this.reconnectAttempts.set(connectionId, currentAttempts + 1);
      
      // 指数退避延迟
      const delay = Math.min(1000 * Math.pow(2, currentAttempts), 30000);
      
      setTimeout(async () => {
        try {
          // 先关闭旧连接
          this.closeConnection(connectionId, 'reconnecting');
          
          // 创建新连接
          await this.createConnection(connectionId, url);
          
          this.reconnectAttempts.delete(connectionId);
          this.emit('reconnectSuccess', connectionId);
          resolve(true);
        } catch (error) {
          this.emit('reconnectAttemptFailed', connectionId, error);
          
          // 继续尝试重连
          this.attemptReconnect(connectionId, url).then(resolve);
        }
      }, delay);
    });
  }

  /**
   * 广播消息到所有连接
   */
  broadcast(message: any, excludeConnections?: string[]): number {
    let sentCount = 0;
    const exclude = new Set(excludeConnections || []);

    for (const [connectionId, connection] of this.connections) {
      if (connection.status === 'connected' && !exclude.has(connectionId)) {
        try {
          this.sendMessage(connectionId, message);
          sentCount++;
        } catch (error) {
          console.error(`广播消息到连接 ${connectionId} 失败:`, error);
        }
      }
    }

    this.emit('messageBroadcast', message, sentCount);
    return sentCount;
  }

  /**
   * 发送消息到特定连接
   */
  sendMessage(connectionId: string, message: any): boolean {
    const connection = this.connections.get(connectionId);
    if (!connection || connection.status !== 'connected') {
      return false;
    }

    try {
      // 模拟消息发送
      this.updateActivity(connectionId);
      this.emit('messageSent', connectionId, message);
      return true;
    } catch (error) {
      this.emit('messageSendError', connectionId, error);
      return false;
    }
  }

  /**
   * 开始心跳检测
   */
  private startHeartbeat(connectionId: string): void {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      return;
    }

    connection.heartbeatTimer = setInterval(() => {
      if (!this.connections.has(connectionId)) {
        clearInterval(connection.heartbeatTimer);
        return;
      }

      const health = this.checkConnectionHealth(connectionId);
      if (!health.isHealthy) {
        this.emit('connectionUnhealthy', connectionId, health);
        this.closeConnection(connectionId, 'unhealthy');
      } else {
        // 发送心跳
        this.sendMessage(connectionId, { type: 'ping', timestamp: new Date().toISOString() });
      }
    }, this.heartbeatInterval);
  }

  /**
   * 处理连接超时
   */
  private handleConnectionTimeout(connectionId: string): void {
    const connection = this.connections.get(connectionId);
    if (connection && connection.status === 'connecting') {
      this.closeConnection(connectionId, 'timeout');
      this.emit('connectionTimeout', connectionId);
    }
  }

  /**
   * 销毁管理器
   */
  destroy(): void {
    // 关闭所有连接
    const connectionIds = Array.from(this.connections.keys());
    connectionIds.forEach(id => this.closeConnection(id, 'manager_destroyed'));

    // 清理所有监听器
    this.removeAllListeners();
  }
}

describe('WebSocket 连接管理单元测试', () => {
  let connectionManager: WebSocketConnectionManager;

  beforeEach(() => {
    connectionManager = new WebSocketConnectionManager({
      maxConnections: 10,
      connectionTimeout: 5000,
      heartbeatInterval: 1000,
      maxReconnectAttempts: 3,
    });
  });

  afterEach(() => {
    connectionManager.destroy();
  });

  describe('连接创建和管理', () => {
    it('应该成功创建新连接', async () => {
      const connectionId = 'test-connection-1';
      const url = 'ws://localhost:3000';

      const connection = await connectionManager.createConnection(connectionId, url);

      expect(connection).toBeDefined();
      expect(connection.id).toBe(connectionId);
      expect(connection.url).toBe(url);
      expect(connection.status).toBe('connected');
      expect(connection.createdAt).toBeInstanceOf(Date);
    });

    it('应该拒绝创建重复的连接', async () => {
      const connectionId = 'duplicate-connection';
      const url = 'ws://localhost:3000';

      await connectionManager.createConnection(connectionId, url);

      await expect(
        connectionManager.createConnection(connectionId, url)
      ).rejects.toThrow('连接 duplicate-connection 已存在');
    });

    it('应该限制最大连接数', async () => {
      const promises = [];
      
      // 创建超过最大连接数的连接
      for (let i = 0; i < 12; i++) {
        promises.push(
          connectionManager.createConnection(`connection-${i}`, 'ws://localhost:3000')
        );
      }

      const results = await Promise.allSettled(promises);
      
      // 前10个应该成功，后2个应该失败
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      expect(successful).toBe(10);
      expect(failed).toBe(2);
    });

    it('应该正确关闭连接', async () => {
      const connectionId = 'test-connection';
      await connectionManager.createConnection(connectionId, 'ws://localhost:3000');

      const closed = connectionManager.closeConnection(connectionId, 'user_request');

      expect(closed).toBe(true);
      expect(connectionManager.getConnection(connectionId)).toBeNull();
    });

    it('应该处理关闭不存在的连接', () => {
      const closed = connectionManager.closeConnection('nonexistent', 'test');
      expect(closed).toBe(false);
    });
  });

  describe('连接状态监控', () => {
    it('应该正确统计连接状态', async () => {
      // 创建几个连接
      await connectionManager.createConnection('conn1', 'ws://localhost:3000');
      await connectionManager.createConnection('conn2', 'ws://localhost:3000');
      await connectionManager.createConnection('conn3', 'ws://localhost:3000');

      const stats = connectionManager.getConnectionStats();

      expect(stats.total).toBe(3);
      expect(stats.connected).toBe(3);
      expect(stats.connecting).toBe(0);
      expect(stats.maxConnections).toBe(10);
    });

    it('应该更新连接活动时间', async () => {
      const connectionId = 'active-connection';
      await connectionManager.createConnection(connectionId, 'ws://localhost:3000');

      const beforeUpdate = connectionManager.getConnection(connectionId).lastActivity;
      
      // 等待一小段时间
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const updated = connectionManager.updateActivity(connectionId);
      const afterUpdate = connectionManager.getConnection(connectionId).lastActivity;

      expect(updated).toBe(true);
      expect(afterUpdate.getTime()).toBeGreaterThan(beforeUpdate.getTime());
    });

    it('应该检查连接健康状态', async () => {
      const connectionId = 'health-test';
      await connectionManager.createConnection(connectionId, 'ws://localhost:3000');

      const health = connectionManager.checkConnectionHealth(connectionId);

      expect(health.isHealthy).toBe(true);
      expect(health.lastActivity).toBeInstanceOf(Date);
      expect(health.timeSinceLastActivity).toBeLessThan(1000);
    });

    it('应该识别不健康的连接', async () => {
      const connectionId = 'unhealthy-connection';
      await connectionManager.createConnection(connectionId, 'ws://localhost:3000');

      const connection = connectionManager.getConnection(connectionId);
      // 模拟很久没有活动
      connection.lastActivity = new Date(Date.now() - 10000);

      const health = connectionManager.checkConnectionHealth(connectionId);

      expect(health.isHealthy).toBe(false);
      expect(health.timeSinceLastActivity).toBeGreaterThan(5000);
    });
  });

  describe('连接清理和维护', () => {
    it('应该清理不活跃的连接', async () => {
      // 创建几个连接
      await connectionManager.createConnection('active1', 'ws://localhost:3000');
      await connectionManager.createConnection('inactive1', 'ws://localhost:3000');
      await connectionManager.createConnection('inactive2', 'ws://localhost:3000');

      // 模拟一些连接不活跃
      const inactive1 = connectionManager.getConnection('inactive1');
      const inactive2 = connectionManager.getConnection('inactive2');
      
      inactive1.lastActivity = new Date(Date.now() - 10000);
      inactive2.lastActivity = new Date(Date.now() - 15000);

      const cleanedConnections = connectionManager.cleanupInactiveConnections();

      expect(cleanedConnections).toContain('inactive1');
      expect(cleanedConnections).toContain('inactive2');
      expect(cleanedConnections).not.toContain('active1');
      expect(connectionManager.getConnection('inactive1')).toBeNull();
      expect(connectionManager.getConnection('inactive2')).toBeNull();
      expect(connectionManager.getConnection('active1')).toBeDefined();
    });

    it('应该在没有不活跃连接时返回空数组', async () => {
      await connectionManager.createConnection('active1', 'ws://localhost:3000');
      await connectionManager.createConnection('active2', 'ws://localhost:3000');

      const cleanedConnections = connectionManager.cleanupInactiveConnections();

      expect(cleanedConnections).toHaveLength(0);
    });
  });

  describe('重连机制', () => {
    it('应该成功重连', async () => {
      const connectionId = 'reconnect-test';
      const url = 'ws://localhost:3000';

      // 创建初始连接
      await connectionManager.createConnection(connectionId, url);
      
      // 关闭连接
      connectionManager.closeConnection(connectionId, 'network_error');

      // 尝试重连
      const reconnected = await connectionManager.attemptReconnect(connectionId, url);

      expect(reconnected).toBe(true);
      expect(connectionManager.getConnection(connectionId)).toBeDefined();
      expect(connectionManager.getConnection(connectionId).status).toBe('connected');
    });

    it('应该在达到最大重连次数后停止', async () => {
      const connectionId = 'max-reconnect-test';
      const url = 'ws://localhost:3000';

      // 模拟连接创建失败
      const originalCreateConnection = connectionManager.createConnection.bind(connectionManager);
      connectionManager.createConnection = vi.fn().mockRejectedValue(new Error('Connection failed'));

      const reconnected = await connectionManager.attemptReconnect(connectionId, url);

      expect(reconnected).toBe(false);
    });

    it('应该使用指数退避延迟', async () => {
      const connectionId = 'backoff-test';
      const url = 'ws://localhost:3000';

      const reconnectAttemptTimes: number[] = [];
      
      connectionManager.on('reconnectAttemptFailed', () => {
        reconnectAttemptTimes.push(Date.now());
      });

      // 模拟连接创建失败
      connectionManager.createConnection = vi.fn().mockRejectedValue(new Error('Connection failed'));

      const startTime = Date.now();
      await connectionManager.attemptReconnect(connectionId, url);

      // 验证重连尝试之间的时间间隔递增
      if (reconnectAttemptTimes.length >= 2) {
        const firstInterval = reconnectAttemptTimes[1] - reconnectAttemptTimes[0];
        const secondInterval = reconnectAttemptTimes[2] - reconnectAttemptTimes[1];
        expect(secondInterval).toBeGreaterThan(firstInterval);
      }
    });
  });

  describe('消息发送和广播', () => {
    beforeEach(async () => {
      // 创建几个测试连接
      await connectionManager.createConnection('conn1', 'ws://localhost:3000');
      await connectionManager.createConnection('conn2', 'ws://localhost:3000');
      await connectionManager.createConnection('conn3', 'ws://localhost:3000');
    });

    it('应该成功发送消息到特定连接', () => {
      const message = { type: 'test', data: 'hello' };
      const sent = connectionManager.sendMessage('conn1', message);

      expect(sent).toBe(true);
    });

    it('应该拒绝发送消息到不存在的连接', () => {
      const message = { type: 'test', data: 'hello' };
      const sent = connectionManager.sendMessage('nonexistent', message);

      expect(sent).toBe(false);
    });

    it('应该广播消息到所有连接', () => {
      const message = { type: 'broadcast', data: 'hello everyone' };
      const sentCount = connectionManager.broadcast(message);

      expect(sentCount).toBe(3);
    });

    it('应该排除指定连接进行广播', () => {
      const message = { type: 'broadcast', data: 'hello some' };
      const sentCount = connectionManager.broadcast(message, ['conn2']);

      expect(sentCount).toBe(2);
    });

    it('应该在发送消息时更新活动时间', () => {
      const connection = connectionManager.getConnection('conn1');
      const beforeSend = connection.lastActivity;

      connectionManager.sendMessage('conn1', { type: 'test' });

      const afterSend = connectionManager.getConnection('conn1').lastActivity;
      expect(afterSend.getTime()).toBeGreaterThan(beforeSend.getTime());
    });
  });

  describe('事件处理', () => {
    it('应该触发连接创建事件', async () => {
      const createdHandler = vi.fn();
      const establishedHandler = vi.fn();

      connectionManager.on('connectionCreated', createdHandler);
      connectionManager.on('connectionEstablished', establishedHandler);

      await connectionManager.createConnection('event-test', 'ws://localhost:3000');

      expect(createdHandler).toHaveBeenCalledWith('event-test');
      expect(establishedHandler).toHaveBeenCalledWith('event-test');
    });

    it('应该触发连接关闭事件', async () => {
      const closedHandler = vi.fn();
      connectionManager.on('connectionClosed', closedHandler);

      await connectionManager.createConnection('close-test', 'ws://localhost:3000');
      connectionManager.closeConnection('close-test', 'user_request');

      expect(closedHandler).toHaveBeenCalledWith('close-test', 'user_request');
    });

    it('应该触发消息发送事件', async () => {
      const messageSentHandler = vi.fn();
      connectionManager.on('messageSent', messageSentHandler);

      await connectionManager.createConnection('message-test', 'ws://localhost:3000');
      
      const message = { type: 'test', data: 'hello' };
      connectionManager.sendMessage('message-test', message);

      expect(messageSentHandler).toHaveBeenCalledWith('message-test', message);
    });

    it('应该触发广播事件', async () => {
      const broadcastHandler = vi.fn();
      connectionManager.on('messageBroadcast', broadcastHandler);

      await connectionManager.createConnection('broadcast-test', 'ws://localhost:3000');
      
      const message = { type: 'broadcast', data: 'hello all' };
      connectionManager.broadcast(message);

      expect(broadcastHandler).toHaveBeenCalledWith(message, 1);
    });

    it('应该触发不活跃连接清理事件', async () => {
      const cleanupHandler = vi.fn();
      connectionManager.on('inactiveConnectionsCleaned', cleanupHandler);

      await connectionManager.createConnection('cleanup-test', 'ws://localhost:3000');
      
      // 模拟连接不活跃
      const connection = connectionManager.getConnection('cleanup-test');
      connection.lastActivity = new Date(Date.now() - 10000);

      connectionManager.cleanupInactiveConnections();

      expect(cleanupHandler).toHaveBeenCalledWith(['cleanup-test']);
    });
  });

  describe('错误处理和边界情况', () => {
    it('应该处理连接超时', async () => {
      const timeoutHandler = vi.fn();
      connectionManager.on('connectionTimeout', timeoutHandler);

      // 创建一个会超时的连接管理器
      const timeoutManager = new WebSocketConnectionManager({
        connectionTimeout: 50, // 很短的超时时间
      });

      // 模拟连接创建过程中的延迟
      const originalSetTimeout = global.setTimeout;
      global.setTimeout = vi.fn((callback, delay) => {
        if (delay === 100) { // 连接建立延迟
          return originalSetTimeout(callback, 100); // 超过超时时间
        }
        return originalSetTimeout(callback, delay);
      });

      try {
        await timeoutManager.createConnection('timeout-test', 'ws://localhost:3000');
      } catch (error) {
        // 预期的超时错误
      }

      // 等待超时处理
      await new Promise(resolve => setTimeout(resolve, 100));

      global.setTimeout = originalSetTimeout;
      timeoutManager.destroy();
    });

    it('应该处理大量并发连接', async () => {
      const connectionPromises = [];
      
      // 创建大量并发连接
      for (let i = 0; i < 5; i++) {
        connectionPromises.push(
          connectionManager.createConnection(`concurrent-${i}`, 'ws://localhost:3000')
        );
      }

      const results = await Promise.allSettled(connectionPromises);
      const successful = results.filter(r => r.status === 'fulfilled').length;

      expect(successful).toBe(5);
      expect(connectionManager.getConnectionStats().total).toBe(5);
    });

    it('应该正确处理管理器销毁', async () => {
      await connectionManager.createConnection('destroy-test1', 'ws://localhost:3000');
      await connectionManager.createConnection('destroy-test2', 'ws://localhost:3000');

      expect(connectionManager.getConnectionStats().total).toBe(2);

      connectionManager.destroy();

      expect(connectionManager.getConnectionStats().total).toBe(0);
    });

    it('应该处理无效的连接操作', () => {
      // 尝试更新不存在连接的活动时间
      const updated = connectionManager.updateActivity('nonexistent');
      expect(updated).toBe(false);

      // 检查不存在连接的健康状态
      const health = connectionManager.checkConnectionHealth('nonexistent');
      expect(health.isHealthy).toBe(false);
      expect(health.timeSinceLastActivity).toBe(Infinity);
    });
  });

  describe('性能和资源管理', () => {
    it('应该有效管理内存使用', async () => {
      // 创建和销毁大量连接
      for (let i = 0; i < 100; i++) {
        await connectionManager.createConnection(`temp-${i}`, 'ws://localhost:3000');
        connectionManager.closeConnection(`temp-${i}`, 'test');
      }

      // 验证连接已被清理
      expect(connectionManager.getConnectionStats().total).toBe(0);
    });

    it('应该处理高频消息发送', async () => {
      await connectionManager.createConnection('high-freq', 'ws://localhost:3000');

      let successCount = 0;
      
      // 发送大量消息
      for (let i = 0; i < 1000; i++) {
        const sent = connectionManager.sendMessage('high-freq', { 
          type: 'test', 
          sequence: i 
        });
        if (sent) successCount++;
      }

      expect(successCount).toBe(1000);
    });

    it('应该正确处理定时器清理', async () => {
      const connectionId = 'timer-test';
      await connectionManager.createConnection(connectionId, 'ws://localhost:3000');

      const connection = connectionManager.getConnection(connectionId);
      expect(connection.heartbeatTimer).toBeDefined();

      connectionManager.closeConnection(connectionId, 'test');

      // 验证定时器已被清理（通过检查连接是否被删除）
      expect(connectionManager.getConnection(connectionId)).toBeNull();
    });
  });
});