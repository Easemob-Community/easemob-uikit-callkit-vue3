import type { Logger } from '../utils/logger'
import { getLogger } from '../utils/logger'

/**
 * 轻量级事件总线
 * 不依赖外部库，内部使用 Map + Set 实现。
 */
export class EventBus<TEvents extends Record<string, any>> {
  private listeners = new Map<keyof TEvents, Set<(payload: any) => void>>()
  private logger: Logger

  constructor(logger?: Logger) {
    this.logger = logger || getLogger()
  }

  on<K extends keyof TEvents>(event: K, handler: (payload: TEvents[K]) => void): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event)!.add(handler)
    this.logger.verbose?.(`[EventBus] 订阅事件: ${String(event)}`)
    return () => this.off(event, handler)
  }

  once<K extends keyof TEvents>(event: K, handler: (payload: TEvents[K]) => void): () => void {
    const onceHandler = (payload: TEvents[K]) => {
      this.off(event, onceHandler as any)
      handler(payload)
    }
    return this.on(event, onceHandler as any)
  }

  off<K extends keyof TEvents>(event: K, handler: (payload: TEvents[K]) => void): void {
    this.listeners.get(event)?.delete(handler as any)
  }

  emit<K extends keyof TEvents>(event: K, payload: TEvents[K]): void {
    const handlers = this.listeners.get(event)
    if (!handlers || handlers.size === 0) {
      this.logger.verbose?.(`[EventBus] 事件 ${String(event)} 无订阅者，跳过`)
      return
    }
    this.logger.debug?.(`[EventBus] 触发事件: ${String(event)}`, payload)
    handlers.forEach((handler) => {
      try {
        handler(payload)
      } catch (error) {
        this.logger.error(`[EventBus] 事件 ${String(event)} 的 handler 执行失败:`, error)
      }
    })
  }

  clear(event?: keyof TEvents): void {
    if (event) {
      this.listeners.delete(event)
    } else {
      this.listeners.clear()
    }
  }

  listenerCount(event: keyof TEvents): number {
    return this.listeners.get(event)?.size ?? 0
  }
}
