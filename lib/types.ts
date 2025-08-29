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
  initConfig: {
    chatClient: any;
    userId?: string;
    accessToken?: string;
    debug?: boolean;
  };
  enableRingtone?: boolean;
  resizable?: boolean;
  draggable?: boolean;
}

// 导出类型别名，避免导入错误
export type EasemobChatCallKitInstance = CallKitInstance;
