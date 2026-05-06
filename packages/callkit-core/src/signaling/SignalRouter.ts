import type { Logger } from '../utils/logger'
import { getLogger } from '../utils/logger'
import type { SignalingExt } from '../types/signal.types'
import type { DomainEvent } from '../state/SingleCallStateMachine'

/**
 * 信令消息体（从 useListenerManager 提取，去框架依赖）
 */
export interface CmdMsgBody {
  from?: string
  to?: string
  id?: string
  action?: string
  ext?: Partial<SignalingExt> & { [key: string]: any }
  [key: string]: any
}

export interface SignalHandler {
  handle(message: CmdMsgBody): DomainEvent[] | Promise<DomainEvent[]>
}

/**
 * SignalRouter
 * 信令消息中央路由器
 * 职责：根据 action 将消息分发给已注册的 Handler
 */
export class SignalRouter {
  private handlers = new Map<string, SignalHandler[]>()
  private logger: Logger

  constructor(logger?: Logger) {
    this.logger = logger || getLogger()
  }

  register(action: string, handler: SignalHandler) {
    if (!this.handlers.has(action)) {
      this.handlers.set(action, [])
    }
    this.handlers.get(action)!.push(handler)
  }

  dispatch(message: CmdMsgBody): DomainEvent[] {
    const action = message.ext?.action
    if (!action) {
      this.logger.warn('[SignalRouter] 消息缺少 action，无法分发', message)
      return []
    }
    this.logger.signal?.('recv', action, {
      from: message.from,
      to: message.to,
      callId: message.ext?.callId,
      result: message.ext?.result,
      deviceId: message.ext?.callerDevId || message.ext?.calleeDevId,
    })
    const handlers = this.handlers.get(action) || []
    if (handlers.length === 0) {
      this.logger.warn(`[SignalRouter] 未注册 action "${action}" 的处理器`)
      return []
    }
    const allEvents: DomainEvent[] = []
    handlers.forEach((h) => {
      try {
        const result = h.handle(message)
        if (result && Array.isArray(result)) {
          allEvents.push(...result)
        }
      } catch (err) {
        this.logger.error('[SignalRouter] Handler 执行失败:', err)
      }
    })
    return allEvents
  }
}
