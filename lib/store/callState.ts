import { defineStore } from "pinia";
import type { CallState, CallStatus, CurrentCallInfo } from "./types";

export const useCallStateStore = defineStore("callState", {
  /**
   * 通话状态数据
   */
  state: (): CallState => ({
    // 基础状态
    status: "idle",
    isInCall: false,
    callType: null,

    // 当前通话信息
    currentCall: null,

    // 来电信息
    incomingCall: null,

    // 通话设置
    settings: {
      enableAudio: true,
      enableVideo: true,
      enableSpeaker: true,
      enableMicrophone: true,
    },
  }),

  /**
   * 计算属性
   */
  getters: {
    /**
     * 计算通话时长（秒）
     */
    callDuration(): number {
      if (!this.currentCall || !this.currentCall.startTime) {
        return 0;
      }
      return Math.floor((Date.now() - this.currentCall.startTime) / 1000);
    },

    /**
     * 判断是否有来电
     */
    hasIncomingCall(): boolean {
      return !!this.incomingCall && this.status === "ringing";
    },

    /**
     * 获取当前通话的参与者数量
     */
    participantCount(): number {
      return this.currentCall?.participants?.length || 0;
    },
  },

  /**
   * 状态更新方法
   */
  actions: {
    /**
     * 更新部分通话状态
     */
    updateCallState(partialState: Partial<CallState>) {
      Object.assign(this, partialState);
    },

    /**
     * 更新当前通话信息
     */
    updateCurrentCall(partialCall: Partial<CurrentCallInfo>) {
      if (!this.currentCall) {
        this.currentCall = {
          callId: this.generateCallId(),
          callerId: "",
          calleeIds: [],
          callType: "audio",
          startTime: Date.now(),
          duration: 0,
          status: "idle",
          participants: [],
          isGroupCall: false,
        };
      }
      Object.assign(this.currentCall, partialCall);
    },

    /**
     * 设置通话状态
     */
    setCallStatus(status: CallStatus) {
      this.status = status;
      this.isInCall = status !== "idle" && status !== "ended";
    },

    /**
     * 重置所有通话状态
     */
    resetCallState() {
      this.status = "idle";
      this.isInCall = false;
      this.callType = null;
      this.currentCall = null;
      this.incomingCall = null;
      this.settings = {
        enableAudio: true,
        enableVideo: true,
        enableSpeaker: true,
        enableMicrophone: true,
      };
    },

    /**
     * 重置当前通话信息
     */
    resetCurrentCall() {
      this.currentCall = null;
    },

    /**
     * 重置来电信息
     */
    resetIncomingCall() {
      this.incomingCall = null;
    },

    /**
     * 生成唯一通话ID
     */
    generateCallId(): string {
      return `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    },

    /**
     * 更新通话设置
     */
    updateSettings(partialSettings: Partial<CallState["settings"]>) {
      Object.assign(this.settings, partialSettings);
    },
  },
});
