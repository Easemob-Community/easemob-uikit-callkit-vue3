// src/services/callService.ts
import { useCallStateStore } from "../store/callState";
import { useChatClientStore } from "../store/chatClient";
import { useRtcChannelStore } from "../store/rtcChannel";
import { HANGUP_REASON, CALL_STATUS, CALL_TYPE } from "../types/callstate.types";
import { useSignalManager } from "../composables/useSignalManager";
import { logger } from "../utils/logger";

export class CallService {
  private logger = console;

  // 延迟获取store实例，确保在Pinia激活后使用
  private get callStateStore() {
    return useCallStateStore();
  }

  private get rtcChannelStore() {
    return useRtcChannelStore();
  }

  private get chatClientStore() {
    return useChatClientStore();
  }

  async hangup(reason: HANGUP_REASON = HANGUP_REASON.HANGUP) {
    this.logger.log("hangup method called:", { reason });

    try {
      // 防止重复调用
      const callStateStore = this.callStateStore;
      if (
        !callStateStore ||
        typeof callStateStore.getCallStatus === "undefined"
      ) {
        this.logger.error("CallState store not properly initialized");
        return;
      }

      const currentStatus = callStateStore.getCallStatus;
      if (currentStatus === CALL_STATUS.IDLE) {
        this.logger.warn("Call is not active, skip hangup");
        return;
      }
    } catch (error) {
      this.logger.error("Error checking call status:", error);
      return;
    }

    try {
      // 选择并执行相应的策略
      await this.executeHangupStrategy(reason);

      // 执行通用的清理和状态重置
      await this.cleanupMediaResources();
      await this.cleanupConnection();
      this.resetState(reason);

      this.logger.info(`Hangup completed successfully with reason: ${reason}`);
    } catch (error) {
      this.logger.error("Hangup process failed:", error);
      // 即使出错也要尝试重置基本状态
      try {
        this.callStateStore.setCallStatus(CALL_STATUS.IDLE);
      } catch (resetError) {
        this.logger.error(
          "Failed to reset state after hangup error:",
          resetError
        );
      }
      throw error;
    }
  }

  // 执行特定的挂断策略
  private async executeHangupStrategy(reason: HANGUP_REASON): Promise<void> {
    // 简化的策略选择逻辑，直接基于reason判断
    if (reason === HANGUP_REASON.CANCEL) {
      await this.handleCancelStrategy();
    } else if (this.isRemoteReason(reason)) {
      // 远程操作不需要发送消息
      return;
    } else {
      // 普通挂断策略
      await this.handleNormalHangupStrategy(reason);
    }
  }

  // 判断是否为远程原因
  private isRemoteReason(reason: HANGUP_REASON): boolean {
    const remoteReasons: HANGUP_REASON[] = [
      HANGUP_REASON.REMOTE_CANCEL,
      HANGUP_REASON.REMOTE_REFUSE,
      HANGUP_REASON.BUSY,
      HANGUP_REASON.NO_RESPONSE,
      HANGUP_REASON.REMOTE_NO_RESPONSE,
      HANGUP_REASON.HANDLE_ON_OTHER_DEVICE,
    ];
    return remoteReasons.includes(reason);
  }

