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
    invitedMembers: [], //被邀请成员列表
    joinedMembers: [], //已加入成员列表
    inviteMessageId: "",
    duration: "",
    // 超时设置
    inviteTimeout: 30000, // 默认30秒超时
    inviteTimeoutTimer: null,
    userInfoMap: new Map(), // 用户ID到用户信息的映射
    UIdToUserIdMap: new Map(), // UID到用户ID的映射
    // 窗口模式状态
    isMinimized: false, // 默认为大窗口模式
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
      const { type, calleeUserId, groupId, groupName, groupAvatar, invitedMembers } =
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
        this.invitedMembers = invitedMembers || [];
      }
      this.callId = generateRandomChannel(10);
      this.channel = generateRandomChannel(8);
      this.status = CALL_STATUS.INVITING;

      // 开始超时计时
      this.startTimeoutTimer();
    },
    /** 设置用户信息 */
    setUserInfo(
      userId: string,
      userInfo: { nickname?: string; avatarURL?: string }
    ) {
      if (this.userInfoMap) {
        this.userInfoMap.set(userId, userInfo);
      }
    },
    //更新invitedMembers
    updateInvitedMembers(members: string[]) {
      this.invitedMembers = members;
    },
    /**
     * 开始超时计时
     * 支持传入callback，超时后执行callback
     */
    startTimeoutTimer(callback?: () => void) {
      // 先清除已有的定时器，避免重复计时
      this.clearTimeoutTimer();

      // 设置新的超时定时器
      if (this.inviteTimeout) {
        this.inviteTimeoutTimer = setTimeout(() => {
          this.handleTimeout();
          callback?.();
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
      
      // 🔑 关键修复：多人通话场景下，超时后不自动隐藏界面
      // 用户需要手动挂断才能正确销毁资源
      const isMultiCall = this.type === CALL_TYPE.VIDEO_MULTI || this.type === CALL_TYPE.AUDIO_MULTI;
      
      if (isMultiCall) {
        console.log("多人通话邀请超时，保持界面等待用户手动挂断");
        // 多人通话保持当前状态，由用户主动挂断
        // 可以在这里触发超时提示事件
        return;
      }
      
      // 单人通话场景下，设置状态为IDLE，自动隐藏界面
      this.setCallStatus(CALL_STATUS.IDLE);
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
      this.duration = "";
      
      // 重置群组通话相关状态
      this.groupId = "";
      this.groupName = "";
      this.groupAvatar = "";
      this.invitedMembers = [];
      this.joinedMembers = [];
      
      // 重置通话类型为默认值
      this.type = CALL_TYPE.AUDIO_1V1;
      
      // 清空用户信息映射
      this.userInfoMap.clear();
      this.UIdToUserIdMap.clear();
      
      // 重置窗口模式
      this.isMinimized = false;
      
      // 保持caller相关信息，因为这些通常不会改变
    },

    /**
     * 构建邀请所需的通话信息，并更新至state中
     * @param inviteInfo 邀请信息
     */
    buildAndUpdateInviteState(inviteInfo: INVITE_INFO) {
      this.initInviteInfo(inviteInfo);
      // 可以在这里添加更多的构建逻辑
      return this.state as unknown as CallState;
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
    getCallStatus(): CALL_STATUS {
      return this.status as CALL_STATUS;
    },
    getCallState(): CallState {
      return this as CallState;
    },
    /** 获取用户信息 */
    getUserInfo(): (userId: string) => {
      nickname?: string;
      avatarURL?: string;
    } {
      return (userId: string) => {
        if (!this.userInfoMap) {
          return {};
        }
        return this.userInfoMap.get(userId) || {};
      };
    },
    //获取定时器状态
    getInviteTimeoutTimer(): number | null {
      return this.inviteTimeoutTimer;
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

    getInvitedMembers(): string[] {
      return this.invitedMembers || [];
    },
    
    /**
     * 判断是否为小窗口模式
     */
    getIsMinimized(): boolean {
      return this.isMinimized || false;
    },
  },
});
