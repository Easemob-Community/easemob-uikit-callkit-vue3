import type { CALL_TYPE } from '../types/callstate.types'

// ────────────────────────────────────────────────
// 基础事件结构
// ────────────────────────────────────────────────

export interface BaseEvent {
  callId: string
  channel: string
  callType: CALL_TYPE
  callerUserId: string
  calleeUserId?: string
  groupId?: string
}

// ────────────────────────────────────────────────
// 通话生命周期事件
// ────────────────────────────────────────────────

export interface IncomingCallEvent {
  type: 'incomingCall'
  payload: {
    callId: string
    callType: CALL_TYPE
    callerUserId: string
    callerDevId: string
    channel: string
    calleeUserId: string
    token?: string
    groupId?: string
    groupName?: string
    invitedMembers?: string[]
    callerInfo?: { nickname?: string; avatarURL?: string }
  }
}

export interface CallStartedEvent {
  type: 'callStarted'
  payload: BaseEvent & {
    isCaller: boolean
    startTime: number
  }
}

export interface CallEndedEvent {
  type: 'callEnded'
  payload: BaseEvent & {
    reason: 'hangup' | 'cancel' | 'refuse' | 'busy' | 'timeout' | 'remoteHangup' | 'remoteCancel'
    duration?: number
  }
}

export interface CallTimeoutEvent {
  type: 'callTimeout'
  payload: BaseEvent
}

// ────────────────────────────────────────────────
// 单聊特定事件
// ────────────────────────────────────────────────

export interface StatusChangedEvent {
  type: 'statusChanged'
  payload: BaseEvent & {
    from: string
    to: string
  }
}

export interface CallRefusedEvent {
  type: 'callRefused'
  payload: BaseEvent & { isRemote: boolean }
}

export interface CallBusyEvent {
  type: 'callBusy'
  payload: BaseEvent
}

export interface CallCanceledEvent {
  type: 'callCanceled'
  payload: BaseEvent & { isRemote: boolean }
}

// ────────────────────────────────────────────────
// RTC 指令事件
// ────────────────────────────────────────────────

export interface ShouldJoinRtcEvent {
  type: 'shouldJoinRtc'
  payload: BaseEvent & {
    token: string
    uid: number | string
    role: 'caller' | 'callee'
  }
}

export interface ShouldLeaveRtcEvent {
  type: 'shouldLeaveRtc'
  payload: BaseEvent & {
    reason: string
  }
}

export interface ShouldPublishTracksEvent {
  type: 'shouldPublishTracks'
  payload: BaseEvent & {
    trackTypes: ('audio' | 'video')[]
  }
}

// ────────────────────────────────────────────────
// 群聊特定事件
// ────────────────────────────────────────────────

export interface GroupCallInitEvent {
  type: 'groupCallInit'
  payload: {
    callId: string
    groupId: string
    groupName: string
    channel: string
    callType: 'audio' | 'video'
    callerUserId: string
    invitedMembers: string[]
  }
}

export interface ParticipantStateChangedEvent {
  type: 'participantStateChanged'
  payload: {
    callId: string
    userId: string
    state: 'invited' | 'accepted' | 'joinedRtc' | 'left'
    groupId?: string
  }
}

export interface ParticipantJoinedEvent {
  type: 'participantJoined'
  payload: BaseEvent & {
    userId: string
    groupId?: string
  }
}

export interface ParticipantLeftEvent {
  type: 'participantLeft'
  payload: BaseEvent & {
    userId: string
    reason: string
    groupId?: string
  }
}

// ────────────────────────────────────────────────
// 媒体状态事件
// ────────────────────────────────────────────────

export interface LocalAudioChangedEvent {
  type: 'localAudioChanged'
  payload: { enabled: boolean }
}

export interface LocalVideoChangedEvent {
  type: 'localVideoChanged'
  payload: { enabled: boolean }
}

// ────────────────────────────────────────────────
// RTC 上报事件（由 reportRtcEvent 触发）
// ────────────────────────────────────────────────

export interface RtcReportEvent {
  type: 'rtcReport'
  payload: {
    type: string
    payload: Record<string, any>
  }
}

// ────────────────────────────────────────────────
// 联合类型
// ────────────────────────────────────────────────

export type UIEvent =
  | IncomingCallEvent
  | CallStartedEvent
  | CallEndedEvent
  | CallTimeoutEvent
  | StatusChangedEvent
  | CallRefusedEvent
  | CallBusyEvent
  | CallCanceledEvent
  | GroupCallInitEvent
  | ParticipantStateChangedEvent
  | ParticipantJoinedEvent
  | ParticipantLeftEvent
  | RtcReportEvent

export type RtcEvent =
  | ShouldJoinRtcEvent
  | ShouldLeaveRtcEvent
  | ShouldPublishTracksEvent
  | LocalAudioChangedEvent
  | LocalVideoChangedEvent

export type CallKitEvent = UIEvent | RtcEvent

// ────────────────────────────────────────────────
// 类型守卫（帮助按来源分发事件）
// ────────────────────────────────────────────────

const rtcEventTypes: Set<CallKitEvent['type']> = new Set([
  'shouldJoinRtc',
  'shouldLeaveRtc',
  'shouldPublishTracks',
  'localAudioChanged',
  'localVideoChanged',
])

const uiEventTypes: Set<CallKitEvent['type']> = new Set([
  'incomingCall',
  'callStarted',
  'callEnded',
  'callTimeout',
  'statusChanged',
  'callRefused',
  'callBusy',
  'callCanceled',
  'groupCallInit',
  'participantStateChanged',
  'participantJoined',
  'participantLeft',
  'rtcReport',
])

export function isUIEvent(event: CallKitEvent): event is UIEvent {
  return !rtcEventTypes.has(event.type)
}

export function isRtcEvent(event: CallKitEvent): event is RtcEvent {
  return rtcEventTypes.has(event.type)
}
