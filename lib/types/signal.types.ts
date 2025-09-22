// 邀请类型的文本消息接口定义
export interface SignalMessageInviteExt {
  // 基本信息
  action: "invite"; // 固定为'invite'
  callId: string;
  calleeIMName: string;
  callerDevId: string;
  callerIMName: string;
  channelName: string;
  chatType: 0 | 1 | 2;
  type: 0; // 从示例看是固定值
  ts: number; // 时间戳
  msgType: "rtcCallWithAgora"; // 从示例看是固定值

  // 推送扩展信息
  em_push_ext: {
    type: "call"; // 固定为'call'
    custom: {
      action: "invite";
      channelName: string;
      type: 0;
      callerDevId: string;
      callId: string;
      ts: number;
      msgType: "rtcCallWithAgora";
      callerIMName: string;
      calleeIMName: string;
      callerNickname: string;
      chatType: 0 | 1 | 2;
    };
  };

  // APNS推送扩展
  em_apns_ext: {
    em_push_type: "voip"; // 固定为'voip'
  };

  // 用户信息，可选字段
  ease_chat_uikit_user_info?: {
    nickname: string;
    avatarURL: string;
  };
}
