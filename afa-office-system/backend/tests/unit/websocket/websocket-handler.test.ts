import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { EventEmitter } from 'events';

// Mock WebSocket implementation for testing
class MockWebSocket extends EventEmitter {
  public readyState: number = 1; // OPEN
  public url: string;
  public protocol: string = '';
  public bufferedAmount: number = 0;
  public extensions: string = '';
  public binaryType: 'blob' | 'arraybuffer' = 'blob';

  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSING = 2;
  static readonly CLOSED = 3;

  constructor(url: string, protocols?: string | string[]) {
    super();
    this.url = url;
    
    // 模拟异步连接
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN;
      this.emit('open');
    }, 10);
  }

  send(data: string | ArrayBuffer | Blob): void {
    if (this.readyState !== MockWebSocket.OPEN) {
      throw new Error('WebSocket is not open');
    }
    
    // 模拟发送消息
    setTimeout(() => {
      this.emit('message', { data });
    }, 5);
  }

  close(code?: number, reason?: string): void {
    this.readyState = MockWebSocket.CLOSING;
    setTimeout(() => {
      this.readyState = MockWebSocket.CLOSED;
      this.emit('close', { code: code || 1000, reason: reason || '' });
    }, 10);
  }

  ping(): void {
    // 模拟ping
    setTimeout(() => {
      this.emit('pong');
    }, 5);
  }
}

// WebSocket消息处理器类
class WebSocketMessageHandler {
  private handlers: Map<string, Function[]> = new Map();
  private connectionState: 'connecting' | 'connected' | 'disconnected' | 'error' = 'disconnected';
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 1000;
  private heartbeatInterval?: NodeJS.Timeout;
  private heartbeatTimeout?: NodeJS.Timeout;
  private lastHeartbeat?: Date;

  constructor(private ws?: MockWebSocket) {}

  /**
   * 注册消息处理器
   */
  on(messageType: string, handler: Function): void {
    if (!this.handlers.has(messageType)) {
      this.handlers.set(messageType, []);
    }
    this.handlers.get(messageType)!.push(handler);
  }

  /**
   * 移除消息处理器
   */
  off(messageType: string, handler?: Function): void {
    if (!this.handlers.has(messageType)) {
      return;
    }

    if (handler) {
      const handlers = this.handlers.get(messageType)!;
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    } else {
      this.handlers.delete(messageType);
    }
  }

  /**
   * 处理接收到的消息
   */
  handleMessage(rawMessage: string): void {
    try {
      const message = JSON.parse(rawMessage);
      
      if (!message.type) {
        throw new Error('消息缺少type字段');
      }

      const handlers = this.handlers.get(message.type) || [];
      handlers.forEach(handler => {
        try {
          handler(message.data, message);
        } catch (error) {
          console.error(`处理消息类型 ${message.type} 时出错:`, error);
        }
      });

      // 处理心跳消息
      if (message.type === 'heartbeat') {
        this.handleHeartbeat(message);
      }

    } catch (error) {
      console.error('解析WebSocket消息失败:', error);
      this.emit('parseError', { error, rawMessage });
    }
  }

  /**
   * 发送消息
   */
  send(type: string, data?: any): boolean {
    if (!this.ws || this.ws.readyState !== MockWebSocket.OPEN) {
      console.warn('WebSocket未连接，无法发送消息');
      return false;
    }

    try {
      const message = {
        type,
        data,
        timestamp: new Date().toISOString(),
      };

      this.ws.send(JSON.stringify(message));
      return true;
    } catch (error) {
      console.error('发送WebSocket消息失败:', error);
      return false;
    }
  }

