import type { Chat } from "../core/sdk/imSDK";
import { useChatClientStore } from "../store/chatClient";
import { ChatService } from "../services/ChatService";
import { logger } from "../utils/logger";
import { CALLKIT_CMD_MSG_RESULT_TYPE } from "../types/callstate.types";

export interface UseSignalManagerReturn {
  sendInviteMessage: (
    targetId: string,
    chatType: Chat.ChatType,
    message: string
  ) => Promise<Chat.SendMsgResult>;
  sendAnswerMessage: (targetId: string, payload: any) => Promise<void>;
  sendCancelMessage: (
    to: string,
    chatType: "singleChat" | "groupChat",
    receiverList?: string[]
  ) => Promise<Chat.SendMsgResult>;
  sendBusyAnswerMessage: (
    targetId: string,
    payload: any
  ) => Promise<Chat.SendMsgResult>;
  sendAlertMessage: (targetId: string) => Promise<Chat.SendMsgResult>;
  sendConfirmRingMessage: (
    targetId: string,
    payload: any
  ) => Promise<Chat.SendMsgResult>;
  sendConfirmCalleeMessage: (
    targetId: string,
    payload: any
  ) => Promise<Chat.SendMsgResult>;
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
  /**
   * 发送取消通话邀请的信令
   * @param targetId 目标用户ID
   * @param payload 邀请相关信息
   */
  const sendCancelMessage = async (
    to: string,
    chatType: "singleChat" | "groupChat",
    receiverList?: string[]
  ): Promise<Chat.SendMsgResult> => {
    logger.debug(
      `useSignalManager: 发送取消通话邀请信令，目标ID: ${to}, 聊天类型: ${chatType}`
    );

    if (!client) {
      logger.warn("ChatClient未初始化，请确保在Provider内使用");
      throw new Error("ChatClient未初始化");
    }

    const chatService = new ChatService(client);

    try {
      const result = await chatService.sendSignalMessage(
        to,
        "cancelCall",
        chatType as any,
        {},
        false,
        undefined,
        receiverList
      );
      logger.info(
        `useSignalManager: 发送取消通话邀请信令成功，消息ID: ${result.serverMsgId}`
      );
      return result;
    } catch (error) {
      logger.error(`useSignalManager: 发送取消通话邀请信令失败:`, error);
      throw error;
    }
  };
  /**
   * 发送忙碌拒绝通话邀请的信令
   * @param targetId 目标用户ID
   * @param payload 邀请相关信息
   */
  const sendBusyAnswerMessage = async (
    targetId: string,
    payload: any
  ): Promise<Chat.SendMsgResult> => {
    logger.debug(
      `useSignalManager: 发送忙碌拒绝通话邀请信令，目标ID: ${targetId}`
    );

    if (!client) {
      logger.warn("ChatClient未初始化，请确保在Provider内使用");
      throw new Error("ChatClient未初始化");
    }

    const chatService = new ChatService(client);

    try {
      const result = await chatService.sendSignalMessage(
        targetId,
        "answerCall",
        "singleChat" as any,
        payload,
        true,
        CALLKIT_CMD_MSG_RESULT_TYPE.BUSY
      );
      logger.info(
        `useSignalManager: 发送忙碌拒绝通话邀请信令成功，消息ID: ${result.serverMsgId}`
      );
      return result;
    } catch (error) {
      logger.error(`useSignalManager: 发送忙碌拒绝通话邀请信令失败:`, error);
      throw error;
    }
  };

  /**
   * 发送alerting信令
   * @param targetId 目标用户ID
   */
  const sendAlertMessage = async (
    targetId: string
  ): Promise<Chat.SendMsgResult> => {
    logger.debug(`useSignalManager: 发送alerting信令，目标ID: ${targetId}`);

    if (!client) {
      logger.warn("ChatClient未初始化，请确保在Provider内使用");
      throw new Error("ChatClient未初始化");
    }

    const chatService = new ChatService(client);

    try {
      const result = await chatService.sendSignalMessage(
        targetId,
        "alert",
        "singleChat" as any,
        {},
        true
      );
      logger.info(
        `useSignalManager: 发送alerting信令成功，消息ID: ${result.serverMsgId}`
      );
      return result;
    } catch (error) {
      logger.error(`useSignalManager: 发送alerting信令失败:`, error);
      throw error;
    }
  };

  /**
   * 发送确认响铃信令
   * @param targetId 目标用户ID
   * @param payload 确认响铃相关信息
   */
  const sendConfirmRingMessage = async (
    targetId: string,
    payload: any
  ): Promise<Chat.SendMsgResult> => {
    logger.debug(`useSignalManager: 发送确认响铃信令，目标ID: ${targetId}`);

    if (!client) {
      logger.warn("ChatClient未初始化，请确保在Provider内使用");
      throw new Error("ChatClient未初始化");
    }

    const chatService = new ChatService(client);

    try {
      const result = await chatService.sendSignalMessage(
        targetId,
        "confirmRing",
        "singleChat" as any,
        payload
      );
      logger.info(
        `useSignalManager: 发送确认响铃信令成功，消息ID: ${result.serverMsgId}`
      );
      return result;
    } catch (error) {
      logger.error(`useSignalManager: 发送确认响铃信令失败:`, error);
      throw error;
    }
  };

  /**
   * 发送确认被叫方状态的信令
   * @param targetId 目标用户ID
   * @param payload 确认被叫方相关信息
   */
  const sendConfirmCalleeMessage = async (
    targetId: string,
    payload: any
  ): Promise<Chat.SendMsgResult> => {
    logger.debug(
      `useSignalManager: 发送确认被叫方状态信令，目标ID: ${targetId}`
    );

    if (!client) {
      logger.warn("ChatClient未初始化，请确保在Provider内使用");
      throw new Error("ChatClient未初始化");
    }

    const chatService = new ChatService(client);

    try {
      const result = await chatService.sendSignalMessage(
        targetId,
        "confirmCallee",
        "singleChat" as any,
        payload
      );
      logger.info(
        `useSignalManager: 发送确认被叫方状态信令成功，消息ID: ${result.serverMsgId}`
      );
      return result;
    } catch (error) {
      logger.error(`useSignalManager: 发送确认被叫方状态信令失败:`, error);
      throw error;
    }
  };

  return {
    sendInviteMessage,
    sendAnswerMessage,
    sendCancelMessage,
    sendBusyAnswerMessage,
    sendAlertMessage,
    sendConfirmRingMessage,
    sendConfirmCalleeMessage,
  };
}
