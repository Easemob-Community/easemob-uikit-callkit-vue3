// Store相关类型定义
import type { Chat } from "../core/sdk/imSDK";

export type CallStatus =
  | "idle"
  | "inviting"
  | "ringing"
  | "connecting"
  | "connected"
  | "ended";
export interface ChatClientState {
  client: Chat.Connection | null;
}
export interface CallParticipant {
  userId: string;
  nickname?: string;
  avatar?: string;
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  isLocalUser: boolean;
  joinedAt: number;
}

export interface CurrentCallInfo {
  callId: string;
  callerId: string;
  calleeIds: string[];
  callType: "audio" | "video";
  startTime: number;
  duration: number;
  status: CallStatus;
  participants: CallParticipant[];
  isGroupCall: boolean;
  channelId?: string;
}

export interface CallState {
  // 基础状态
  status: CallStatus;
  isInCall: boolean;
  callType: "audio" | "video" | null;

  // 当前通话信息
  currentCall: CurrentCallInfo | null;

  // 来电信息
  incomingCall: {
    callId: string;
    callerId: string;
    callType: "audio" | "video";
    timestamp: number;
  } | null;

  // 通话设置
  settings: {
    enableAudio: boolean;
    enableVideo: boolean;
    enableSpeaker: boolean;
    enableMicrophone: boolean;
  };
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
