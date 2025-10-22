import type { Chat } from "../core/sdk/imSDK";
import { useChatClientStore } from "../store/chatClient";
import { ChatService } from "../services/ChatService";
import { logger } from "../utils/logger";

export interface UseSignalManagerReturn {
  sendInviteMessage: (
    targetId: string,
    chatType: Chat.ChatType,
    message: string
  ) => Promise<Chat.SendMsgResult>;
  sendAnswerMessage: (targetId: string, payload: any) => Promise<void>;
  sendCancelMessage: (targetId: string, payload: any) => Promise<void>;
}

/**
 * 信令管理器 - 集中处理所有通话信令的发送
 * 职责：
 * 1. 封装信令发送逻辑
 * 2. 提供统一的信令发送接口
 */
export function useSignalManager(): UseSignalManagerReturn {
  const chatClientStore = useChatClientStore();
  const client = chatClientStore.getChatClient as Chat.Connection;
  /**
   * 发送通话邀请消息
   * @param targetId 目标用户ID
   * @param chatType 聊天类型（singleChat/groupChat）
   * @param message 邀请消息内容
   */
  const sendInviteMessage = async (
    targetId: string,
    chatType: Chat.ChatType,
    message: string
  ): Promise<Chat.SendMsgResult> => {
    logger.debug(
      `useSignalManager: 发送通话邀请消息，目标ID: ${targetId}, 聊天类型: ${chatType}`
    );

    if (!client) {
      logger.warn("ChatClient未初始化，请确保在Provider内使用");
      throw new Error("ChatClient未初始化");
    }

    const chatService = new ChatService(client);

    try {
      const result = await chatService.sendTextMessage(
        targetId,
        chatType,
        message
      );
      logger.info(
        `useSignalManager: 发送邀请消息成功，消息ID: ${result.serverMsgId}`
      );
      return result;
    } catch (error) {
      logger.error(`useSignalManager: 发送邀请消息失败:`, error);
      throw error;
    }
  };

  const sendAnswerMessage = async () => {};
  const sendCancelMessage = async () => {};

  return {
    sendInviteMessage,
    sendAnswerMessage,
    sendCancelMessage,
  };
}
