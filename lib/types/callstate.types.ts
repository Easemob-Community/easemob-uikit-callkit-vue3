export type CallMode = "audio" | "video" | "group";

export type CALL_STATUS_NAME =
  | "idle"
  | "inviting"
  | "ringing"
  | "connecting"
  | "connected"
  | "ended";

// Call status enum
export enum CALL_STATUS {
  IDLE = 0,
  INVITING = 1,
  ALERTING = 2,
  CONFIRM_RING = 3,
  RECEIVED_CONFIRM_RING = 4,
  ANSWER_CALL = 5,
  CONFIRM_CALLEE = 6,
  IN_CALL = 7,
}
export enum CALLKIT_CMD_MSG_RESULT_TYPE {
  ACCEPT = "accept",
  REFUSE = "refuse",
  BUSY = "busy",
}
export type CALLKIT_ACTION_MSG_TYPE = "rtcCallWithAgora";
export type CALLKIT_TEXT_MSG_ACTION = "invite";

export type CALLKIT_CMD_MSG_ACTION_TYPE =
  | "confirmRing"
  | "alert"
  | "answerCall"
  | "leaveCall"
  | "confirmCallee"
  | "cancelCall";
// Call info interface
export enum CALL_TYPE {
  AUDIO_1V1 = 0, // 一对一语音通话
  VIDEO_1V1 = 1, // 一对一视频通话
  VIDEO_MULTI = 2, // 多人视频通话
  AUDIO_MULTI = 3, // 多人语音通话
}
export interface CALL_INFO {
  callId: string; // Call ID
  channel: string; // channelName
  token?: string; // Internal use
  type: CALL_TYPE; // Call type
  callerDevId: string; // Caller device ID (optional)
  calleeDevId?: string; // Callee device ID (optional)
  callerUserId: string; // Caller user ID
  calleeUserId?: string; // Callee user ID (optional)
  groupId?: string;
  groupName?: string;
  groupAvatar?: string;
  callerNickname?: string; // Caller user nickname (optional)
  invitedMembers?: string[]; // Internal use
  joinedMembers?: any[]; // Internal use
  inviteMessageId?: string; // Invitation message ID
  duration?: string; // Call duration, default 0
  state?: CALL_STATUS; // Call status, default idle
}

//挂断原因枚举
export enum HANGUP_REASON {
  HANGUP = "hangup", // Hang up call
  CANCEL = "cancel", // Cancel call
  REMOTE_CANCEL = "remoteCancel", // Remote cancel call
  REFUSE = "refuse", // Refuse call
  REMOTE_REFUSE = "remoteRefuse", // Remote refuse call
  BUSY = "busy", // Busy
  NO_RESPONSE = "noResponse", // No response (timeout)
  REMOTE_NO_RESPONSE = "remoteNoResponse", // Remote no response
  HANDLE_ON_OTHER_DEVICE = "handleOnOtherDevice", // Handled on other device
  ABNORMAL_END = "abnormalEnd", // Abnormal end
}
