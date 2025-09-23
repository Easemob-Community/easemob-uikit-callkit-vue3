import { inject, ref, computed } from "vue";
import type { Chat } from "../core/sdk/imSDK";
import { useChatClientStore } from "../store/chatClient";
import type { UseCallKitReturn } from "../types";
import { ChatService } from "../services/ChatService";
import { useCallStateStore } from "../store/callState";
import { CALL_STATUS, CALL_TYPE } from "../types/callstate.types";
import { logger } from "../utils/logger";

// 组合式API：useCallKit
export function useCallKit(): UseCallKitReturn {
  const chatClientStore = useChatClientStore();
  const callStateStore = useCallStateStore();
  const startSingleCall = async (
    targetId: string,
    type: "audio" | "video",
    msg: string
  ) => {
    logger.debug(
      `startSingleCall: 开始发起单人${type}通话，目标用户ID: ${targetId}`
    );

    if (!chatClientStore.getChatClient) {
      logger.warn("ChatClient未初始化，请确保在Provider内使用");
      return;
    }

    //设置当前通话状态为inviting
    callStateStore.initInviteInfo({
      calleeUserId: targetId,
      type: type === "audio" ? CALL_TYPE.AUDIO_1V1 : CALL_TYPE.VIDEO_1V1,
    });

    logger.verbose(`startSingleCall: 已初始化邀请信息，通话类型: ${type}`);

    const chatClient = chatClientStore.getChatClient as Chat.Connection;
    const chatService = new ChatService(chatClient);

    try {
      const message = await chatService.sendTextMessage(
        targetId,
        "singleChat",
        msg
      );
      logger.info(
        `startSingleCall: 发送单人通话邀请信息成功，消息ID: ${message.serverMsgId}`
      );
      logger.verbose(`startSingleCall: 邀请消息详情:`, message);
    } catch (error) {
      logger.error(`startSingleCall: 发送单人通话邀请信息失败:`, error);
    }
  };
  const startGroupCall = (
    groupId: string,
    type: "audio" | "video",
    msg: string
  ) => {
    logger.debug(`startGroupCall: 开始发起群组${type}通话，群组ID: ${groupId}`);

    if (!chatClientStore.getChatClient) {
      logger.warn("ChatClient未初始化，请确保在Provider内使用");
      return;
    }

    try {
      //设置当前通话状态为inviting
      callStateStore.initInviteInfo({
        calleeUserId: groupId,
        type: type === "audio" ? CALL_TYPE.AUDIO_MULTI : CALL_TYPE.VIDEO_MULTI,
      });

      logger.verbose(`startGroupCall: 已初始化群组邀请信息，通话类型: ${type}`);
      logger.info(`startGroupCall: 准备发送群组通话邀请信息`);

      // 注意：实际的群组通话邀请发送逻辑可能需要不同的实现
      // 这里只是将原有的console.log替换为logger
      logger.verbose(
        `startGroupCall: 群组通话邀请信息 - 群组ID: ${groupId}, 类型: ${type}, 消息: ${msg}`
      );
    } catch (error) {
      logger.error(`startGroupCall: 群组通话初始化失败:`, error);
    }
  };
  return {
    startSingleCall,
    startGroupCall,
  };
}
