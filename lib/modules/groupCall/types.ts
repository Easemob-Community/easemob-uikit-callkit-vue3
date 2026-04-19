/**
 * 群组通话新模块 - 核心类型定义
 * 设计原则：单一事实源，UI 只做纯渲染，状态驱动媒体
 */

import type { IRemoteVideoTrack, IRemoteAudioTrack, ICameraVideoTrack } from 'agora-rtc-sdk-ng'

/** 参与者生命周期状态 */
export type ParticipantState =
  | 'invited'      // 已发送邀请，等待 answer
  | 'accepted'     // 对方已 answer（被叫方接听/主叫方收到 answer）
  | 'joinedRtc'    // Agora user-joined 已触发，已建立 uid 映射
  | 'publishing'   // 至少发布了 audio 或 video 中的一种
  | 'left'         // 明确离开（user-left 或收到挂断/拒绝信令）

/** 单个参与者（UI 和媒体层的唯一事实源） */
export interface Participant {
  userId: string
  nickname: string
  avatarUrl?: string
  state: ParticipantState
  isLocal: boolean

  // RTC 轨道（由 RtcMediaBridge 写入，UI 只读）
  videoTrack: ICameraVideoTrack | IRemoteVideoTrack | null
  audioTrack: IRemoteAudioTrack | null
  localStream: MediaStream | null   // 仅 isLocal = true 时有值

  // Agora uid（仅远程用户，建立映射后填充）
  uid?: string

  // UI 派生状态
  isMuted: boolean
  isCameraOn: boolean
  isSpeaking: boolean

  // 时间戳
  invitedAt: number
  joinedAt?: number
}

/** 群组通话整体状态 */
export interface GroupCallSessionState {
  sessionId: string        // 通常等于 channelName
  groupId: string
  groupName?: string
  callType: 'video' | 'audio'
  isActive: boolean        // 是否正在通话中
  startTime: number        // 接通时间戳
}

/** uid -> userId 解析结果 */
export interface UidResolution {
  userId: string | null
  confidence: 'certain' | 'inferred' | 'unknown'
}
