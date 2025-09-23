import { CALL_TYPE, CALLKIT_ACTION_MSG_TYPE } from "./callstate.types";
// 邀请类型的文本消息接口定义
export interface SignalMessageInviteExt {
  // 基本信息
  action: "invite"; // 固定为'invite'
  callId: string;
  calleeIMName: string;
  callerDevId: string;
  callerIMName: string;
  channelName: string;
  chatType: CALL_TYPE;
  type: CALL_TYPE; // 从示例看是固定值
  ts: number; // 时间戳
  msgType: CALLKIT_ACTION_MSG_TYPE; // 从示例看是固定值

  // 推送扩展信息
  em_push_ext: {
    type: "call"; // 固定为'call'
    custom: {
      action: "invite";
      channelName: string;
      type: CALL_TYPE;
      callerDevId: string;
      callId: string;
      ts: number;
      msgType: CALLKIT_ACTION_MSG_TYPE;
      callerIMName: string;
      calleeIMName: string;
      callerNickname: string;
      chatType: CALL_TYPE;
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
