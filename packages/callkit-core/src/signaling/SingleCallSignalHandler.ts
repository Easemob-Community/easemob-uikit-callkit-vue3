import type { CmdMsgBody, SignalHandler } from './SignalRouter'
import type { SingleCallStateMachine } from '../state/SingleCallStateMachine'
import type { Logger } from '../utils/logger'
import { getLogger } from '../utils/logger'

/**
 * SingleCallSignalHandler
 * 单聊域信令处理器
 *
 * 改造目标：
 * 1. 不再直接读写 Pinia Store → 改为注入 SingleCallStateMachine
 * 2. 不再直接 join RTC → 返回 DomainEvent
 * 3. 不再直接调用 CallService.hangup() → 返回 DomainEvent
 * 4. 不再直接 emit callKitEventBus → 返回 DomainEvent
 *
 * 当前阶段：骨架，待 Phase 2 填充完整逻辑（从现有 lib/signaling/SingleCallSignalHandler.ts 迁移）
 */
export class SingleCallSignalHandler implements SignalHandler {
  private stateMachine: SingleCallStateMachine
  private logger: Logger

  // TODO: Phase 2 - 注入 SignalSender 用于发送响应信令（confirmRing / confirmCallee）
  // TODO: Phase 2 - 注入当前用户 deviceId / userId 用于多端校验

  constructor(stateMachine: SingleCallStateMachine, logger?: Logger) {
    this.stateMachine = stateMachine
    this.logger = logger || getLogger()
  }

  handle(message: CmdMsgBody): void {
    const action = message.ext?.action
    switch (action) {
      case 'alert':
        this.handleAlert(message)
        break
      case 'confirmRing':
        this.handleConfirmRing(message)
        break
      case 'answerCall':
        this.handleAnswerCall(message)
        break
      case 'cancelCall':
        this.handleCancelCall(message)
        break
      case 'leaveCall':
        this.handleLeaveCall(message)
        break
      case 'confirmCallee':
        this.handleConfirmCallee(message)
        break
      default:
        this.logger.warn(`[SingleCallSignalHandler] 未知 action: ${action}`)
    }
  }

  private handleAlert(message: CmdMsgBody): void {
    this.logger.info('[SingleCallSignalHandler] handleAlert — TODO')
    // TODO: Phase 2 - 校验 callId / callerDevId
    // TODO: Phase 2 - 清除超时定时器
    // TODO: Phase 2 - 构建并发送 confirmRing 信令
    // TODO: Phase 2 - 单聊：重新启动超时
  }

  private handleConfirmRing(message: CmdMsgBody): void {
    this.logger.info('[SingleCallSignalHandler] handleConfirmRing — TODO')
    // TODO: Phase 2 - 多端 deviceId 校验
    // TODO: Phase 2 - 更新状态为 RECEIVED_CONFIRM_RING
  }

  private handleAnswerCall(message: CmdMsgBody): void {
    this.logger.info('[SingleCallSignalHandler] handleAnswerCall — TODO')
    // TODO: Phase 2 - callId 校验
    // TODO: Phase 2 - accept 分支：发送 confirmCallee → 状态 IN_CALL → 返回 shouldJoinRtc / callStarted
    // TODO: Phase 2 - refuse 分支：返回 callRefused / callEnded
    // TODO: Phase 2 - busy 分支：返回 callBusy / callEnded
  }

  private handleCancelCall(message: CmdMsgBody): void {
    this.logger.info('[SingleCallSignalHandler] handleCancelCall — TODO')
    // TODO: Phase 2 - callId 不匹配时的容错逻辑（来自 caller + ALERTING/INVITING → 挂断）
    // TODO: Phase 2 - callId 匹配 → 返回 callCanceled / callEnded
  }

  private handleLeaveCall(message: CmdMsgBody): void {
    this.logger.info('[SingleCallSignalHandler] handleLeaveCall — TODO')
    // TODO: Phase 2 - callId 不匹配时的容错逻辑
    // TODO: Phase 2 - callId 匹配 → 返回 callEnded(remoteHangup)
  }

  private handleConfirmCallee(message: CmdMsgBody): void {
    this.logger.info('[SingleCallSignalHandler] handleConfirmCallee — TODO')
    // TODO: Phase 2 - callId 校验
    // TODO: Phase 2 - 状态更新为 IN_CALL
    // TODO: Phase 2 - 返回 shouldJoinRtc / callStarted（被叫方）
  }
}