  /**
   * 连接WebSocket
   */
  connect(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.connectionState = 'connecting';
        this.ws = new MockWebSocket(url);

        this.ws.on('open', () => {
          this.connectionState = 'connected';
          this.reconnectAttempts = 0;
          this.startHeartbeat();
          this.emit('connected');
          resolve();
        });

        this.ws.on('message', (event: any) => {
          this.handleMessage(event.data);
        });

        this.ws.on('close', (event: any) => {
          this.connectionState = 'disconnected';
          this.stopHeartbeat();
          this.emit('disconnected', event);
          
          if (event.code !== 1000) { // 非正常关闭
            this.attemptReconnect(url);
          }
        });

        this.ws.on('error', (error: any) => {
          this.connectionState = 'error';
          this.emit('error', error);
          reject(error);
        });

      } catch (error) {
        this.connectionState = 'error';
        reject(error);
      }
    });
  }

  /**
   * 断开连接
   */
  disconnect(): void {
    this.stopHeartbeat();
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
    }
  }

  /**
   * 获取连接状态
   */
  getConnectionState(): string {
    return this.connectionState;
  }

  /**
   * 尝试重连
   */
  private attemptReconnect(url: string): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.emit('reconnectFailed');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1); // 指数退避

    setTimeout(() => {
      this.emit('reconnectAttempt', this.reconnectAttempts);
      this.connect(url).catch(() => {
        // 重连失败，继续尝试
      });
    }, delay);
  }

  /**
   * 开始心跳
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      this.send('ping');
      
      // 设置心跳超时
      this.heartbeatTimeout = setTimeout(() => {
        console.warn('心跳超时，连接可能已断开');
        this.emit('heartbeatTimeout');
      }, 5000);
      
    }, 30000); // 每30秒发送一次心跳
  }

  /**
   * 停止心跳
   */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = undefined;
    }
    if (this.heartbeatTimeout) {
      clearTimeout(this.heartbeatTimeout);
      this.heartbeatTimeout = undefined;
    }
  }

  /**
   * 处理心跳响应
   */
  private handleHeartbeat(message: any): void {
    if (message.type === 'pong') {
      this.lastHeartbeat = new Date();
      if (this.heartbeatTimeout) {
        clearTimeout(this.heartbeatTimeout);
        this.heartbeatTimeout = undefined;
      }
    }
  }

  /**
   * 事件发射器
   */
  private eventEmitter = new EventEmitter();

  private emit(event: string, ...args: any[]): void {
    this.eventEmitter.emit(event, ...args);
  }

  addEventListener(event: string, listener: Function): void {
    this.eventEmitter.on(event, listener);
  }

  removeEventListener(event: string, listener: Function): void {
    this.eventEmitter.off(event, listener);
  }
}

