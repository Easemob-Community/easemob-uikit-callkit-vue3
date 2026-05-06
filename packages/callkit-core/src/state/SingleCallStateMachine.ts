import { CALL_STATUS, CALL_TYPE } from '../types/callstate.types'
import type { Logger } from '../utils/logger'
import { getLogger } from '../utils/logger'

/**
 * 单聊通话状态
 */
export interface SingleCallState {
  status: CALL_STATUS
  callId: string
  channel: string
  token: string
  type: CALL_TYPE
  callerDevId: string
  calleeDevId: string
  callerUserId: string
  calleeUserId: string
  inviteTimeout: number
  inviteTimeoutTimer: ReturnType<typeof setTimeout> | null
  startTime: number | null
}

/**
 * 单聊状态机
 *
 * 职责：
 * 1. 管理 IDLE → INVITING → ALERTING → RECEIVED_CONFIRM_RING → IN_CALL 的状态流转
 * 2. 校验 callId、deviceId、多端冲突
 * 3. 管理邀请超时定时器
 *
 * 不执行任何副作用（不发消息、不 join RTC），只返回状态变更事件。
 */
export class SingleCallStateMachine {
  private state: SingleCallState = {
    status: CALL_STATUS.IDLE,
    callId: '',
    channel: '',
    token: '',
    type: CALL_TYPE.AUDIO_1V1,
    callerDevId: '',
    calleeDevId: '',
    callerUserId: '',
    calleeUserId: '',
    inviteTimeout: 30000,
    inviteTimeoutTimer: null,
    startTime: null,
  }

  private logger: Logger

  constructor(logger?: Logger) {
    this.logger = logger || getLogger()
  }

  /**
   * 获取当前状态快照
   */
  getState(): Readonly<SingleCallState> {
    return Object.freeze({ ...this.state })
  }

  /**
   * 初始化主叫方邀请状态
   */
  initInvite(params: {
    calleeUserId: string
    type: CALL_TYPE
    callerDevId: string
    callerUserId: string
    callId: string
    channel: string
    token: string
    timeout?: number
  }): void {
    this.clearTimeout()
    this.state = {
      ...this.state,
      status: CALL_STATUS.INVITING,
      calleeUserId: params.calleeUserId,
      type: params.type,
      callerDevId: params.callerDevId,
      callerUserId: params.callerUserId,
      callId: params.callId,
      channel: params.channel,
      token: params.token,
      inviteTimeout: params.timeout ?? 30000,
      startTime: null,
    }
    this.logger.stateChange?.('IDLE', 'INVITING', { callId: params.callId, channel: params.channel })
    this.startTimeout()
  }

  /**
   * 被叫方收到 invite，初始化响铃状态
   */
  initIncoming(params: {
    callId: string
    channel: string
    token: string
    type: CALL_TYPE
    callerDevId: string
    callerUserId: string
    calleeDevId: string
    calleeUserId: string
  }): void {
    this.clearTimeout()
    this.state = {
      ...this.state,
      status: CALL_STATUS.ALERTING,
      ...params,
      inviteTimeout: 30000,
      inviteTimeoutTimer: null,
      startTime: null,
    }
    this.logger.stateChange?.('IDLE', 'ALERTING', { callId: params.callId, caller: params.callerUserId })
    this.startTimeout()
  }

  /**
   * 状态流转
   * 返回是否允许流转
   */
  transitionTo(status: CALL_STATUS): boolean {
    const oldStatus = this.state.status
    if (oldStatus === status) return false

    // TODO: Phase 1 - 补充完整的合法流转校验表
    this.state.status = status
    this.logger.stateChange?.(oldStatus, status, { callId: this.state.callId })
    return true
  }

  /**
   * 设置 calleeDevId（被叫方响铃后收到 alert 时）
   */
  setCalleeDevId(devId: string): void {
    this.state.calleeDevId = devId
  }

  /**
   * 重置状态机为 IDLE
   */
  reset(): void {
    this.clearTimeout()
    const oldStatus = this.state.status
    this.state.status = CALL_STATUS.IDLE
    this.state.callId = ''
    this.state.channel = ''
    this.state.calleeUserId = ''
    this.state.calleeDevId = ''
    this.state.startTime = null
    this.logger.stateChange?.(oldStatus, 'IDLE', { trigger: 'reset' })
  }

  /**
   * 设置通话开始时间（进入 IN_CALL 时）
   */
  setStartTime(): void {
    this.state.startTime = Date.now()
  }

  /**
   * 计算通话时长（秒）
   */
  getDuration(): number {
    if (!this.state.startTime) return 0
    return Math.floor((Date.now() - this.state.startTime) / 1000)
  }

  // ─── 私有方法 ───

  private startTimeout(): void {
    this.clearTimeout()
    this.state.inviteTimeoutTimer = setTimeout(() => {
      this.logger.warn('[SingleCallStateMachine] 邀请超时', { callId: this.state.callId })
      if (this.state.status !== CALL_STATUS.IDLE && this.state.status !== CALL_STATUS.IN_CALL) {
        this.reset()
      }
    }, this.state.inviteTimeout)
  }

  private clearTimeout(): void {
    if (this.state.inviteTimeoutTimer) {
      clearTimeout(this.state.inviteTimeoutTimer)
      this.state.inviteTimeoutTimer = null
    }
  }
}
