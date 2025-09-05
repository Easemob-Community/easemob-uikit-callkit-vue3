/**
 * 信令管理器 - SignalManager
 * 
 * 单一职责：只负责信令的收发和分发
 * 
 * 核心功能：
 * 1. 监听信令事件
 * 2. 分发信令给注册的处理器
 * 3. 发送信令
 * 
 * 设计原则：
 * - 单一职责：只做信令的收发和分发
 * - 最小化接口：只暴露必要的方法
 * - 不可变状态：避免复杂的状态管理
 */

import { AnySignal, SignalHandler, SignalType } from '../../types/signal.types';

interface ListenerEntry {
  handler: SignalHandler;
  once: boolean;
}

export class SignalManager {
  // 核心状态：监听器映射
  private listeners = new Map<SignalType, ListenerEntry[]>();
  private chatClient: any = null;

  constructor(chatClient?: any) {
    this.chatClient = chatClient || null;
  }

  /**
   * 添加信令监听器
   * @returns 卸载函数
   */
  on<T extends AnySignal>(
    type: T['type'],
    handler: SignalHandler<T>,
    once = false
  ): () => void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, []);
    }

    const entry = { handler: handler as SignalHandler, once };
    this.listeners.get(type)!.push(entry);

    // 返回卸载函数
    return () => this.off(type, handler);
  }

  /**
   * 一次性监听器
   */
  once<T extends AnySignal>(
    type: T['type'],
    handler: SignalHandler<T>
  ): () => void {
    return this.on(type, handler, true);
  }

  /**
   * 移除信令监听器
   */
  off<T extends AnySignal>(
    type: T['type'],
    handler: SignalHandler<T>
  ): void {
    const handlers = this.listeners.get(type);
    if (!handlers) return;

    const index = handlers.findIndex(h => h.handler === handler);
    if (index > -1) {
      handlers.splice(index, 1);
    }

    // 清理空数组
    if (handlers.length === 0) {
      this.listeners.delete(type);
    }
  }

  /**
   * 发送信令
   */
  async emit(signal: AnySignal): Promise<void> {
    // 分发给本地监听器
    this.dispatch(signal);
    
    // TODO: 通过chatClient发送信令
    if (this.chatClient) {
      // 实际发送逻辑
    }
  }

  /**
   * 内部分发机制
   */
  private dispatch(signal: AnySignal): void {
    const handlers = this.listeners.get(signal.type);
    if (!handlers?.length) return;

    // 创建副本避免修改原始数组
    const handlersToCall = [...handlers];
    
    // 执行监听器
    handlersToCall.forEach(({ handler, once }) => {
      try {
        handler(signal);
      } catch (error) {
        console.error(`Error in signal handler for ${signal.type}:`, error);
      }
      
      // 一次性监听器自动移除
      if (once) {
        const index = handlers.findIndex(h => h.handler === handler);
        if (index > -1) handlers.splice(index, 1);
      }
    });

    // 清理空数组
    if (handlers.length === 0) {
      this.listeners.delete(signal.type);
    }
  }

  /**
   * 设置聊天客户端（如果需要发送信令）
   */
  setClient(client: any): void {
    this.chatClient = client;
  }

  /**
   * 清理所有监听器
   */
  clear(): void {
    this.listeners.clear();
  }

  /**
   * 获取某类型的监听器数量（调试用）
   */
  listenerCount(type: SignalType): number {
    return this.listeners.get(type)?.length || 0;
  }
}