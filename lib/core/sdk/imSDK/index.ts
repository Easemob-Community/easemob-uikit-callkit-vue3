import WebSDK from "easemob-websdk";
import type {
  EasemobChat as Chat,
  EasemobChatStatic as ChatSDKStatic,
} from "easemob-websdk/Easemob-chat";

const ChatSDK = WebSDK as ChatSDKStatic;

export type { Chat, ChatSDKStatic };

export { ChatSDK };
