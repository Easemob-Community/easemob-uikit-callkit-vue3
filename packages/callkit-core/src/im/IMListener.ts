import type { EasemobConnection } from '../core/CallKitCore.types'
import type { SignalRouter } from '../signaling/SignalRouter'
import type { Logger } from '../utils/logger'
import { getLogger } from '../utils/logger'

/**
 * IMListener
 * 环信 IM SDK 消息监听器薄壳。
 *
 * 职责：
 * 1. 挂载 onTextMessage / onCmdMessage 监听
 * 2. 收到消息后转交 SignalRouter 分发
 * 3. 不处理任何业务逻辑
 */
export class IMListener {
  private imClient: EasemobConnection
  private signalRouter: SignalRouter
  private logger: Logger
  private mounted = false
  private handlerId = 'callkit-core-listener'

  constructor(imClient: EasemobConnection, signalRouter: SignalRouter, logger?: Logger) {
    this.imClient = imClient
    this.signalRouter = signalRouter
    this.logger = logger || getLogger()
  }

  /**
   * 挂载监听
   */
  mount(): void {
    if (this.mounted) return
    this.mounted = true

    this.imClient.addEventHandler(this.handlerId, {
      onTextMessage: (msg: any) => {
        this.logger.debug('[IMListener] onTextMessage', { from: msg.from, id: msg.id })
        // TODO: Phase 2 - 处理 invite 文本消息（单聊/群聊）
        // 群聊 invite 需要直接交给 GroupCallSignalHandler.handleInviteTextMessage()
      },
      onCmdMessage: (msg: any) => {
        this.logger.debug('[IMListener] onCmdMessage', { from: msg.from, action: msg.action })
        this.signalRouter.dispatch(msg)
      },
    })

    this.logger.info('[IMListener] 监听已挂载')
  }

  /**
   * 卸载监听
   */
  unmount(): void {
    if (!this.mounted) return
    this.mounted = false
    this.imClient.removeEventHandler(this.handlerId)
    this.logger.info('[IMListener] 监听已卸载')
  }
}
