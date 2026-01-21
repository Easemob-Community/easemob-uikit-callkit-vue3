import { useChatClientStore } from "../store/chatClient";
import { useCallStateStore } from "../store/callState";
import { logger } from "../utils/logger";
import type { Chat } from "../core/sdk/imSDK";
import {
  CALL_STATUS,
  CALL_TYPE,
  HANGUP_REASON,
  type CALLKIT_TEXT_MSG_ACTION,
  type CALLKIT_CMD_MSG_ACTION_TYPE,
} from "../types/callstate.types";
import type { SignalingExt } from "../types/signal.types";
import { useSignalManager } from "./useSignalManager";
import { CallService } from "../services/CallService";

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
  const {
    sendBusyAnswerMessage,
    sendAlertMessage,
    sendConfirmRingMessage,
    sendConfirmCalleeMessage,
    sendAnswerMessage,
  } = useSignalManager();
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
        sendBusyAnswerMessage(message.from, newInvitationInfo).catch((err) => {
          // 错误已在useSignalManager内部记录
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
    sendAlertMessage(message.from as string).catch((err) => {
      // 错误已在useSignalManager内部记录
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
        handleConfirmCalleeMessage(message);
        break;
      case "cancelCall":
        handleCancelCallMessage(message);
        break;
      case "leaveCall":
        handleLeaveCallMessage(message);
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
      sendConfirmRingMessage(
        confirmRingSignalMessage.to as string,
        confirmRingSignalMessage.ext
      )
        .then(() => {
          //对方弹出邀请后，如超出设定则执行自定挂断
          if (callStateStore.type !== CALL_TYPE.VIDEO_MULTI) {
            callStateStore.startTimeoutTimer(() => {
              logger.info(`确认响铃信令超时，通话已取消`);
              //TODO 取消通话
            });
          }
        })
        .catch(() => {
          // 错误已在useSignalManager内部记录
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
   * @description 处理确认响铃信令消息（场景为：主叫方收到被叫方的confirmRing信令消息后，整体判定状态暂无任何问题）
   */
  const handleConfirmRingSignalMessage = (message: CmdMsgBody) => {
    const { ext } = message;
    // 主叫方收到被叫方的confirmRing，应该检查callerDevId是否匹配当前设备
    if (ext?.callerDevId !== chatClientStore.getClientDeviceId) {
      //多端情况下的其他设备消息
      logger.warn(
        `[handleConfirmRingSignalMessage]多端情况下的其他设备消息，不处理确认响铃信令消息,deviceId: ${chatClientStore.getClientDeviceId}, callerDevId: ${ext?.callerDevId}`
      );
      return; // 多端情况下的其他设备消息
    }
    if (ext?.calleeDevId !== callStateStore.getCallState.calleeDevId) {
      // 被叫有两个设备
      // 多端情况下的其他设备消息
      logger.warn(
        `[handleConfirmRingSignalMessage]被叫有两个设备，多端情况下的其他设备消息，不处理确认响铃信令消息,calleeDevId: ${ext?.calleeDevId}, expected: ${callStateStore.getCallState.calleeDevId}`
      );
      return; // 确认响铃信令消息被叫设备ID与当前通话被叫设备ID不一致
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

      // 发送confirmCallee信令，通知对方已确认收到拒绝信息
      const confirmCalleePayload = {
        callId: ext.callId,
        callerDevId: ext.callerDevId,
        calleeDevId: ext.calleeDevId,  // 必须包含calleeDevId，iOS端需要用来验证设备
        result: ext.result,
      };
      sendConfirmCalleeMessage(
        message.from as string,
        confirmCalleePayload
      ).catch(() => {
        // 错误已在useSignalManager内部记录
      });

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
        logger.info("收到对方拒绝，执行挂断操作");
        const callService = new CallService();
        callService.handleRemoteRefuse().catch((err) => {
          logger.error("执行挂断失败:", err);
        });
      }
    } else {
      // 对方接受通话
      logger.info("收到对方接受，开始进入通话流程");
      
      // 发送confirmCallee信令，通知对方已确认收到接受信息
      const confirmCalleePayload = {
        callId: ext.callId,
        callerDevId: ext.callerDevId,
        calleeDevId: ext.calleeDevId,  // 必须包含calleeDevId，iOS端需要用来验证设备
        result: "accept",
      };
      sendConfirmCalleeMessage(
        message.from as string,
        confirmCalleePayload
      ).catch(() => {
        // 错误已在useSignalManager内部记录
      });

      // 更新通话状态为 IN_CALL (对于一对一通话)
      if (
        callStateStore.type !== CALL_TYPE.VIDEO_MULTI &&
        callStateStore.type !== CALL_TYPE.AUDIO_MULTI
      ) {
        logger.info("一对一通话，更新状态为 IN_CALL");
        callStateStore.setCallStatus(CALL_STATUS.IN_CALL);
      }
      
      // TODO: 这里需要加入 RTC 频道的逻辑
      // 由于你提到 RTC 部分先不管，这里预留接口
      // 实际应该调用类似: rtcService.joinChannel(callState.channel)
    }
  };

  /**
   * 处理cancelCall信令消息
   * @param message 收到的cancelCall信令消息
   * @description 处理取消通话信令消息
   */
  const handleCancelCallMessage = (message: CmdMsgBody) => {
    const ext = message.ext;
    if (!ext) {
      logger.warn("信令消息体中无扩展信息");
      return;
    }
    logger.info(`收到cancelCall信令消息，发送方: ${message.from || "未知"}`);
    logger.debug(`cancelCall信令消息详情:`, ext);

    // 校验callId是否匹配
    if (ext.callId !== callStateStore.getCallState.callId) {
      logger.warn(
        `cancelCall信令消息通话callId与当前通话callId不一致，cancelCall信令消息通话callId: ${ext.callId}，当前通话callId: ${callStateStore.getCallState.callId}`
      );
      return;
    }

    // 对方取消了通话，执行挂断
    logger.info("收到对方取消通话，执行挂断操作");
    const callService = new CallService();
    callService.handleRemoteCancel().catch((err) => {
      logger.error("执行挂断失败:", err);
    });
  };

  /**
   * 处理leaveCall信令消息
   * @param message 收到的leaveCall信令消息
   * @description 处理对方离开通话的信令，销毁并重置当前通话状态
   */
  const handleLeaveCallMessage = (message: CmdMsgBody) => {
    const ext = message.ext;
    if (!ext) {
      logger.warn("信令消息体中无扩展信息");
      return;
    }
    logger.info(`收到leaveCall信令消息，发送方: ${message.from || "未知"}`);
    logger.debug(`leaveCall信令消息详情:`, ext);

    // 校验callId是否匹配
    if (ext.callId !== callStateStore.getCallState.callId) {
      logger.warn(
        `leaveCall信令消息通话callId与当前通话callId不一致，leaveCall信令消息通话callId: ${ext.callId}，当前通话callId: ${callStateStore.getCallState.callId}`
      );
      return;
    }

    // 清除超时定时器
    if (callStateStore.getInviteTimeoutTimer) {
      callStateStore.clearTimeoutTimer();
    }

    // 对方离开通话，销毁并重置当前通话状态
    logger.info("收到对方离开通话信令，销毁并重置当前通话状态");
    const callService = new CallService();
    callService.hangup(HANGUP_REASON.HANGUP).catch((err) => {
      logger.error("执行挂断失败:", err);
    });
  };

  /**
   * 处理confirmCallee信令消息
   * @param message 收到的confirmCallee信令消息
   * @description 主叫方收到被叫方的confirmCallee确认信令，检查是否成功建立通话
   */
  const handleConfirmCalleeMessage = (message: CmdMsgBody) => {
    const ext = message.ext;
    if (!ext) {
      logger.warn("信令消息体中无扩展信息");
      return;
    }
    logger.info(
      `收到confirmCallee信令消息，发送方: ${message.from || "未知"}`
    );
    logger.debug(`confirmCallee信令消息详情:`, ext);

    // 当前已经在通话中，忽略 confirmCallee 消息，不挂断当前通话
    if (callStateStore.getCallStatus === CALL_STATUS.IN_CALL) {
      logger.debug(
        "当前已在通话中，忽略confirmCallee信令消息"
      );
      return;
    }

    // 校验callId是否匹配
    if (ext.callId !== callStateStore.getCallState.callId) {
      logger.warn(
        `confirmCallee信令消息通话callId与当前通话callId不一致，confirmCallee信令消息通话callId: ${ext.callId}，当前通话callId: ${callStateStore.getCallState.callId}`
      );
      return;
    }

    // 收到其他设备的 confirmCallee 消息，挂断当前通话
    if (ext.calleeDevId !== chatClientStore.getClientDeviceId) {
      logger.warn(
        `收到其他设备的confirmCallee消息，挂断当前通话，calleeDevId: ${ext.calleeDevId}，当前设备ID: ${chatClientStore.getClientDeviceId}`
      );
      const callService = new CallService();
      callService
        .hangup(HANGUP_REASON.HANDLE_ON_OTHER_DEVICE)
        .catch((err) => {
          logger.error("执行挂断失败:", err);
        });
      return;
    }

    // 收到拒绝或忙线的 confirmCallee 消息，挂断通话
    if (ext.result !== "accept") {
      const reason =
        ext.result === "busy" ? HANGUP_REASON.BUSY : HANGUP_REASON.REFUSE;
      logger.warn(`收到拒绝或忙线的confirmCallee消息，挂断通话，reason: ${reason}`);
      const callService = new CallService();
      callService.hangup(reason).catch((err) => {
        logger.error("执行挂断失败:", err);
      });
      return;
    }

    // 收到接受的 confirmCallee 消息，更新状态为CONFIRM_CALLEE并加入通话
    logger.info("收到接受的confirmCallee消息，通话确认成功，准备加入通话");
    callStateStore.setCallStatus(CALL_STATUS.CONFIRM_CALLEE);
    
    // 被叫方收到confirmCallee后，应该更新为IN_CALL状态（与主叫方保持一致）
    // 这是被叫方的最终确认，此时双方都准备好进入通话
    callStateStore.setCallStatus(CALL_STATUS.IN_CALL);
    
    // TODO: 这里需要加入 RTC 频道的逻辑
    // 实际应该调用类似: rtcService.joinChannel(callState.channel)
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
