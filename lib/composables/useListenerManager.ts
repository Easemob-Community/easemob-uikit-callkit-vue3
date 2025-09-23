import { useChatClientStore } from "../store/chatClient";
import { useCallStateStore } from "../store/callState";
import { logger } from "../utils/logger";
import type { Chat } from "../core/sdk/imSDK";
import {
  CALL_STATUS,
  CALL_TYPE,
  CALLKIT_CMD_MSG_RESULT_TYPE,
  type CALLKIT_TEXT_MSG_ACTION,
} from "../types/callstate.types";
import { ChatService } from "../services/ChatService";
export interface ListenerManagerReturn {
  mountTextMessageListener: () => void;
  mountSignalListener: () => void;
}

/**
 * 监听器管理器 - 基础架构
 * 负责全局监听，通过Pinia store管理状态
 */
export function useListenerManager(): ListenerManagerReturn {
  // 获取Pinia store实例
  const chatClientStore = useChatClientStore();
  const callStateStore = useCallStateStore();
  /**
   * 处理通话邀请消息
   */
  const handleInvitationMessage = (message: Chat.TextMsgBody) => {
    const client = chatClientStore.getChatClient as Chat.Connection;
    if (!client) {
      logger.warn("ChatClient 未初始化，无法创建 ChatService 实例");
      return;
    }
    logger.info(`开始处理通话邀请，发送方: ${message.from || "未知"}`);
    logger.verbose(`通话邀请详情:`, message.ext || "无扩展信息");
    if (message.from === chatClientStore.getChatClient?.context.jid.name) {
      logger.warn("该条通话邀请文本消息是自己发送的，忽略");
      return; // 忽略自己发送的消息
    }
    const ext = message.ext;
    //校验当前用户的通话状态是否为idle
    if (callStateStore.getCallStatus > CALL_STATUS.IDLE) {
      logger.warn("当前通话状态不是idle，应答拒绝通话邀请");
      const chatService = new ChatService(client);
      if (message.from) {
        const newInvitationInfo = {
          callerUserId: message.from,
          callerDevId: ext?.callerDevId,
          callId: ext?.callId,
        };

        logger.debug(
          "当前通话状态不是idle，应答拒绝通话邀请",
          newInvitationInfo
        );
        chatService
          .sendSignalMessage(
            message.from,
            "answerCall",
            "singleChat",
            newInvitationInfo,
            CALLKIT_CMD_MSG_RESULT_TYPE.BUSY
          )
          .then((res) => {
            logger.info(
              `正在忙碌，拒绝通话邀请成功，消息ID: ${res.serverMsgId}`
            );
            logger.debug(`正在忙碌，拒绝通话邀请详情:`, res.message);
          })
          .catch((err) => {
            logger.error(
              `拒绝通话邀请失败，目标ID: ${message.from}，错误信息: ${err}`
            );
          });
        return;
      }
    }
    //开始更新store中的state属性
    callStateStore.updateCallState({
      callId: ext?.callId,
      channel: ext?.channelName,
      type: ext?.type,
      callerDevId: ext?.callerDevId,
      callerUserId: ext?.callerIMName || message.from,
      calleeUserId:
        ext?.type === CALL_TYPE.VIDEO_MULTI ? ext?.groupId : message.to,
      groupId: ext?.callkitGroupInfo?.groupId,
      groupName: ext?.callkitGroupInfo?.groupName,
      groupAvatar: ext?.callkitGroupInfo?.groupAvatar,
      inviteMessageId: message.id,
    });
    logger.info("通话邀请已更新至store", callStateStore.getCallState);
  };
  /**
   * 处理消息体内的用户属性
   *
   */
  const handleUserAttributes = (message: Chat.TextMsgBody) => {
    const userAttributes = message.ext?.ease_chat_uikit_user_info;
    if (!userAttributes) {
      logger.warn("消息体中无用户属性");
      return;
    }
    const callerName = userAttributes?.nickname || message.from;
    const callerAvatar = userAttributes?.avatarURL || "";
    const callerUserId = message.from as string;
    //更新store中的userInfoMap
    callStateStore.setUserInfo(callerUserId, {
      nickname: callerName,
      avatarURL: callerAvatar,
    });
    logger.info(`用户属性已更新至store，用户ID: ${callerUserId}`);
    logger.debug(`用户属性详情:`, userAttributes);
  };
  //注册文本消息监听
  const mountTextMessageListener = () => {
    logger.info("正在挂载文本消息监听器");

    const client = chatClientStore.getChatClient;
    if (!client) {
      logger.warn("ChatClient未初始化，无法挂载文本消息监听器");
      return;
    }

    try {
      client.addEventHandler("onTextMessage", {
        onTextMessage: (message) => {
          logger.info(`收到文本消息，发送方: ${message.from || "未知"}`);
          logger.verbose(`文本消息详情:`, message);
          if (message.ext && message.ext.action === "invite") {
            handleInvitationMessage(message);
            handleUserAttributes(message);
          }
        },
      });
      logger.debug("文本消息监听器挂载成功");
    } catch (error) {
      logger.error("挂载文本消息监听器失败:", error);
    }
  };
  //注册信令监听
  const mountSignalListener = () => {
    logger.info("正在挂载信令消息监听器");

    const client = chatClientStore.getChatClient;
    if (!client) {
      logger.warn("ChatClient未初始化，无法挂载信令消息监听器");
      return;
    }

    try {
      client.addEventHandler("onSignalMessage", {
        onCmdMessage(message) {
          // 安全地访问信令消息的属性
          const from = message.from || "未知";
          logger.info(`收到信令消息，发送方: ${from}`);

          // 尝试从不同可能的字段获取消息类型信息
          let messageType = "未知";
          if (typeof message === "object" && message !== null) {
            messageType = message.ext?.action || message.action || "未知";
          }
          logger.debug(`信令消息类型: ${messageType}`);
          logger.verbose(`信令消息详情:`, message);
        },
      });
      logger.debug("信令消息监听器挂载成功");
    } catch (error) {
      logger.error("挂载信令消息监听器失败:", error);
    }
  };

  return {
    mountTextMessageListener,
    mountSignalListener,
  };
}
