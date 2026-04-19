import type { CmdMsgBody } from '../composables/useListenerManager'

export interface SignalHandler {
  handle(message: CmdMsgBody): void | Promise<void>
}

/**
 * SignalRouter
 * 信令消息中央路由器
 * 职责：根据 action 将消息分发给已注册的 Handler
 */
export class SignalRouter {
  private handlers = new Map<string, SignalHandler[]>()

  register(action: string, handler: SignalHandler) {
    if (!this.handlers.has(action)) {
      this.handlers.set(action, [])
    }
    this.handlers.get(action)!.push(handler)
  }

  dispatch(message: CmdMsgBody) {
    const action = message.ext?.action
    if (!action) {
      console.warn('[SignalRouter] 消息缺少 action，无法分发', message)
      return
    }
    const handlers = this.handlers.get(action) || []
    if (handlers.length === 0) {
      console.warn(`[SignalRouter] 未注册 action "${action}" 的处理器`)
      return
    }
    handlers.forEach(h => h.handle(message))
  }
}
