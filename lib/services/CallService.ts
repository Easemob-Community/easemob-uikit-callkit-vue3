// src/services/callService.ts
import { useCallStateStore } from "../store/callState";
import { useChatClientStore } from "../store/chatClient";
import { useRtcChannelStore } from "../store/rtcChannel";
import type { HANGUP_REASON } from "../types/callstate.types";
export class CallService {
  private callStateStore = useCallStateStore();
  private rtcChannelStore = useRtcChannelStore();

  async hangup(
    reason: string = HANGUP_REASON.HANGUP,
    isCancel: boolean = false
  ) {
    console.log("hangup method called:", { reason, isCancel });

    // 1. 清理媒体资源
    await this.cleanupMediaResources();

    // 2. 处理信令消息
    await this.handleSignalingMessages(reason, isCancel);

    // 3. 清理连接
    await this.cleanupConnection();

    // 4. 重置状态
    this.resetState(reason);
  }
  // 清理媒体资源
  private async cleanupMediaResources() {
    // 访问rtcChannelStore中的RTC实例来清理媒体资源
    const { rtcClient, localAudioTrack, localVideoTrack } =
      this.rtcChannelStore;

    // 实现媒体资源清理逻辑
    // ...
  }
  // 处理信令消息
  private async handleSignalingMessages(reason: string, isCancel: boolean) {
    // 实现信令消息处理逻辑
    // ...
  }

  private async cleanupConnection() {
    // 访问rtcStore中的连接进行清理
    // ...
  }

  private resetState(reason: string) {
    // 调用roomStore的方法来重置房间状态
    this.roomStore.resetRoomState();

    // 调用rtcStore的方法来重置RTC状态
    this.rtcStore.resetRtcState();

    // 触发通话结束事件或回调
    // ...
  }
}

// 创建单例实例
export const callService = new CallService();
