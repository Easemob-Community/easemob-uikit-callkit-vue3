import { logger } from "../../utils/logger";
import type {
  CallKitEventType,
  CallKitEventPayloads,
  CallKitEventHandler,
} from "./types";

/**
 * CallKit 轻量级事件总线
 * 职责：提供类型安全的发布/订阅机制，供 CallKit 内部模块和用户代码统一监听通话生命周期事件。
 *
 * 不依赖外部库（mitt/EventEmitter），内部使用 Map + Set 实现。
 */
class CallKitEventBus {
  private listeners = new Map<
    CallKitEventType,
    Set<CallKitEventHandler<CallKitEventType>>
  >();

  /**
   * 订阅事件。返回解绑函数，可在组件卸载时调用。
   */
  on<T extends CallKitEventType>(
    event: T,
    handler: CallKitEventHandler<T>
  ): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler as CallKitEventHandler<CallKitEventType>);

    logger.verbose(`[CallKitEventBus] 订阅事件: ${event}`);

    // 返回解绑函数
    return () => this.off(event, handler);
  }

  /**
   * 一次性订阅。触发后自动解绑。
   */
  once<T extends CallKitEventType>(
    event: T,
    handler: CallKitEventHandler<T>
  ): () => void {
    const onceHandler = (payload: CallKitEventPayloads[T]) => {
      this.off(event, onceHandler as CallKitEventHandler<T>);
      handler(payload);
    };
    return this.on(event, onceHandler as CallKitEventHandler<T>);
  }

  /**
   * 取消订阅事件。
   */
  off<T extends CallKitEventType>(
    event: T,
    handler: CallKitEventHandler<T>
  ): void {
    this.listeners.get(event)?.delete(handler as CallKitEventHandler<CallKitEventType>);
  }

  /**
   * 触发事件。所有错误被吞掉，避免一个 handler 异常影响其他 handler。
   */
  emit<T extends CallKitEventType>(
    event: T,
    payload: CallKitEventPayloads[T]
  ): void {
    const handlers = this.listeners.get(event);
    if (!handlers || handlers.size === 0) {
      logger.verbose(`[CallKitEventBus] 事件 ${event} 无订阅者，跳过`);
      return;
    }

    logger.debug(`[CallKitEventBus] 触发事件: ${event}`, payload);

    handlers.forEach((handler) => {
      try {
        handler(payload);
      } catch (error) {
        logger.error(`[CallKitEventBus] 事件 ${event} 的 handler 执行失败:`, error);
      }
    });
  }

  /**
   * 清空指定事件的所有订阅，或清空全部。
   */
  clear(event?: CallKitEventType): void {
    if (event) {
      this.listeners.delete(event);
      logger.debug(`[CallKitEventBus] 清空事件 ${event} 的所有订阅`);
    } else {
      this.listeners.clear();
      logger.debug(`[CallKitEventBus] 清空所有事件订阅`);
    }
  }

  /**
   * 获取指定事件的订阅者数量。
   */
  listenerCount(event: CallKitEventType): number {
    return this.listeners.get(event)?.size ?? 0;
  }
}

/**
 * CallKit 全局事件总线实例
 * 单例，可在 composable、store、service 中直接 import 使用。
 */
export const callKitEventBus = new CallKitEventBus();