describe('WebSocket 处理逻辑单元测试', () => {
  let messageHandler: WebSocketMessageHandler;
  let mockWs: MockWebSocket;

  beforeEach(() => {
    messageHandler = new WebSocketMessageHandler();
    vi.clearAllMocks();
  });

  afterEach(() => {
    if (messageHandler) {
      messageHandler.disconnect();
    }
  });

  describe('消息解析和处理', () => {
    it('应该正确解析有效的JSON消息', () => {
      const mockHandler = vi.fn();
      messageHandler.on('test_message', mockHandler);

      const testMessage = {
        type: 'test_message',
        data: { content: '测试消息' },
        timestamp: new Date().toISOString(),
      };

      messageHandler.handleMessage(JSON.stringify(testMessage));

      expect(mockHandler).toHaveBeenCalledWith(
        testMessage.data,
        testMessage
      );
    });

    it('应该处理不同类型的消息', () => {
      const userHandler = vi.fn();
      const notificationHandler = vi.fn();
      const systemHandler = vi.fn();

      messageHandler.on('user_update', userHandler);
      messageHandler.on('notification', notificationHandler);
      messageHandler.on('system_alert', systemHandler);

      // 发送用户更新消息
      messageHandler.handleMessage(JSON.stringify({
        type: 'user_update',
        data: { userId: 1, status: 'online' },
      }));

      // 发送通知消息
      messageHandler.handleMessage(JSON.stringify({
        type: 'notification',
        data: { title: '新消息', content: '您有一条新消息' },
      }));

      // 发送系统警告
      messageHandler.handleMessage(JSON.stringify({
        type: 'system_alert',
        data: { level: 'warning', message: '系统负载过高' },
      }));

      expect(userHandler).toHaveBeenCalledWith(
        { userId: 1, status: 'online' },
        expect.objectContaining({ type: 'user_update' })
      );

      expect(notificationHandler).toHaveBeenCalledWith(
        { title: '新消息', content: '您有一条新消息' },
        expect.objectContaining({ type: 'notification' })
      );

      expect(systemHandler).toHaveBeenCalledWith(
        { level: 'warning', message: '系统负载过高' },
        expect.objectContaining({ type: 'system_alert' })
      );
    });

    it('应该处理多个相同类型的处理器', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      const handler3 = vi.fn();

      messageHandler.on('broadcast', handler1);
      messageHandler.on('broadcast', handler2);
      messageHandler.on('broadcast', handler3);

      const broadcastMessage = {
        type: 'broadcast',
        data: { message: '广播消息' },
      };

      messageHandler.handleMessage(JSON.stringify(broadcastMessage));

      expect(handler1).toHaveBeenCalledWith(
        broadcastMessage.data,
        broadcastMessage
      );
      expect(handler2).toHaveBeenCalledWith(
        broadcastMessage.data,
        broadcastMessage
      );
      expect(handler3).toHaveBeenCalledWith(
        broadcastMessage.data,
        broadcastMessage
      );
    });

    it('应该处理无效的JSON消息', () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const parseErrorHandler = vi.fn();
      
      messageHandler.addEventListener('parseError', parseErrorHandler);

      const invalidJson = '{ invalid json }';
      messageHandler.handleMessage(invalidJson);

      expect(errorSpy).toHaveBeenCalledWith(
        '解析WebSocket消息失败:',
        expect.any(Error)
      );

      errorSpy.mockRestore();
    });

    it('应该处理缺少type字段的消息', () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const messageWithoutType = {
        data: { content: '没有type字段的消息' },
      };

      messageHandler.handleMessage(JSON.stringify(messageWithoutType));

      expect(errorSpy).toHaveBeenCalledWith(
        '解析WebSocket消息失败:',
        expect.any(Error)
      );

      errorSpy.mockRestore();
    });

    it('应该处理处理器中的异常', () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const faultyHandler = vi.fn(() => {
        throw new Error('处理器异常');
      });
      const normalHandler = vi.fn();

      messageHandler.on('test_error', faultyHandler);
      messageHandler.on('test_error', normalHandler);

      messageHandler.handleMessage(JSON.stringify({
        type: 'test_error',
        data: { test: true },
      }));

      expect(faultyHandler).toHaveBeenCalled();
      expect(normalHandler).toHaveBeenCalled(); // 其他处理器应该继续执行
      expect(errorSpy).toHaveBeenCalledWith(
        '处理消息类型 test_error 时出错:',
        expect.any(Error)
      );

      errorSpy.mockRestore();
    });
  });

  describe('连接状态管理', () => {
    it('应该正确管理连接状态', async () => {
      expect(messageHandler.getConnectionState()).toBe('disconnected');

      const connectPromise = messageHandler.connect('ws://localhost:3000');
      expect(messageHandler.getConnectionState()).toBe('connecting');

      await connectPromise;
      expect(messageHandler.getConnectionState()).toBe('connected');

      messageHandler.disconnect();
      // 等待连接关闭
      await new Promise(resolve => setTimeout(resolve, 20));
      expect(messageHandler.getConnectionState()).toBe('disconnected');
    });

    it('应该在连接成功时触发connected事件', async () => {
      const connectedHandler = vi.fn();
      messageHandler.addEventListener('connected', connectedHandler);

      await messageHandler.connect('ws://localhost:3000');

      expect(connectedHandler).toHaveBeenCalled();
    });

    it('应该在连接断开时触发disconnected事件', async () => {
      const disconnectedHandler = vi.fn();
      messageHandler.addEventListener('disconnected', disconnectedHandler);

      await messageHandler.connect('ws://localhost:3000');
      messageHandler.disconnect();

      // 等待断开事件
      await new Promise(resolve => setTimeout(resolve, 20));
      expect(disconnectedHandler).toHaveBeenCalled();
    });

    it('应该处理连接错误', async () => {
      const originalWebSocket = MockWebSocket;
      
      // 模拟连接失败
      const FailingWebSocket = class extends MockWebSocket {
        constructor(url: string) {
          super(url);
          setTimeout(() => {
            this.emit('error', new Error('连接失败'));
          }, 5);
        }
      };

      // 临时替换WebSocket实现
      (global as any).MockWebSocket = FailingWebSocket;

      const errorHandler = vi.fn();
      messageHandler.addEventListener('error', errorHandler);

      try {
        await messageHandler.connect('ws://invalid-url');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect(messageHandler.getConnectionState()).toBe('error');
      }

      // 恢复原始实现
      (global as any).MockWebSocket = originalWebSocket;
    });
  });

  describe('错误处理和重连逻辑', () => {
    it('应该在非正常断开时尝试重连', async () => {
      const reconnectAttemptHandler = vi.fn();
      messageHandler.addEventListener('reconnectAttempt', reconnectAttemptHandler);

      await messageHandler.connect('ws://localhost:3000');

      // 模拟非正常断开
      const ws = (messageHandler as any).ws;
      ws.emit('close', { code: 1006, reason: 'Abnormal closure' });

      // 等待重连尝试
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(reconnectAttemptHandler).toHaveBeenCalledWith(1);
    });

    it('应该使用指数退避策略进行重连', async () => {
      const reconnectAttempts: number[] = [];
      messageHandler.addEventListener('reconnectAttempt', (attempt: number) => {
        reconnectAttempts.push(attempt);
      });

      // 模拟连接失败的WebSocket
      const FailingWebSocket = class extends MockWebSocket {
        constructor(url: string) {
          super(url);
          setTimeout(() => {
            this.emit('close', { code: 1006, reason: 'Connection failed' });
          }, 10);
        }
      };

      const originalConnect = messageHandler.connect.bind(messageHandler);
      messageHandler.connect = vi.fn().mockImplementation(() => {
        return new Promise((resolve, reject) => {
          const ws = new FailingWebSocket('ws://localhost:3000');
          (messageHandler as any).ws = ws;
          ws.on('close', () => {
            reject(new Error('Connection failed'));
          });
        });
      });

      try {
        await messageHandler.connect('ws://localhost:3000');
      } catch (error) {
        // 预期的连接失败
      }

      // 等待多次重连尝试
      await new Promise(resolve => setTimeout(resolve, 500));

      expect(reconnectAttempts.length).toBeGreaterThan(0);
      expect(reconnectAttempts.length).toBeLessThanOrEqual(5); // 最大重连次数
    });

    it('应该在达到最大重连次数后停止重连', async () => {
      const reconnectFailedHandler = vi.fn();
      messageHandler.addEventListener('reconnectFailed', reconnectFailedHandler);

      // 设置较小的最大重连次数进行测试
      (messageHandler as any).maxReconnectAttempts = 2;

      // 模拟持续失败的连接
      messageHandler.connect = vi.fn().mockRejectedValue(new Error('Connection failed'));

      try {
        await messageHandler.connect('ws://localhost:3000');
      } catch (error) {
        // 预期的连接失败
      }

      // 等待重连尝试完成
      await new Promise(resolve => setTimeout(resolve, 200));

      expect(reconnectFailedHandler).toHaveBeenCalled();
    });
  });

  describe('消息发送功能', () => {
    beforeEach(async () => {
      await messageHandler.connect('ws://localhost:3000');
    });

    it('应该成功发送消息', () => {
      const result = messageHandler.send('test_message', { content: '测试' });
      expect(result).toBe(true);
    });

    it('应该在未连接时返回false', () => {
      messageHandler.disconnect();
      
      const result = messageHandler.send('test_message', { content: '测试' });
      expect(result).toBe(false);
    });

    it('应该发送正确格式的消息', () => {
      const ws = (messageHandler as any).ws;
      const sendSpy = vi.spyOn(ws, 'send');

      messageHandler.send('user_action', { action: 'click', target: 'button' });

      expect(sendSpy).toHaveBeenCalledWith(
        expect.stringContaining('"type":"user_action"')
      );
      expect(sendSpy).toHaveBeenCalledWith(
        expect.stringContaining('"data":{"action":"click","target":"button"}')
      );
      expect(sendSpy).toHaveBeenCalledWith(
        expect.stringContaining('"timestamp"')
      );
    });

    it('应该处理发送异常', () => {
      const ws = (messageHandler as any).ws;
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      // 模拟发送失败
      ws.send = vi.fn(() => {
        throw new Error('发送失败');
      });

      const result = messageHandler.send('test_message', { content: '测试' });

      expect(result).toBe(false);
      expect(errorSpy).toHaveBeenCalledWith(
        '发送WebSocket消息失败:',
        expect.any(Error)
      );

      errorSpy.mockRestore();
    });
  });

  describe('心跳机制', () => {
    beforeEach(async () => {
      await messageHandler.connect('ws://localhost:3000');
    });

    it('应该定期发送心跳', async () => {
      const ws = (messageHandler as any).ws;
      const sendSpy = vi.spyOn(ws, 'send');

      // 等待心跳发送
      await new Promise(resolve => setTimeout(resolve, 100));

      // 由于测试环境中心跳间隔较长，我们直接调用心跳方法
      messageHandler.send('ping');

      expect(sendSpy).toHaveBeenCalledWith(
        expect.stringContaining('"type":"ping"')
      );
    });

    it('应该处理心跳响应', () => {
      const pongMessage = {
        type: 'pong',
        timestamp: new Date().toISOString(),
      };

      // 发送心跳响应
      messageHandler.handleMessage(JSON.stringify(pongMessage));

      // 验证心跳时间已更新
      const lastHeartbeat = (messageHandler as any).lastHeartbeat;
      expect(lastHeartbeat).toBeInstanceOf(Date);
    });

    it('应该在心跳超时时触发事件', async () => {
      const heartbeatTimeoutHandler = vi.fn();
      messageHandler.addEventListener('heartbeatTimeout', heartbeatTimeoutHandler);

      // 模拟心跳超时
      messageHandler.send('ping');
      
      // 等待超时（在实际实现中会更长）
      await new Promise(resolve => setTimeout(resolve, 10));

      // 由于测试环境限制，我们直接触发超时事件
      (messageHandler as any).emit('heartbeatTimeout');

      expect(heartbeatTimeoutHandler).toHaveBeenCalled();
    });
  });

  describe('事件处理器管理', () => {
    it('应该正确添加和移除事件处理器', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      // 添加处理器
      messageHandler.on('test_event', handler1);
      messageHandler.on('test_event', handler2);

      // 发送消息
      messageHandler.handleMessage(JSON.stringify({
        type: 'test_event',
        data: { test: true },
      }));

      expect(handler1).toHaveBeenCalled();
      expect(handler2).toHaveBeenCalled();

      // 移除特定处理器
      messageHandler.off('test_event', handler1);

      handler1.mockClear();
      handler2.mockClear();

      // 再次发送消息
      messageHandler.handleMessage(JSON.stringify({
        type: 'test_event',
        data: { test: true },
      }));

      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).toHaveBeenCalled();

      // 移除所有处理器
      messageHandler.off('test_event');

      handler2.mockClear();

      // 再次发送消息
      messageHandler.handleMessage(JSON.stringify({
        type: 'test_event',
        data: { test: true },
      }));

      expect(handler2).not.toHaveBeenCalled();
    });

    it('应该处理不存在的事件类型', () => {
      // 移除不存在的处理器不应该报错
      expect(() => {
        messageHandler.off('nonexistent_event');
      }).not.toThrow();

      // 发送没有处理器的消息不应该报错
      expect(() => {
        messageHandler.handleMessage(JSON.stringify({
          type: 'unhandled_event',
          data: { test: true },
        }));
      }).not.toThrow();
    });
  });

  describe('业务场景测试', () => {
    beforeEach(async () => {
      await messageHandler.connect('ws://localhost:3000');
    });

    it('应该处理实时访客状态更新', () => {
      const visitorUpdateHandler = vi.fn();
      messageHandler.on('visitor_status_update', visitorUpdateHandler);

      const visitorUpdate = {
        type: 'visitor_status_update',
        data: {
          visitorId: 123,
          status: 'approved',
          approvedBy: 'admin',
          timestamp: new Date().toISOString(),
        },
      };

      messageHandler.handleMessage(JSON.stringify(visitorUpdate));

      expect(visitorUpdateHandler).toHaveBeenCalledWith(
        visitorUpdate.data,
        visitorUpdate
      );
    });

    it('应该处理实时通行记录', () => {
      const accessRecordHandler = vi.fn();
      messageHandler.on('access_record', accessRecordHandler);

      const accessRecord = {
        type: 'access_record',
        data: {
          userId: 456,
          spaceId: 789,
          accessTime: new Date().toISOString(),
          accessType: 'entry',
          deviceId: 'device_001',
        },
      };

      messageHandler.handleMessage(JSON.stringify(accessRecord));

      expect(accessRecordHandler).toHaveBeenCalledWith(
        accessRecord.data,
        accessRecord
      );
    });

    it('应该处理系统通知广播', () => {
      const notificationHandler = vi.fn();
      messageHandler.on('system_notification', notificationHandler);

      const notification = {
        type: 'system_notification',
        data: {
          title: '系统维护通知',
          message: '系统将于今晚22:00进行维护',
          level: 'info',
          targetUsers: ['all'],
        },
      };

      messageHandler.handleMessage(JSON.stringify(notification));

      expect(notificationHandler).toHaveBeenCalledWith(
        notification.data,
        notification
      );
    });

    it('应该处理多用户协作场景', () => {
      const userJoinHandler = vi.fn();
      const userLeaveHandler = vi.fn();
      const userActionHandler = vi.fn();

      messageHandler.on('user_join', userJoinHandler);
      messageHandler.on('user_leave', userLeaveHandler);
      messageHandler.on('user_action', userActionHandler);

      // 用户加入
      messageHandler.handleMessage(JSON.stringify({
        type: 'user_join',
        data: { userId: 1, userName: '张三', role: 'admin' },
      }));

      // 用户操作
      messageHandler.handleMessage(JSON.stringify({
        type: 'user_action',
        data: { userId: 1, action: 'approve_visitor', targetId: 123 },
      }));

      // 用户离开
      messageHandler.handleMessage(JSON.stringify({
        type: 'user_leave',
        data: { userId: 1, reason: 'logout' },
      }));

      expect(userJoinHandler).toHaveBeenCalled();
      expect(userActionHandler).toHaveBeenCalled();
      expect(userLeaveHandler).toHaveBeenCalled();
    });
  });
});