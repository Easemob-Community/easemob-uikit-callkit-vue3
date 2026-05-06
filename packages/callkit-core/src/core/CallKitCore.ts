import type {
  CallKitCoreConfig,
  InviteCallParams,
  AnswerCallParams,
  HangupParams,
  InviteGroupCallParams,
  RtcReport,
  EasemobConnection,
} from './CallKitCore.types'
import type { CallKitEvent } from '../events/CallKitEvents'
import type { DomainEvent, SingleCallState } from '../state/SingleCallStateMachine'
import { getLogger } from '../utils/logger'
import type { Logger } from '../utils/logger'
import { SingleCallStateMachine } from '../state/SingleCallStateMachine'
import { GroupCallSession } from '../state/GroupCallSession'
import { SignalRouter } from '../signaling/SignalRouter'
import { SignalSender } from '../signaling/SignalSender'
import { SingleCallSignalHandler } from '../signaling/SingleCallSignalHandler'
import { GroupCallSignalHandler } from '../signaling/GroupCallSignalHandler'
import { IMListener } from '../im/IMListener'
import { MessageBuilder } from '../signaling/MessageBuilder'
import { generateRandomChannel } from '../utils/callUtils'
import { CALL_STATUS, CALL_TYPE, HANGUP_REASON } from '../types/callstate.types'

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
  private logger: Logger
  private singleCallState: SingleCallStateMachine
  private groupCallSession: GroupCallSession
  private signalRouter: SignalRouter
  private signalSender: SignalSender
  private singleCallHandler: SingleCallSignalHandler
  private groupCallHandler: GroupCallSignalHandler
  private imListener: IMListener
  private destroyed = false

  // 当前用户信息
  private userId: string
  private deviceId: string
  private inviteTimeoutMs: number

  constructor(config: CallKitCoreConfig) {
    this.config = config
    this.logger = config.logger || getLogger()

    // 提取当前用户信息
    this.userId = config.imClient.context?.userId || config.imClient.user || ''
    this.deviceId = config.imClient.context?.jid?.clientResource || ''
    this.inviteTimeoutMs = config.inviteTimeout || 30000

    // 初始化状态层
    this.singleCallState = new SingleCallStateMachine(this.logger)
    this.groupCallSession = new GroupCallSession(this.logger)

    // 初始化信令层
    this.signalRouter = new SignalRouter(this.logger)
    this.signalSender = new SignalSender(config.imClient, this.logger, config.createMessage)

    // 初始化 Handler
    this.singleCallHandler = new SingleCallSignalHandler(
      this.singleCallState,
      this.signalSender,
      this.deviceId,
      this.logger
    )
    this.groupCallHandler = new GroupCallSignalHandler(
      this.groupCallSession,
      this.singleCallState,
      this.userId,
      this.logger
    )

    // 注册到 Router
    this.signalRouter.register('alert', this.singleCallHandler)
    this.signalRouter.register('confirmRing', this.singleCallHandler)
    this.signalRouter.register('answerCall', this.singleCallHandler)
    this.signalRouter.register('cancelCall', this.singleCallHandler)
    this.signalRouter.register('leaveCall', this.singleCallHandler)
    this.signalRouter.register('confirmCallee', this.singleCallHandler)

    this.signalRouter.register('answerCall', this.groupCallHandler)
    this.signalRouter.register('cancelCall', this.groupCallHandler)
    this.signalRouter.register('leaveCall', this.groupCallHandler)

    // 初始化 IM 监听
    this.imListener = new IMListener(
      config.imClient,
      {
        onTextMessage: (msg) => this.handleTextMessage(msg),
        onCmdMessage: (msg) => this.handleCmdMessage(msg),
      },
      this.logger
    )
    this.imListener.mount()

    this.logger.info('[CallKitCore] 初始化完成', { userId: this.userId, deviceId: this.deviceId })
  }

  // ───────────────────────────────────────────────
  // 单聊 API
  // ───────────────────────────────────────────────

  /**
   * 发起单聊通话
   */
  async inviteCall(params: InviteCallParams): Promise<void> {
    if (this.destroyed) throw new Error('CallKitCore 已销毁')

    const callId = generateRandomChannel(16)
    const channel = generateRandomChannel(12)

    // 获取 RTC token
    let token = ''
    try {
      const tokenRes = await this.config.imClient.getRTCToken(channel)
      token = tokenRes.accessToken
    } catch (err) {
      this.logger.warn('[CallKitCore] 获取 RTC token 失败，使用空token', err)
    }

    // 状态机流转
    const stateResult = this.singleCallState.initInvite({
      calleeUserId: params.calleeUserId,
      callType: params.callType,
      callerDevId: this.deviceId,
      callerUserId: this.userId,
      callId,
      channel,
      token,
      timeout: this.inviteTimeoutMs,
    })

    // 发送 invite 文本消息
    const ext = MessageBuilder.buildInviteExt({
      callId,
      callerUserId: this.userId,
      calleeUserId: params.calleeUserId,
      callerDevId: this.deviceId,
      channel,
      callType: params.callType,
      callerInfo: this.config.userProfile,
    })

    await this.signalSender.sendInviteMessage(
      params.calleeUserId,
      'singleChat',
      '[通话邀请]',
      ext as any
    )

    // 处理并发出事件
    this.processEvents(stateResult.events, this.singleCallState.getState())
  }

  /**
   * 响应来电（接受/拒绝）
   */
  async answerCall(params: AnswerCallParams): Promise<void> {
    if (this.destroyed) throw new Error('CallKitCore 已销毁')

    const state = this.singleCallState.getState()

    // 兼容旧版 accept: boolean 参数
    const result = params.result ?? (params.accept ? 'accept' : 'refuse')

    if (result === 'accept') {
      // ── 接受分支 ──
      // 发送 answerCall 信令
      const ext = MessageBuilder.buildCmdExt({
        action: 'answerCall',
        callId: state.callId,
        callerDevId: state.callerDevId,
        calleeDevId: this.deviceId,
        result: 'accept',
      })

      await this.signalSender.sendCmdMessage(
        state.callerUserId,
        'singleChat',
        ext as any,
        { deliverOnlineOnly: true }
      )

      // 被叫方状态保持 ALERTING，等待 confirmCallee 后再进入 IN_CALL
      // （由 SingleCallSignalHandler.handleConfirmCallee 处理）
    } else {
      // ── 拒绝/忙线分支 ──
      const ext = MessageBuilder.buildCmdExt({
        action: 'answerCall',
        callId: state.callId,
        callerDevId: state.callerDevId,
        calleeDevId: this.deviceId,
        result,
      })

      await this.signalSender.sendCmdMessage(
        state.callerUserId,
        'singleChat',
        ext as any,
        { deliverOnlineOnly: true }
      )

      // 清理本地状态
      const hangupReason = result === 'busy' ? HANGUP_REASON.BUSY : HANGUP_REASON.REFUSE
      const hangupResult = this.singleCallState.hangup(hangupReason)
      this.processEvents(hangupResult.events, state)
    }
  }

  /**
   * 挂断/取消通话
   */
  async hangup(params?: HangupParams): Promise<void> {
    if (this.destroyed) throw new Error('CallKitCore 已销毁')

    const state = this.singleCallState.getState()
    const currentStatus = state.status

    if (currentStatus === CALL_STATUS.IDLE) {
      this.logger.warn('[CallKitCore] hangup: 当前 IDLE，忽略')
      return
    }

    // 根据状态决定发送 cancelCall 还是 leaveCall
    if (currentStatus === CALL_STATUS.INVITING || currentStatus === CALL_STATUS.ALERTING) {
      // 发送 cancelCall
      const ext = MessageBuilder.buildCmdExt({
        action: 'cancelCall',
        callId: state.callId,
        callerDevId: state.callerDevId,
      })
      const targetId = state.callerUserId === this.userId ? state.calleeUserId : state.callerUserId
      await this.signalSender.sendCmdMessage(targetId, 'singleChat', ext as any).catch(() => {})
    } else if (currentStatus === CALL_STATUS.IN_CALL) {
      // 发送 leaveCall
      const ext = MessageBuilder.buildCmdExt({
        action: 'leaveCall',
        callId: state.callId,
      })
      const targetId = state.callerUserId === this.userId ? state.calleeUserId : state.callerUserId
      await this.signalSender.sendCmdMessage(targetId, 'singleChat', ext as any).catch(() => {})
    }

    const reason = params?.reason === 'cancel'
      ? HANGUP_REASON.CANCEL
      : params?.reason === 'timeout'
      ? HANGUP_REASON.NO_RESPONSE
      : HANGUP_REASON.HANGUP

    const hangupResult = this.singleCallState.hangup(reason)
    this.processEvents(hangupResult.events, state)
  }

  // ───────────────────────────────────────────────
  // 群聊 API
  // ───────────────────────────────────────────────

  /**
   * 发起群聊通话
   */
  async inviteGroupCall(params: InviteGroupCallParams): Promise<void> {
    if (this.destroyed) throw new Error('CallKitCore 已销毁')

    const callId = generateRandomChannel(16)
    const channel = generateRandomChannel(12)
    const callTypeStr = params.callType === CALL_TYPE.VIDEO_MULTI ? 'video' : 'audio'

    // 获取 RTC token
    let token = ''
    try {
      const tokenRes = await this.config.imClient.getRTCToken(channel)
      token = tokenRes.accessToken
    } catch (err) {
      this.logger.warn('[CallKitCore] 获取 RTC token 失败', err)
    }

    // 初始化群聊会话
    this.groupCallSession.init({
      sessionId: channel,
      groupId: params.groupId,
      groupName: params.groupId,
      callType: callTypeStr,
      callerUserId: this.userId,
    })

    // 初始化单聊状态机（群聊也用它存储 callId/channel/token）
    const stateResult = this.singleCallState.initInvite({
      calleeUserId: '',
      callType: params.callType,
      callerDevId: this.deviceId,
      callerUserId: this.userId,
      callId,
      channel,
      token,
      timeout: this.inviteTimeoutMs,
    })

    // 发送 invite 文本消息（groupChat）
    const ext = MessageBuilder.buildInviteExt({
      callId,
      callerUserId: this.userId,
      calleeUserId: '',
      callerDevId: this.deviceId,
      channel,
      callType: params.callType,
      invitedMembers: params.participantIds,
      groupInfo: { groupId: params.groupId },
      callerInfo: this.config.userProfile,
    })

    await this.signalSender.sendInviteMessage(
      params.participantIds,
      'groupChat',
      '[群通话邀请]',
      ext as any,
      params.groupId
    )

    this.processEvents(stateResult.events, this.singleCallState.getState())
  }

  // ───────────────────────────────────────────────
  // RTC 反馈
  // ───────────────────────────────────────────────

  /**
   * 上层调用 RTC SDK 后，通过此方法反馈 RTC 事件给核心库
   */
  reportRtcEvent(report: RtcReport): void {
    this.logger.info('[CallKitCore] reportRtcEvent', report)

    if (report.type === 'userJoined' && report.payload.userId) {
      this.groupCallSession.markJoinedRtc(report.payload.userId)
    } else if (report.type === 'userLeft' && report.payload.userId) {
      this.groupCallSession.markLeftRtc(report.payload.userId)
    }
  }

  // ───────────────────────────────────────────────
  // 状态查询
  // ───────────────────────────────────────────────

  getSingleCallState() {
    return this.singleCallState.getState()
  }

  getGroupCallSession() {
    return this.groupCallSession.getSnapshot()
  }

  // ───────────────────────────────────────────────
  // 生命周期
  // ───────────────────────────────────────────────

  async destroy(): Promise<void> {
    if (this.destroyed) return
    this.destroyed = true

    this.imListener.unmount()
    this.singleCallState.reset()
    this.groupCallSession.destroy()

    this.logger.info('[CallKitCore] 已销毁')
  }

  // ───────────────────────────────────────────────
  // 内部：消息处理
  // ───────────────────────────────────────────────

  private isSelfMessage(msg: any): boolean {
    return msg.from === this.userId
  }

  private handleTextMessage(msg: any): void {
    if (this.isSelfMessage(msg)) {
      this.logger.debug('[CallKitCore] 忽略自己发送的文本消息')
      return
    }

    const ext = msg.ext as any
    if (!ext || ext.action !== 'invite') {
      this.logger.debug('[CallKitCore] 忽略非 invite 文本消息')
      return
    }

    const isGroupCall =
      ext.chatType === CALL_TYPE.VIDEO_MULTI ||
      ext.chatType === CALL_TYPE.AUDIO_MULTI ||
      ext.callkitGroupInfo?.groupId

    if (isGroupCall) {
      // 群聊 invite
      const events = this.groupCallHandler.handleInviteTextMessage(msg)
      this.processEvents(events, this.singleCallState.getState())
    } else {
      // 单聊 invite
      this.handleSingleCallInvite(msg, ext)
    }
  }

  private handleSingleCallInvite(msg: any, ext: any): void {
    const callId = ext.callId as string
    const channel = ext.channelName as string
    const callType = ext.type as CALL_TYPE
    const callerDevId = ext.callerDevId as string
    const callerUserId = ext.callerIMName as string
    const calleeUserId = ext.calleeIMName as string

    // 获取 RTC token
    let token = ''
    try {
      const tokenRes = (this.config.imClient as any).getRTCToken?.(channel)
      if (tokenRes && typeof tokenRes.then === 'function') {
        tokenRes.then((res: any) => { token = res.accessToken }).catch(() => {})
      }
    } catch {
      // 同步失败则忽略，token 可能由上层另行获取
    }

    // 状态机初始化
    const stateResult = this.singleCallState.initIncoming({
      callId,
      channel,
      token,
      callType,
      callerDevId,
      callerUserId,
      calleeDevId: this.deviceId,
      calleeUserId,
    })

    // 发出 incomingCall 事件
    const incomingEvent: CallKitEvent = {
      type: 'incomingCall',
      payload: {
        callId,
        callType,
        callerUserId,
        callerDevId,
        channel,
        calleeUserId,
        token,
        callerInfo: ext.ease_chat_uikit_user_info,
      },
    }
    this.emitEvent(incomingEvent)

    // 处理状态机返回的事件（STATUS_CHANGED）
    this.processEvents(stateResult.events, this.singleCallState.getState())
  }

  private handleCmdMessage(msg: any): void {
    if (this.isSelfMessage(msg)) {
      this.logger.debug('[CallKitCore] 忽略自己发送的 CMD 消息')
      return
    }

    const events = this.signalRouter.dispatch(msg)
    if (events.length > 0) {
      this.processEvents(events, this.singleCallState.getState())
    }
  }

  // ───────────────────────────────────────────────
  // 内部：事件处理与映射
  // ───────────────────────────────────────────────

  private processEvents(events: DomainEvent[], snapshot: SingleCallState): void {
    events.forEach((event) => {
      const callKitEvent = this.mapDomainEvent(event, snapshot)
      if (callKitEvent) {
        this.emitEvent(callKitEvent)
      }
    })
  }

  private mapDomainEvent(event: DomainEvent, snapshot: SingleCallState): CallKitEvent | null {
    const base = {
      callId: event.callId,
      channel: snapshot.channel,
      callType: snapshot.type,
      callerUserId: snapshot.callerUserId,
      calleeUserId: snapshot.calleeUserId,
    }

    switch (event.type) {
      case 'STATUS_CHANGED': {
        return {
          type: 'statusChanged',
          payload: {
            ...base,
            from: String(event.from),
            to: String(event.to),
          },
        }
      }

      case 'CALL_STARTED': {
        return {
          type: 'callStarted',
          payload: {
            ...base,
            isCaller: event.isCaller,
            startTime: Date.now(),
          },
        }
      }

      case 'CALL_ENDED': {
        return {
          type: 'callEnded',
          payload: {
            ...base,
            reason: event.reason as any,
            duration: event.duration,
          },
        }
      }

      case 'CALL_TIMEOUT': {
        return {
          type: 'callTimeout',
          payload: base,
        }
      }

      case 'CALL_REFUSED': {
        return {
          type: 'callRefused',
          payload: {
            ...base,
            isRemote: event.isRemote,
          },
        }
      }

      case 'CALL_BUSY': {
        return {
          type: 'callBusy',
          payload: base,
        }
      }

      case 'CALL_CANCELED': {
        return {
          type: 'callCanceled',
          payload: {
            ...base,
            isRemote: event.isRemote,
          },
        }
      }

      case 'SHOULD_JOIN_RTC': {
        return {
          type: 'shouldJoinRtc',
          payload: {
            ...base,
            token: event.token,
            uid: this.userId,
            role: event.role,
          },
        }
      }

      case 'GROUP_CALL_INIT': {
        return {
          type: 'groupCallInit',
          payload: {
            callId: event.callId,
            groupId: event.groupId,
            groupName: event.groupName,
            channel: event.channel,
            callType: event.callType,
            callerUserId: event.callerUserId,
            invitedMembers: event.invitedMembers,
          },
        }
      }

      case 'PARTICIPANT_STATE_CHANGED': {
        return {
          type: 'participantStateChanged',
          payload: {
            callId: event.callId,
            userId: event.userId,
            state: event.state,
            groupId: event.groupId,
          },
        }
      }

      case 'PARTICIPANT_JOINED': {
        return {
          type: 'participantJoined',
          payload: {
            ...base,
            userId: event.userId,
            groupId: event.groupId,
          },
        }
      }

      case 'PARTICIPANT_LEFT': {
        return {
          type: 'participantLeft',
          payload: {
            ...base,
            userId: event.userId,
            reason: event.reason,
            groupId: event.groupId,
          },
        }
      }

      default:
        return null
    }
  }

  private emitEvent(event: CallKitEvent): void {
    try {
      this.config.onEvent(event)
    } catch (err) {
      this.logger.error('[CallKitCore] onEvent 回调执行失败:', err)
    }
  }
}
