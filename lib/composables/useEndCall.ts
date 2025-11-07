import { callService } from "../services/CallService";
import { HANGUP_REASON } from "../types/callstate.types";
import { useCallStateStore } from "../store/callState";
import { logger } from "../utils/logger";

/**
 * 通话结束相关功能的组合式函数
 * 提供各种通话结束场景的便捷方法
 */
export function useEndCall() {
  const callStateStore = useCallStateStore();

  /**
   * 挂断当前通话
   * @param reason 挂断原因，默认为普通挂断
   * @returns Promise<void>
   */
  async function hangup(
    reason: HANGUP_REASON = HANGUP_REASON.HANGUP
  ): Promise<void> {
    try {
      logger.info("useEndCall: Hanging up call", { reason });
      await callService.hangup(reason);
    } catch (error) {
      logger.error("useEndCall: Failed to hang up call", error);
      throw error;
    }
  }

  /**
   * 普通挂断通话
   * @returns Promise<void>
   */
  async function hangupCall(): Promise<void> {
    try {
      logger.info("useEndCall: Hanging up active call");
      await callService.hangupCall();
    } catch (error) {
      logger.error("useEndCall: Failed to hang up active call", error);
      throw error;
    }
  }

  /**
   * 取消通话邀请
   * @returns Promise<void>
   */
  async function cancelCall(): Promise<void> {
    try {
      logger.info("useEndCall: Cancelling call invitation");
      await callService.cancelCall();
    } catch (error) {
      logger.error("useEndCall: Failed to cancel call invitation", error);
      throw error;
    }
  }

  /**
   * 处理远程取消通话
   * @returns Promise<void>
   */
  async function handleRemoteCancel(): Promise<void> {
    try {
      logger.info("useEndCall: Handling remote cancel");
      await callService.handleRemoteCancel();
    } catch (error) {
      logger.error("useEndCall: Failed to handle remote cancel", error);
      throw error;
    }
  }

  /**
   * 处理远程拒绝通话
   * @returns Promise<void>
   */
  async function handleRemoteRefuse(): Promise<void> {
    try {
      logger.info("useEndCall: Handling remote refuse");
      await callService.handleRemoteRefuse();
    } catch (error) {
      logger.error("useEndCall: Failed to handle remote refuse", error);
      throw error;
    }
  }

  /**
   * 处理异常结束
   * @returns Promise<void>
   */
  async function handleAbnormalEnd(): Promise<void> {
    try {
      logger.info("useEndCall: Handling abnormal end");
      await callService.handleAbnormalEnd();
    } catch (error) {
      logger.error("useEndCall: Failed to handle abnormal end", error);
      throw error;
    }
  }

  /**
   * 检查当前是否可以挂断
   * @returns boolean 是否可以执行挂断操作
   */
  function canHangup(): boolean {
    return callStateStore.callStatus !== "IDLE" && callStateStore.isInCall;
  }

  /**
   * 检查当前是否可以取消通话
   * @returns boolean 是否可以执行取消操作
   */
  function canCancel(): boolean {
    // 只有在邀请状态才能取消
    return callStateStore.callStatus === "INVITING";
  }

  return {
    // 核心挂断方法
    hangup,
    hangupCall,
    cancelCall,
    handleRemoteCancel,
    handleRemoteRefuse,
    handleAbnormalEnd,

    // 状态检查方法
    canHangup,
    canCancel,
  };
}
