import { inject, ref, computed } from "vue";
import type { Chat } from "../core/sdk/imSDK";
import { useChatClientStore } from "../store/chatClient";
import type { UseCallKitReturn } from "../types";
import { ChatService } from "../services/ChatService";

// 组合式API：useCallKit
export function useCallKit(): UseCallKitReturn {
  const chatClientStore = useChatClientStore();
  const startSingleCall = async (
    targetId: string,
    type: "audio" | "video",
    msg: string
  ) => {
    if (!chatClientStore.getChatClient) {
      console.warn("ChatClient未初始化，请确保在Provider内使用");
      return;
    }
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
