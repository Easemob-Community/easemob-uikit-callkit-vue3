import { defineStore } from "pinia";
import type { CallState, INVITE_INFO } from "./types";
import { CALL_STATUS, CALL_TYPE } from "../types/callstate.types";
import type { Chat } from "../core/sdk/imSDK";
import { generateRandomChannel } from "../utils";
export const useCallStateStore = defineStore("callState", {
  /**
   * 通话状态数据
   */
  state: (): CallState => ({
    // 基础状态
    status: CALL_STATUS.IDLE,
    callType: null,
    callId: "",
    channel: "",
    token: "",
    type: CALL_TYPE.AUDIO_1V1,
    callerDevId: "",
    calleeDevId: "",
    callerUserId: "",
    calleeUserId: "",
    groupId: "",
    groupName: "",
    groupAvatar: "",
    invitedMembers: [],
    joinedMembers: [],
    inviteMessageId: "",
    duration: "",
    // 超时设置
    inviteTimeout: 30000, // 默认30秒超时
    inviteTimeoutTimer: null,
  }),

  /**
   * 状态更新方法
   */
  actions: {
    //通过传入的chatClient，初始化部分state内容。
    initCallState(chatClient: Chat.Connection) {
      this.callerDevId = chatClient.context.jid.clientResource || "web";
      this.callerUserId = chatClient.context.userId;
      this.token = chatClient.token;
    },
    //初始化邀请信息状态创建
    initInviteInfo(inviteInfo: INVITE_INFO) {
      const { type, calleeUserId, groupId, groupName, groupAvatar } =
        inviteInfo;
      this.type = type;
      this.calleeUserId = calleeUserId;
      // 修复逻辑错误：判断是否为群呼
      if (
        this.type === CALL_TYPE.AUDIO_MULTI ||
        this.type === CALL_TYPE.VIDEO_MULTI
      ) {
        this.groupId = groupId || "";
        this.groupName = groupName || "";
        this.groupAvatar = groupAvatar || "";
      }
      this.callId = generateRandomChannel(10);
      this.channel = generateRandomChannel(8);
      this.status = CALL_STATUS.INVITING;

      // 开始超时计时
      this.startTimeoutTimer();
    },

    /**
     * 开始超时计时
     */
    startTimeoutTimer() {
      // 先清除已有的定时器，避免重复计时
      this.clearTimeoutTimer();

      // 设置新的超时定时器
      if (this.inviteTimeout) {
        this.inviteTimeoutTimer = setTimeout(() => {
          this.handleTimeout();
        }, this.inviteTimeout) as unknown as number;
      }
    },

    /**
     * 清除超时计时器
     */
    clearTimeoutTimer() {
      if (this.inviteTimeoutTimer) {
        clearTimeout(this.inviteTimeoutTimer);
        this.inviteTimeoutTimer = null;
      }
    },

    /**
     * 处理超时逻辑
     */
    handleTimeout() {
      console.warn("通话邀请超时");
      // 设置状态为超时
      this.setCallStatus(CALL_STATUS.IDLE);
      // 可以在这里触发超时事件或回调
      // 实际项目中可能需要根据不同的状态进行不同的处理
    },
    /**
     * 更新部分通话状态
     */
    updateCallState(partialState: Partial<CallState>) {
      Object.assign(this, partialState);
    },

    /**
     * 设置通话状态
     */
    setCallStatus(status: CALL_STATUS) {
      this.status = status;
    },

    /**
     * 重置所有通话状态
     */
    resetCallState() {
      // 清除超时计时器
      this.clearTimeoutTimer();

      this.status = CALL_STATUS.IDLE;
      this.callType = null;
      // 重置其他状态字段
      this.callId = "";
      this.channel = "";
      this.calleeUserId = "";
      this.calleeDevId = "";
      this.inviteMessageId = "";
      // 保持caller相关信息，因为这些通常不会改变
    },

    /**
     * 构建邀请所需的通话信息，并更新至state中
     * @param inviteInfo 邀请信息
     */
    buildAndUpdateInviteState(inviteInfo: INVITE_INFO) {
      this.initInviteInfo(inviteInfo);
      // 可以在这里添加更多的构建逻辑
      return this.state as CallState;
    },

    /**
     * 生成唯一通话ID
     */
    generateCallId(): string {
      return `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    },
  },
  /**
   * 计算属性
   */
  getters: {
    /**
     * 只读获取当前CallState
     */
    getCallState(): CallState {
      return { ...this } as CallState;
    },

    /**
     * 判断是否处于邀请中状态
     */
    isInviting(): boolean {
      return this.status === CALL_STATUS.INVITING;
    },

    /**
     * 判断是否处于通话中
     */
    isInCall(): boolean {
      // 根据实际业务需求定义通话中状态
      return this.status !== CALL_STATUS.IDLE;
    },
  },
});
