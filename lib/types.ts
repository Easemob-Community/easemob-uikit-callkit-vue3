import type { Chat } from "./core/sdk/imSDK";
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
  chatClient: Chat.Connection;
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
  ) => void;
  startGroupCall: (
    groupId: string,
    type: "audio" | "video",
    msg: string
  ) => void;
}
