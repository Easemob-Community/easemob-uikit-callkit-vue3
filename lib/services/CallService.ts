// src/services/callService.ts
import { useCallStateStore } from "../store/callState";
import { useChatClientStore } from "../store/chatClient";
import { useRtcChannelStore } from "../store/rtcChannel";
import { HANGUP_REASON } from "../types/callstate.types";

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

    // 防止重复调用
    if (this.callStateStore.getCallStatus() === "IDLE") {
      this.logger.warn("Call is not active, skip hangup");
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
        this.callStateStore.$patch({
          status: "IDLE",
          isInCall: false,
          hangupReason: HANGUP_REASON.ABNORMAL_END,
        });
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
    return [
      HANGUP_REASON.REMOTE_CANCEL,
      HANGUP_REASON.REMOTE_REFUSE,
      HANGUP_REASON.BUSY,
      HANGUP_REASON.NO_RESPONSE,
      HANGUP_REASON.REMOTE_NO_RESPONSE,
      HANGUP_REASON.HANDLE_ON_OTHER_DEVICE,
    ].includes(reason);
  }

  // 普通挂断策略
  private async handleNormalHangupStrategy(
    reason: HANGUP_REASON
  ): Promise<void> {
    try {
      const chatClient = this.chatClientStore.getChatClient();
      if (chatClient && chatClient.sendHangupMessage) {
        await chatClient.sendHangupMessage(reason);
      }
    } catch (error) {
      this.logger.error("Error sending hangup message:", error);
      // 发送失败不影响后续流程
    }
  }

  // 取消呼叫策略
  private async handleCancelStrategy(): Promise<void> {
    try {
      const chatClient = this.chatClientStore.getChatClient();
      if (chatClient && chatClient.sendCancelMessage) {
        const unjoinedMembers = this.callStateStore.getInvitedMembers() || [];
        if (unjoinedMembers.length > 0) {
          await chatClient.sendCancelMessage(
            HANGUP_REASON.CANCEL,
            unjoinedMembers
          );
        }
      }
    } catch (error) {
      this.logger.error("Error sending cancel message:", error);
      // 发送失败不影响后续流程
    }
  }

  // 清理媒体资源
  private async cleanupMediaResources(): Promise<void> {
    try {
      const activeChannel = this.rtcChannelStore.activeChannel();
      // 通过activeChannel获取rtcClient
      if (activeChannel?.rtcClient?.unpublishAll) {
        await activeChannel.rtcClient.unpublishAll();
      }
    } catch (error) {
      this.logger.error("Error cleaning up media resources:", error);
    }
  }

  // 清理连接
  private async cleanupConnection(): Promise<void> {
    try {
      const activeChannel = this.rtcChannelStore.activeChannel();
      
      // 离开频道
      if (activeChannel?.leave) await activeChannel.leave();
      // 销毁客户端
      if (activeChannel?.rtcClient?.destroy) await activeChannel.rtcClient.destroy();
    } catch (error) {
      this.logger.error("Error cleaning up connection:", error);
    }
  }

  // 重置状态
  private resetState(reason: HANGUP_REASON): void {
    try {
      this.callStateStore.$patch({
        status: "IDLE",
        currentCall: null,
        hangupReason: reason,
        isInCall: false,
      });

      // 使用logger记录事件
      this.logger.log("call-ended event:", { reason });
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
