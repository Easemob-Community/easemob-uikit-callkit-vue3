import { useChatClientStore } from "../store/chatClient";
import { useCallStateStore } from "../store/callState";
import { logger } from "../utils/logger";
import type { Chat } from "../core/sdk/imSDK";
import {
  CALL_STATUS,
  CALL_TYPE,
  CALLKIT_CMD_MSG_RESULT_TYPE,
  HANGUP_REASON,
  type CALLKIT_TEXT_MSG_ACTION,
  type CALLKIT_CMD_MSG_ACTION_TYPE,
} from "../types/callstate.types";
import { ChatService } from "../services/ChatService";
import type { SignalingExt } from "../types/signal.types";

// 定义CmdMsgBody接口以替代不存在的Chat.CmdMsgBody
export interface CmdMsgBody {
  from?: string;
  to?: string;
  id?: string;
  action?: string;
  ext?: SignalingExt & { [key: string]: any };
  [key: string]: any;
}

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
  const client = chatClientStore.getChatClient as Chat.Connection;
  const chatService = new ChatService(client);
  /**
   * 处理通话邀请消息
   */
  const handleInvitationMessage = (message: Chat.TextMsgBody) => {
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
    const chatService = new ChatService(client);
    //校验当前用户的通话状态是否为idle
    if (callStateStore.getCallStatus > CALL_STATUS.IDLE) {
      logger.warn("当前通话状态不是idle，应答拒绝通话邀请");

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
            true,
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
    //发送alerting 信令
    chatService
      .sendSignalMessage(
        message.from as string,
        "alert",
        "singleChat",
        {},
        true
      )
      .then((res) => {
        logger.info(`发送alerting 信令成功，消息ID: ${res.serverMsgId}`);
        logger.debug(`发送alerting 信令详情:`, res.message);
      })
      .catch((err) => {
        logger.error(
          `发送alerting 信令失败，目标ID: ${message.from}，错误信息: ${err}`
        );
      });
    callStateStore.setCallStatus(CALL_STATUS.ALERTING);
    logger.info(`通话状态已更新至ALERTING`);
    //设置超时计时器
    callStateStore.startTimeoutTimer(() => {
      logger.warn("callee timeout,hangup call,reason:NO_RESPONSE");
      //TODO 发布hangup事件 reason:REMOTE_NO_RESPONSE
    });
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
  /**
   * 处理接受到的信令消息
   */
  const handleSignalMessage = (message: CmdMsgBody) => {
    const ext = message.ext;
    if (!ext) {
      logger.warn("信令消息体中无扩展信息");
      return;
    }
    logger.info(`收到信令消息，发送方: ${message.from || "未知"}`);
    logger.debug(`信令消息详情:`, ext);
    switch (ext.action as CALLKIT_CMD_MSG_ACTION_TYPE) {
      case "alert":
        handleAlertSignalMessage(message);
        break;
      //处理确认响铃信令消息
      case "confirmRing":
        handleConfirmRingSignalMessage(message);
        break;
      case "answerCall":
        handleAnswerCallMessage(message);
        break;
      case "confirmCallee":
        break;
      case "cancelCall":
        break;
      case "leaveCall":
        break;
      default:
        logger.warn(`未知信令消息类型: ${ext.action}`);
        break;
    }
  };
  /**
   * 处理alert信令消息
   * @param message 收到的alert信令消息
   * @description 处理来电提醒信令消息（场景为：收到alert信令消息后，整体判定状态暂无任何问题即向对方发送confirmRing信令）
   */
  const handleAlertSignalMessage = (message: CmdMsgBody) => {
    const ext = message.ext;
    if (!ext) {
      logger.warn("信令消息体中无扩展信息");
      return;
    }
    logger.info(`收到alert信令消息，发送方: ${message.from || "未知"}`);
    logger.debug(`alert信令消息详情:`, ext);
    if (callStateStore.getInviteTimeoutTimer) {
      callStateStore.clearTimeoutTimer();
    }
    //发送确认响铃信令消息
    const confirmRingSignalMessage = buildConfirmRingSignalMessage(message);

    logger.debug(`确认响铃信令消息详情:`, confirmRingSignalMessage);
    if (confirmRingSignalMessage) {
      chatService
        .sendSignalMessage(
          confirmRingSignalMessage.to as string,
          confirmRingSignalMessage.action as CALLKIT_CMD_MSG_ACTION_TYPE,
          "singleChat",
          confirmRingSignalMessage.ext
        )
        .then((res) => {
          logger.info(`发送确认响铃信令成功，消息ID: ${res.serverMsgId}`);
          logger.debug(`发送确认响铃信令详情:`, res.message);
          //对方弹出邀请后，如超出设定则执行自定挂断
          if (callStateStore.type !== CALL_TYPE.VIDEO_MULTI) {
            callStateStore.startTimeoutTimer(() => {
              logger.info(`确认响铃信令超时，通话已取消`);
              //TODO 取消通话
            });
          }
        })
        .catch((err) => {
          logger.error(`发送确认响铃信令失败，错误信息: ${err}`);
        });
    }
  };
  //构建确认响铃信令消息
  const buildConfirmRingSignalMessage = (message: CmdMsgBody) => {
    const currentCallInfo = callStateStore.getCallState;
    if (!currentCallInfo) {
      logger.warn("当前没有通话信息，无法发送确认响铃消息");
      return;
    }
    const { from, to, ext } = message;
    if (ext?.callerDevId !== chatClientStore.getClientDeviceId) {
      // 主叫有两个设备
      // 多端情况下的其他设备消息
      logger.warn(
        `[buildConfirmRingSignalMessage]主叫有两个设备，多端情况下的其他设备消息，不处理确认响铃信令消息,deviceId: ${chatClientStore.getClientDeviceId}`
      );
      return;
    }
    let status = true;
    if (ext?.callId !== currentCallInfo.callId) {
      status = false;
      logger.warn(
        `确认响铃信令消息通话ID与当前通话ID不一致，确认响铃信令消息通话ID: ${ext?.callId}，当前通话ID: ${currentCallInfo.callId}`
      );
    }
    if (
      currentCallInfo &&
      currentCallInfo.state !== undefined &&
      currentCallInfo.state > CALL_STATUS.RECEIVED_CONFIRM_RING &&
      currentCallInfo.type !== CALL_TYPE.VIDEO_MULTI
    ) {
      status = false;
      logger.warn(
        `确认响铃信令消息通话状态与当前通话状态不一致，确认响铃信令消息通话状态: ${currentCallInfo.state}，当前通话状态: ${CALL_STATUS.RECEIVED_CONFIRM_RING}`
      );
    }
    logger.debug(">>>>>>开始构建确认响铃信令消息");
    // 检查是否为群呼
    if (currentCallInfo.type === CALL_TYPE.VIDEO_MULTI) {
      const joinedUserIds =
        currentCallInfo.joinedMembers?.map((member) =>
          currentCallInfo?.UIdToUserIdMap?.get(member.uid)
        ) || [];
      if (joinedUserIds.includes(to)) {
        logger.info("用户已经在群通话中");
        status = false;
      }
      if (to && currentCallInfo?.invitedMembers?.includes(to)) {
        logger.info("用户已从群通话邀请列表中移除");
        status = false;
      }
    }
    return {
      to: from,
      action: "confirmRing",
      ext: {
        status,
        callId: message.ext?.callId,
        calleeDevId: message.ext?.calleeDevId,
      },
    };
  };

  /**
   * 处理确认响铃信令消息
   * @param message 收到的确认响铃信令消息
   * @description 处理确认响铃信令消息（场景为：收到确认响铃信令消息后，整体判定状态暂无任何问题即向对方发送confirmCallee信令）
   */
  const handleConfirmRingSignalMessage = (message: CmdMsgBody) => {
    const { ext } = message;
    if (ext?.calleeDevId !== chatClientStore.getClientDeviceId) {
      //多端情况下的其他设备消息
      logger.warn(
        `[handleConfirmRingSignalMessage]多端情况下的其他设备消息，不处理确认响铃信令消息,deviceId: ${chatClientStore.getClientDeviceId}`
      );
      return; // 多端情况下的其他设备消息
    }
    if (ext?.callerDevId !== callStateStore.getCallState.callerDevId) {
      // 主叫有两个设备
      // 多端情况下的其他设备消息
      logger.warn(
        `[handleConfirmRingSignalMessage]主叫有两个设备，多端情况下的其他设备消息，不处理确认响铃信令消息,deviceId: ${chatClientStore.getClientDeviceId}`
      );
      return; // 确认响铃信令消息主叫设备ID与当前通话主叫设备ID不一致
    }
    //当前如果有通话计时器，清除它
    if (callStateStore.getInviteTimeoutTimer) {
      callStateStore.clearTimeoutTimer();
    }
    if (!ext?.status || callStateStore.getCallStatus < CALL_STATUS.ALERTING) {
      logger.warn(
        `[handleConfirmRingSignalMessage]确认响铃信令消息状态为false或通话状态小于ALERTING，不处理确认响铃信令消息,status: ${ext?.status},callStatus: ${callStateStore.getCallStatus}`
      );
      //TODO 可派对外派发挂断事件，事件原因为【HANDLE_ON_OTHER_DEVICE】
      return; // 确认响铃信令消息状态为false或通话状态小于ALERTING
    }
    if (callStateStore.getCallStatus === CALL_STATUS.RECEIVED_CONFIRM_RING) {
      logger.info(
        `[handleConfirmRingSignalMessage]确认响铃信令消息状态为true，通话状态为RECEIVED_CONFIRM_RING，不处理确认响铃信令消息,status: ${ext?.status},callStatus: ${callStateStore.getCallStatus}`
      );
      return; // 确认响铃信令消息状态为true，通话状态为RECEIVED_CONFIRM_RING
    }
    //以上判断通过，修改当前的通话状态为RECEIVED_CONFIRM_RING
    callStateStore.setCallStatus(CALL_STATUS.RECEIVED_CONFIRM_RING);
    //TODO 群通话中如果当前通话状态不为IN_CALL,可以派发hangup事件,reason:NO_RESPONSE
  };
  /**
   * 处理answerCall信令消息
   * @param message 收到的answerCall信令消息
   * @description 处理answerCall信令消息（场景为：收到answerCall信令消息后，整体判定状态暂无任何问题即向对方发送confirmCallee信令）
   */
  const handleAnswerCallMessage = (message: CmdMsgBody) => {
    const ext = message.ext;
    if (!ext) {
      logger.warn("信令消息体中无扩展信息");
      return;
    }
    logger.info(`收到answerCall信令消息，发送方: ${message.from || "未知"}`);
    logger.debug(`answerCall信令消息详情:`, ext);
    if (ext.callId !== callStateStore.getCallState.callId) {
      logger.warn(
        "answerCall信令消息通话callId与当前通话callId不一致，answerCall信令消息通话callId: ",
        ext.callId,
        "当前通话callId: ",
        callStateStore.getCallState.callId
      );
      return;
    }
    //TODO 停止响铃
    //清除超时定时器
    if (callStateStore.getInviteTimeoutTimer) {
      callStateStore.clearTimeoutTimer();
    }
    //判断如果在通话中不受此信令消息影响，直接返回
    if (
      callStateStore.getCallStatus === CALL_STATUS.IN_CALL &&
      callStateStore.type !== CALL_TYPE.VIDEO_MULTI
    ) {
      logger.debug(
        "当前通话状态为IN_CALL，且通话类型不是VIDEO_MULTI，answerCall信令消息不受影响"
      );
      return;
    }
    //判断在其他端已经处理了answerCall信令消息
    if (ext.callerDevId !== chatClientStore.getClientDeviceId) {
      if (message.from === chatClientStore.getChatClient?.context.userId) {
        //已经在其他设备处理
        const reason =
          ext.result === "accept" ? "已被其他端接听" : "已被其他端拒绝";
        logger.warn(
          `answerCall信令消息已被其他端处理，${reason}，answerCall信令消息发送方设备ID: ${ext?.callerDevId}，当前客户端设备ID: ${chatClientStore.getClientDeviceId}`
        );
        //TODO 调用挂断 传入原因为HANGUP_REASON.HANDLE_ON_OTHER_DEVICE
        return;
      }
      logger.warn(
        `answerCall信令消息发送方设备ID与当前客户端设备ID不一致，answerCall信令消息发送方设备ID: ${ext?.callerDevId}，当前客户端设备ID: ${chatClientStore.getClientDeviceId}`
      );
      return;
    }
    if (ext?.result !== "accept") {
      const reason =
        ext?.result === "busy" ? HANGUP_REASON.BUSY : HANGUP_REASON.REFUSE;
      //TODO 发送confirmCallee信令

      //针对群组多人通话的逻辑处理
      if (
        callStateStore.type === CALL_TYPE.VIDEO_MULTI ||
        callStateStore.type === CALL_TYPE.AUDIO_MULTI
      ) {
        // 多人通话：只记录拒绝状态，不挂断通话
        // 从邀请列表中移除拒绝的用户
        const invitedMembers = callStateStore.getInvitedMembers.filter(
          (member) => member !== message.from
        );
        callStateStore.updateInvitedMembers(invitedMembers);
      } else {
        //一对一通话执行挂断
        //TODO huang 挂断通话
      }
    } else {
      //TODO 发送confirmCallee信令
    }
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
          //仅处理rtcCall信令
          if (message.action === "rtcCall") {
            // 安全地访问信令消息的属性
            const from = message.from || "未知";
            // 尝试从不同可能的字段获取消息类型信息
            let messageType = "未知";
            if (typeof message === "object" && message !== null) {
              messageType = message.ext?.action || message.action || "未知";
            }
            logger.debug(`接收到信令消息类型: ${messageType}`);
            logger.verbose(`接收到信令消息详情:`, message);
            handleSignalMessage(message as unknown as CmdMsgBody);
          }
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
