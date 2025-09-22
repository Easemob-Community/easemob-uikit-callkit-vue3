export type CallMode = "audio" | "video" | "group";

export type CallStatus =
  | "idle"
  | "inviting"
  | "ringing"
  | "connecting"
  | "connected"
  | "ended";

// Call type enum
export enum CALL_TYPE {
  AUDIO_1V1 = 0,
  VIDEO_1V1 = 1,
  VIDEO_MULTI = 2,
  AUDIO_MULTI = 3,
}

export type EXT_MSG_TYPE = "rtcCallWithAgora";

export type EXT_MSG_ACTION =
  | "confirmRing"
  | "alert"
  | "answerCall"
  | "leaveCall"
  | "confirmCallee";
