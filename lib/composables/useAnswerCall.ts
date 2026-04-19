import { useCallStateStore } from "../store/callState";
import { useChatClientStore } from "../store/chatClient";
import { useSignalManager } from "./useSignalManager";
import { logger } from "../utils/logger";
import { CALL_STATUS, CALLKIT_CMD_MSG_RESULT_TYPE } from "../types/callstate.types";
import { USE_NEW_GROUP_CALL } from "../config/featureFlags";
import { useGroupCallStore } from "../modules/groupCall";

export interface UseAnswerCallReturn {
  // 接受通话
  acceptCall: () => Promise<void>;
  // 拒绝通话
  rejectCall: () => Promise<void>;
  // 忙碌拒绝通话
  busyRejectCall: () => Promise<void>;
}

/**
 * 被叫方应答通话的组合式API
 * 提供接受、拒绝通话的方法
 */
export function useAnswerCall(): UseAnswerCallReturn {
  const callStateStore = useCallStateStore();
  const chatClientStore = useChatClientStore();
  const { sendAnswerMessage } = useSignalManager();

  /**
   * 接受通话
   */
  async function acceptCall(): Promise<void> {
    try {
      logger.info("useAnswerCall: 被叫方接受通话");
      const callState = callStateStore.getCallState;

      if (!callState.callerUserId) {
        logger.error("useAnswerCall: 无法获取主叫方用户ID");
        throw new Error("无法获取主叫方用户ID");
      }

      if (callStateStore.getCallStatus !== CALL_STATUS.ALERTING) {
        logger.warn(
          `useAnswerCall: 当前通话状态不是ALERTING，无法接受通话，当前状态: ${callStateStore.getCallStatus}`
        );
        return;
      }

      // 清除超时计时器
      if (callStateStore.getInviteTimeoutTimer) {
        callStateStore.clearTimeoutTimer();
      }

      // 构建answerCall信令payload
      const answerPayload = {
        callId: callState.callId,
        callerDevId: callState.callerDevId,
        calleeDevId: chatClientStore.getClientDeviceId,
      };

      // 发送answerCall信令 (result: accept)
      await sendAnswerMessage(
        callState.callerUserId,
        answerPayload,
        CALLKIT_CMD_MSG_RESULT_TYPE.ACCEPT
      );

      logger.info("useAnswerCall: answerCall信令发送成功，等待confirmCallee响应");

      // 更新状态为ANSWER_CALL
      callStateStore.setCallStatus(CALL_STATUS.ANSWER_CALL);

      // 新模块：标记本地用户为已接受（等待 confirmCallee 后 joinChannel）
      if (USE_NEW_GROUP_CALL) {
        const groupCallStore = useGroupCallStore()
        const currentUserId = chatClientStore.getChatClient?.user
        if (currentUserId && groupCallStore.participants.has(currentUserId)) {
          groupCallStore.markAccepted(currentUserId)
        }
      }
    } catch (error) {
      logger.error("useAnswerCall: 接受通话失败:", error);
      // 兜底：发送信令失败时（如被拉黑 blocked）也要重置状态，避免弹窗卡住
      callStateStore.resetCallState();
      throw error;
    }
  }

  /**
   * 拒绝通话
   */
  async function rejectCall(): Promise<void> {
    try {
      logger.info("useAnswerCall: 被叫方拒绝通话");
      const callState = callStateStore.getCallState;

      if (!callState.callerUserId) {
        logger.error("useAnswerCall: 无法获取主叫方用户ID");
        throw new Error("无法获取主叫方用户ID");
      }

      // 清除超时计时器
      if (callStateStore.getInviteTimeoutTimer) {
        callStateStore.clearTimeoutTimer();
      }

      // 构建answerCall信令payload
      const answerPayload = {
        callId: callState.callId,
        callerDevId: callState.callerDevId,
        calleeDevId: chatClientStore.getClientDeviceId,
      };

      // 发送answerCall信令 (result: refuse)
      await sendAnswerMessage(
        callState.callerUserId,
        answerPayload,
        CALLKIT_CMD_MSG_RESULT_TYPE.REFUSE
      );

      logger.info("useAnswerCall: 拒绝通话信令发送成功");

      // 重置通话状态
      callStateStore.resetCallState();
    } catch (error) {
      logger.error("useAnswerCall: 拒绝通话失败:", error);
      // 兜底：发送信令失败时（如被拉黑 blocked）也要重置状态，避免弹窗卡住
      callStateStore.resetCallState();
      throw error;
    }
  }

  /**
   * 忙碌拒绝通话
   */
  async function busyRejectCall(): Promise<void> {
    try {
      logger.info("useAnswerCall: 被叫方忙碌拒绝通话");
      const callState = callStateStore.getCallState;

      if (!callState.callerUserId) {
        logger.error("useAnswerCall: 无法获取主叫方用户ID");
        throw new Error("无法获取主叫方用户ID");
      }

      // 清除超时计时器
      if (callStateStore.getInviteTimeoutTimer) {
        callStateStore.clearTimeoutTimer();
      }

      // 构建answerCall信令payload
      const answerPayload = {
        callId: callState.callId,
        callerDevId: callState.callerDevId,
        calleeDevId: chatClientStore.getClientDeviceId,
      };

      // 发送answerCall信令 (result: busy)
      await sendAnswerMessage(
        callState.callerUserId,
        answerPayload,
        CALLKIT_CMD_MSG_RESULT_TYPE.BUSY
      );

      logger.info("useAnswerCall: 忙碌拒绝通话信令发送成功");

      // 重置通话状态
      callStateStore.resetCallState();
    } catch (error) {
      logger.error("useAnswerCall: 忙碌拒绝通话失败:", error);
      // 兜底：发送信令失败时也要重置状态，避免弹窗卡住
      callStateStore.resetCallState();
      throw error;
    }
  }

  return {
    acceptCall,
    rejectCall,
    busyRejectCall,
  };
}
