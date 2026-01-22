import type { Chat } from "./core/sdk/imSDK";
import type { HANGUP_REASON } from "./types/callstate.types";
export interface EasemobChatCallKitOptions {
  // 基础配置
  appKey: string;
  userId?: string;
  accessToken?: string;
  debug?: boolean;

  // 功能配置
  enableRingtone?: boolean;
  resizable?: boolean;
  draggable?: boolean;

  // 环信客户端
  chatClient?: any;
}

export interface CallKitInstance {
  // 通话相关
  startCall: (targetId: string, type: "audio" | "video") => void;
  endCall: () => void;

  // 聊天相关
  startChat: (targetId: string) => void;

  // 状态
  isInCall: boolean;
  callType: "audio" | "video" | null;
  targetUser: string;

  // 配置
  config: any;
}

export interface ProviderConfig {
  chatClient?: Chat.Connection; // 可选，支持延迟初始化
  agoraAppId?: string; // [已废弃] Agora AppId 将从环信服务器动态获取，此参数仅用于向后兼容
  initConfig?: {
    debug?: boolean; // 开启调试模式
    enableRingtone?: boolean; // 开启铃声
    resizable?: boolean; // 开启可调整大小
    draggable?: boolean; // 开启可拖动
    inviteTimeout?: number; // 邀请超时时间，单位毫秒，默认 30000 毫秒
  };
}

// 导出类型别名，避免导入错误
export type EasemobChatCallKitInstance = CallKitInstance;

export interface UseCallKitReturn {
  startSingleCall: (
    targetId: string,
    type: "audio" | "video",
    msg: string
  ) => Promise<void>;
  startGroupCall: (
    groupId: string,
    members: string[],
    type: "audio" | "video",
    msg: string,
    groupName?: string,
    groupAvatar?: string
  ) => Promise<void>;
}

// useEndCall 返回类型
export interface UseEndCallReturn {
  // 核心挂断方法
  hangup: (reason?: HANGUP_REASON) => Promise<void>;
  hangupCall: () => Promise<void>;
  cancelCall: () => Promise<void>;
  handleRemoteCancel: () => Promise<void>;
  handleRemoteRefuse: () => Promise<void>;
  handleAbnormalEnd: () => Promise<void>;
  
  // 状态检查方法
  canHangup: () => boolean;
  canCancel: () => boolean;
}

// useAnswerCall 返回类型
export interface UseAnswerCallReturn {
  // 接受通话
  acceptCall: () => Promise<void>;
  // 拒绝通话
  rejectCall: () => Promise<void>;
  // 忙碌拒绝通话
  busyRejectCall: () => Promise<void>;
}
