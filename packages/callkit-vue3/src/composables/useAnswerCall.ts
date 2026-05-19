import { useCallKitCore } from "./useCallKitCore";
import { logger } from "../utils/logger";
import { CALL_STATUS } from "../types/callstate.types";
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
 * 提供接受、拒绝通话的方法（状态由 callkit-core 维护）
 */
export function useAnswerCall(): UseAnswerCallReturn {
  const { callState: coreCallState, answerCall: coreAnswerCall } = useCallKitCore();

  /**
   * 接受通话
   */
  async function acceptCall(): Promise<void> {
    try {
      logger.info("useAnswerCall: 被叫方接受通话");

      if (!coreCallState.callerUserId) {
        logger.error("useAnswerCall: 无法获取主叫方用户ID");
        throw new Error("无法获取主叫方用户ID");
      }

      // 被叫可接听区间：ALERTING(2) 与握手中间态 RECEIVED_CONFIRM_RING(4)
      // 严格只允许 ALERTING 会导致握手后点接听被静默丢弃
      const acceptableStatuses: number[] = [CALL_STATUS.ALERTING, CALL_STATUS.RECEIVED_CONFIRM_RING];
      if (!acceptableStatuses.includes(coreCallState.status as number)) {
        logger.warn(
          `useAnswerCall: 当前状态不在可接听区间，无法接受通话，当前状态: ${coreCallState.status}`
        );
        return;
      }

      // 通过 core 发送接听信令
      await coreAnswerCall({
        callId: coreCallState.callId,
        result: 'accept',
      });

      logger.info("useAnswerCall: answerCall信令发送成功，等待confirmCallee响应");
    } catch (error) {
      logger.error("useAnswerCall: 接受通话失败:", error);
      throw error;
    }
  }

  /**
   * 拒绝通话
   */
  async function rejectCall(): Promise<void> {
    try {
      logger.info("useAnswerCall: 被叫方拒绝通话");

      if (!coreCallState.callerUserId) {
        logger.error("useAnswerCall: 无法获取主叫方用户ID");
        throw new Error("无法获取主叫方用户ID");
      }

      // 通过 core 发送拒绝信令（core 会自动处理状态重置）
      await coreAnswerCall({
        callId: coreCallState.callId,
        result: 'refuse',
      });

      logger.info("useAnswerCall: 拒绝通话信令发送成功");
    } catch (error) {
      logger.error("useAnswerCall: 拒绝通话失败:", error);
      throw error;
    }
  }

  /**
   * 忙碌拒绝通话
   */
  async function busyRejectCall(): Promise<void> {
    try {
      logger.info("useAnswerCall: 被叫方忙碌拒绝通话");

      if (!coreCallState.callerUserId) {
        logger.error("useAnswerCall: 无法获取主叫方用户ID");
        throw new Error("无法获取主叫方用户ID");
      }

      // 通过 core 发送忙碌拒绝信令（core 会自动处理状态重置）
      await coreAnswerCall({
        callId: coreCallState.callId,
        result: 'busy',
      });

      logger.info("useAnswerCall: 忙碌拒绝通话信令发送成功");
    } catch (error) {
      logger.error("useAnswerCall: 忙碌拒绝通话失败:", error);
      throw error;
    }
  }

  return {
    acceptCall,
    rejectCall,
    busyRejectCall,
  };
}
