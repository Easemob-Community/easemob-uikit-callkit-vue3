import type { CALL_TYPE } from '../types/callstate.types'
import type { CallKitEvent } from '../events/CallKitEvents'
import type { RtcAdapter } from '../rtc/RtcAdapter'
import type { Logger } from '../utils/logger'

// ────────────────────────────────────────────────
// 环信 IM SDK 类型（核心库内部使用，不暴露具体 SDK）
// ────────────────────────────────────────────────

export interface EasemobConnection {
  user: string
  context: {
    userId: string
    jid: { clientResource: string }
  }
  token: string
  send: (msg: any) => Promise<any>
  addEventHandler: (id: string, handlers: Record<string, (...args: any[]) => void>) => void
  removeEventHandler: (id: string) => void
  getRTCToken: (channel: string) => Promise<{ accessToken: string; appId: string }>
  getUserIdByRTCUIds: (uids: (number | string)[]) => Promise<{ data: Record<string, string> }>
}

// ────────────────────────────────────────────────
// 核心库配置
// ────────────────────────────────────────────────

export interface CallKitCoreConfig {
  /** 环信 IM 客户端实例 */
  imClient: EasemobConnection
  /** 当前用户资料 */
  userProfile?: {
    userId: string
    nickname?: string
    avatarURL?: string
  }
  /** RTC 适配器（可选） */
  rtcAdapter?: RtcAdapter
  /** 全局事件回调 */
  onEvent: (event: CallKitEvent) => void
  /** 邀请超时时间（毫秒），默认 30000 */
  inviteTimeout?: number
  /** 自定义日志器（可选） */
  logger?: Logger
}

// ────────────────────────────────────────────────
// API 参数
// ────────────────────────────────────────────────

export interface InviteCallParams {
  calleeUserId: string
  callType: CALL_TYPE
  ext?: Record<string, any>
}

export interface AnswerCallParams {
  callId: string
  accept: boolean
}

export interface HangupParams {
  callId?: string
  reason?: 'normal' | 'cancel' | 'timeout'
}

export interface InviteGroupCallParams {
  groupId: string
  participantIds: string[]
  callType: CALL_TYPE
  ext?: Record<string, any>
}

// ────────────────────────────────────────────────
// RTC 上报
// ────────────────────────────────────────────────

export interface RtcReport {
  type: 'rtcJoined' | 'rtcLeft' | 'userJoined' | 'userLeft' | 'userPublished' | 'userUnpublished'
  payload: {
    userId?: string
    uid?: string | number
    mediaType?: 'audio' | 'video'
    track?: any
  }
}
