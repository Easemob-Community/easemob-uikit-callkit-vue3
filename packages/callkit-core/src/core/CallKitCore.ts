import type {
  CallKitCoreConfig,
  InviteCallParams,
  AnswerCallParams,
  HangupParams,
  InviteGroupCallParams,
  RtcReport,
} from './CallKitCore.types'
import type { CallKitEvent } from '../events/CallKitEvents'
import { getLogger } from '../utils/logger'
import { SingleCallStateMachine } from '../state/SingleCallStateMachine'
import { GroupCallSession } from '../state/GroupCallSession'
import { SignalRouter } from '../signaling/SignalRouter'
import { SignalSender } from '../signaling/SignalSender'
import { IMListener } from '../im/IMListener'

/**
 * CallKitCore
 * 框架无关的通话信令核心。
 *
 * 职责：
 * 1. 管理单聊/群聊通话生命周期
 * 2. 通过事件回调通知上层所有决策点
 * 3. 不直接操作任何 RTC SDK，RTC 由上层通过适配器或事件自行处理
 */
export class CallKitCore {
  private config: CallKitCoreConfig
  private singleCallState = new SingleCallStateMachine()
  private groupCallSession: GroupCallSession | null = null
  private signalRouter: SignalRouter
  private signalSender: SignalSender
  private imListener: IMListener
  private logger = getLogger()
  private destroyed = false

  constructor(config: CallKitCoreConfig) {
    this.config = config

    // TODO: Phase 2 - 将 Handler 改为返回 DomainEvent[]，由 Core 聚合后统一 emit
    this.signalRouter = new SignalRouter()
    this.signalSender = new SignalSender(config.imClient)
    this.imListener = new IMListener(config.imClient, this.signalRouter)

    this.imListener.mount()
    this.logger.info('[CallKitCore] 初始化完成')
  }

  // ─── 单聊 API ───

  /**
   * 发起单聊通话
   */
  async inviteCall(params: InviteCallParams): Promise<void> {
    if (this.destroyed) throw new Error('CallKitCore 已销毁')
    this.logger.info('[CallKitCore] inviteCall', params)

    // TODO: Phase 2 - 调用 SingleCallStateMachine.transition({ type: 'LOCAL_INVITE' })
    // TODO: Phase 2 - 通过 MessageBuilder 构建 invite 消息
    // TODO: Phase 2 - 通过 SignalSender 发送
    // TODO: Phase 2 - 触发 outgoing events

    throw new Error('inviteCall 尚未实现')
  }

  /**
   * 响应来电（接受/拒绝）
   */
  async answerCall(params: AnswerCallParams): Promise<void> {
    if (this.destroyed) throw new Error('CallKitCore 已销毁')
    this.logger.info('[CallKitCore] answerCall', params)

    // TODO: Phase 2 - 发送 answerCall 信令
    // TODO: Phase 2 - 接受分支：等待 confirmCallee，然后触发 shouldJoinRtc

    throw new Error('answerCall 尚未实现')
  }

  /**
   * 挂断/取消通话
   */
  async hangup(params?: HangupParams): Promise<void> {
    if (this.destroyed) throw new Error('CallKitCore 已销毁')
    this.logger.info('[CallKitCore] hangup', params)

    // TODO: Phase 2 - 根据当前状态决定发送 cancelCall 还是 leaveCall
    // TODO: Phase 2 - 重置 SingleCallStateMachine
    // TODO: Phase 2 - 触发 callEnded

    throw new Error('hangup 尚未实现')
  }

  // ─── 群聊 API ───

  /**
   * 发起群聊通话
   */
  async inviteGroupCall(params: InviteGroupCallParams): Promise<void> {
    if (this.destroyed) throw new Error('CallKitCore 已销毁')
    this.logger.info('[CallKitCore] inviteGroupCall', params)

    // TODO: Phase 2 - 初始化 GroupCallSession
    // TODO: Phase 2 - 发送 invite 文本消息
    // TODO: Phase 2 - 触发 groupCallInit

    throw new Error('inviteGroupCall 尚未实现')
  }

  // ─── RTC 反馈 ───

  /**
   * 上层调用 RTC SDK 后，通过此方法反馈 RTC 事件给核心库
   */
  reportRtcEvent(report: RtcReport): void {
    this.logger.info('[CallKitCore] reportRtcEvent', report)

    // TODO: Phase 3 - 更新 SingleCallStateMachine / GroupCallSession 的 RTC 状态
    // TODO: Phase 3 - 触发 participantJoined / participantLeft 等事件
  }

  // ─── 状态查询 ───

  /**
   * 获取当前单聊状态快照
   */
  getSingleCallState() {
    return this.singleCallState.getState()
  }

  /**
   * 获取当前群聊会话快照
   */
  getGroupCallSession() {
    return this.groupCallSession?.getSnapshot() ?? null
  }

  // ─── 生命周期 ───

  /**
   * 销毁核心实例，清理所有监听器和定时器
   */
  async destroy(): Promise<void> {
    if (this.destroyed) return
    this.destroyed = true

    this.imListener.unmount()
    this.singleCallState.reset()
    this.groupCallSession = null

    this.logger.info('[CallKitCore] 已销毁')
  }

  // ─── 内部方法 ───

  private emitEvent(event: CallKitEvent): void {
    try {
      this.config.onEvent(event)
    } catch (err) {
      this.logger.error('[CallKitCore] onEvent 回调执行失败:', err)
    }
  }
}
