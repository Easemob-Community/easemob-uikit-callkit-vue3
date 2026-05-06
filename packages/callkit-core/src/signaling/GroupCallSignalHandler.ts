import type { CmdMsgBody, SignalHandler } from './SignalRouter'
import type { GroupCallSession } from '../state/GroupCallSession'
import type { Logger } from '../utils/logger'
import { getLogger } from '../utils/logger'

/**
 * GroupCallSignalHandler
 * 群聊域信令处理器
 *
 * 改造目标：
 * 1. 不再直接读写 GroupCallStore → 改为注入 GroupCallSession
 * 2. 不再直接调用 CallService → 返回 DomainEvent
 *
 * 当前阶段：骨架，待 Phase 2 填充完整逻辑
 */
export class GroupCallSignalHandler implements SignalHandler {
  private session: GroupCallSession
  private logger: Logger

  // TODO: Phase 2 - 注入 SingleCallStateMachine 用于 callId / 状态校验
  // TODO: Phase 2 - 注入当前 userId / deviceId

  constructor(session: GroupCallSession, logger?: Logger) {
    this.session = session
    this.logger = logger || getLogger()
  }

  /**
   * 处理 invite 文本消息中的群聊初始化
   * 由 IMListener 在收到 invite 文本消息时直接调用（不走 SignalRouter）
   */
  handleInviteTextMessage(message: CmdMsgBody): void {
    this.logger.info('[GroupCallSignalHandler] handleInviteTextMessage — TODO')
    // TODO: Phase 2 - 解析 ext 中的 groupId / channel / callType / invitedMembers
    // TODO: Phase 2 - 调用 session.init() + addParticipant(local/caller/members)
    // TODO: Phase 2 - 返回 groupCallInit / incomingCall 事件
  }

  handle(message: CmdMsgBody): void {
    const action = message.ext?.action
    switch (action) {
      case 'answerCall':
        this.handleAnswerCall(message)
        break
      case 'cancelCall':
        this.handleCancelCall(message)
        break
      case 'leaveCall':
        this.handleLeaveCall(message)
        break
      default:
        this.logger.warn(`[GroupCallSignalHandler] 未知 action: ${action}`)
    }
  }

  private handleAnswerCall(message: CmdMsgBody): void {
    this.logger.info('[GroupCallSignalHandler] handleAnswerCall — TODO')
    // TODO: Phase 2 - callId 校验
    // TODO: Phase 2 - accept → session.markAccepted() + 返回 participantStateChanged(accepted)
    // TODO: Phase 2 - reject → session.removeParticipant() + 返回 participantRemoved
  }

  private handleCancelCall(message: CmdMsgBody): void {
    this.logger.info('[GroupCallSignalHandler] handleCancelCall — TODO')
    // TODO: Phase 2 - callId 不匹配时的容错（来自 caller + ALERTING/INVITING → 挂断）
    // TODO: Phase 2 - callId 匹配 + 来自 caller → 返回 callEnded
  }

  private handleLeaveCall(message: CmdMsgBody): void {
    this.logger.info('[GroupCallSignalHandler] handleLeaveCall — TODO')
    // TODO: Phase 2 - callId 不匹配时的容错
    // TODO: Phase 2 - ALERTING + 来自 caller → 返回 callEnded
    // TODO: Phase 2 - IN_CALL → session.setParticipantState(left) + 返回 participantLeft
  }
}
