// Store相关类型定义
import type { Chat } from "../core/sdk/imSDK";
import type {
  CALL_STATUS,
  CALL_INFO,
  CALL_TYPE,
} from "../types/callstate.types";
export type CallStatus = CALL_STATUS;
export interface ChatClientState {
  client: Chat.Connection | null;
}
// export interface CallParticipant {
//   userId: string;
//   nickname?: string;
//   avatar?: string;
//   isAudioEnabled: boolean;
//   isVideoEnabled: boolean;
//   isLocalUser: boolean;
//   joinedAt: number;
// }

// export interface CurrentCallInfo {
//   callId: string;
//   callerId: string;
//   calleeIds: string[];
//   callType: "audio" | "video";
//   startTime: number;
//   duration: number;
//   status: CallStatus;
//   participants: CallParticipant[];
//   isGroupCall: boolean;
//   channelId?: string;
// }
export interface INVITE_INFO {
  type: CALL_TYPE;
  calleeUserId: string;
  groupId?: string;
  groupName?: string;
  groupAvatar?: string;
}
export interface CallState extends CALL_INFO {
  // 基础状态
  status: CallStatus;
  callType: "audio" | "video" | null;
  //超时时间，单位ms，默认30s
  inviteTimeout?: number;
  //超时定时器
  inviteTimeoutTimer?: NodeJS.Timeout | null;
}

// RTC频道状态类型
export interface RtcChannelState {
  channels: Record<string, RtcChannelInfo>;
  activeChannelId: string | null;
  isConnected: boolean;
  localStream: MediaStream | null;
  remoteStreams: Record<string, MediaStream>;
  audioEnabled: boolean;
  videoEnabled: boolean;
}

// RTC频道信息类型
export interface RtcChannelInfo {
  channelId: string;
  callId: string;
  participants: string[];
  joinTime: number;
  lastActiveTime: number;
  isGroup: boolean;
}