  // 普通挂断策略
  private async handleNormalHangupStrategy(
    reason: HANGUP_REASON
  ): Promise<void> {
    try {
      const callState = this.callStateStore.getCallState;
      if (!callState) {
        logger.warn("CallService: 挂断失败，通话状态为空");
        return;
      }

      // 使用 useSignalManager 发送 leaveCall 信令
      const { sendLeaveMessage } = useSignalManager();
      
      // 判断是群组通话还是一对一通话
      const isGroupCall = 
        callState.type === CALL_TYPE.VIDEO_MULTI || 
        callState.type === CALL_TYPE.AUDIO_MULTI;
      
      if (isGroupCall) {
        // 群组通话：发送群定向消息给通话中的其他人
        if (!callState.groupId) {
          logger.warn("CallService: 群组通话挂断失败，groupId 为空");
          return;
        }
        
        logger.info(
          `CallService: 发送群组离开通话信令，群组: ${callState.groupId}`
        );
        
        await sendLeaveMessage(
          callState.groupId,
          "groupChat"
          // TODO: 这里应该传递 joinedMembers 的 userId 列表作为 receiverList
          // 目前暂不实现，后续 RTC 接入后补充
        );
      } else {
        // 一对一通话：发送单聊消息
        const targetUserId = 
          callState.calleeUserId && callState.calleeUserId !== this.chatClientStore.getChatClient?.user
            ? callState.calleeUserId
            : callState.callerUserId;
        
        if (!targetUserId) {
          logger.warn("CallService: 一对一通话挂断失败，目标用户ID为空");
          return;
        }
        
        logger.info(
          `CallService: 发送一对一离开通话信令，目标用户: ${targetUserId}`
        );
        
        await sendLeaveMessage(
          targetUserId,
          "singleChat"
        );
      }
      
      logger.info("CallService: 离开通话信令发送成功");
    } catch (error) {
      logger.error("CallService: 发送离开通话信令失败:", error);
      // 发送失败不影响后续流程
    }
  }

  // 取消呼叫策略
  private async handleCancelStrategy(): Promise<void> {
    try {
      const callState = this.callStateStore.getCallState;
      if (!callState || !callState.calleeUserId) {
        logger.warn("CallService: 取消通话失败，缺少被叫方信息");
        return;
      }

      // 使用 useSignalManager 发送 cancelCall 信令
      const { sendCancelMessage } = useSignalManager();
      
      logger.info(
        `CallService: 发送取消通话信令，目标用户: ${callState.calleeUserId}`
      );
      
      await sendCancelMessage(
        callState.calleeUserId,
        "singleChat"
      );
      
      logger.info("CallService: 取消通话信令发送成功");
    } catch (error) {
      logger.error("CallService: 发送取消通话信令失败:", error);
      // 发送失败不影响后续流程
    }
  }

  // 清理媒体资源
  private async cleanupMediaResources(): Promise<void> {
    try {
      // TODO: RTC 媒体资源清理，等待 RTC 实现
      // const activeChannel = this.rtcChannelStore.activeChannel;
      // if (activeChannel?.rtcClient?.unpublishAll) {
      //   await activeChannel.rtcClient.unpublishAll();
      // }
    } catch (error) {
      this.logger.error("Error cleaning up media resources:", error);
    }
  }

  // 清理连接
  private async cleanupConnection(): Promise<void> {
    try {
      // TODO: RTC 连接清理，等待 RTC 实现
      // const activeChannel = this.rtcChannelStore.activeChannel;
      // if (activeChannel?.leave) await activeChannel.leave();
      // if (activeChannel?.rtcClient?.destroy)
      //   await activeChannel.rtcClient.destroy();
    } catch (error) {
      this.logger.error("Error cleaning up connection:", error);
    }
  }

  // 重置状态
  private resetState(reason: HANGUP_REASON): void {
    try {
      const callStateStore = this.callStateStore;
      if (!callStateStore) {
        this.logger.error("CallState store not available for reset");
        return;
      }

      // 使用 resetCallState 方法重置状态
      callStateStore.resetCallState();

      // 使用logger记录事件
      logger.log("call-ended event:", { reason });
    } catch (error) {
      this.logger.error("Error resetting state:", error);
    }
  }

  // 便捷方法
  async hangupCall() {
    await this.hangup(HANGUP_REASON.HANGUP);
  }
  async cancelCall() {
    await this.hangup(HANGUP_REASON.CANCEL);
  }
  async handleRemoteCancel() {
    await this.hangup(HANGUP_REASON.REMOTE_CANCEL);
  }
  async handleRemoteRefuse() {
    await this.hangup(HANGUP_REASON.REMOTE_REFUSE);
  }
  async handleAbnormalEnd() {
    await this.hangup(HANGUP_REASON.ABNORMAL_END);
  }
}

// 创建单例实例，但不立即初始化store引用
export const callService = new CallService();
