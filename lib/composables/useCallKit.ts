import { inject, ref, computed } from "vue";
import type { Chat } from "../core/sdk/imSDK";
import { useChatClientStore } from "../store/chatClient";
import type { UseCallKitReturn } from "../types";
import { ChatService } from "../services/ChatService";
import { useCallStateStore } from "../store/callState";
import { CALL_STATUS, CALL_TYPE } from "../types/callstate.types";

// 组合式API：useCallKit
export function useCallKit(): UseCallKitReturn {
  const chatClientStore = useChatClientStore();
  const callStateStore = useCallStateStore();
  const startSingleCall = async (
    targetId: string,
    type: "audio" | "video",
    msg: string
  ) => {
    if (!chatClientStore.getChatClient) {
      console.warn("ChatClient未初始化，请确保在Provider内使用");
      return;
    }
    //设置当前通话状态为inviting
    callStateStore.initInviteInfo({
      calleeUserId: targetId,
      type: type === "audio" ? CALL_TYPE.AUDIO_1V1 : CALL_TYPE.VIDEO_1V1,
    });
    const chatClient = chatClientStore.getChatClient as Chat.Connection;
    const chatService = new ChatService(chatClient);
    const message = await chatService.sendTextMessage(
      targetId,
      "singleChat",
      msg
    );
    console.log(">>>>>>>实际开始调用发送邀请信息成功", message);
  };
  const startGroupCall = (
    groupId: string,
    type: "audio" | "video",
    msg: string
  ) => {
    if (!chatClientStore.getChatClient) {
      console.warn("ChatClient未初始化，请确保在Provider内使用");
      return;
    }
    console.log(">>>>>>>实际开始调用发送邀请信息", groupId, type, msg);
  };
  return {
    startSingleCall,
    startGroupCall,
  };
}
