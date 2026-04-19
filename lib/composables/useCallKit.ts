import { useChatClientStore } from "../store/chatClient";
import type { UseCallKitReturn } from "../types";
import { useCallStateStore } from "../store/callState";
import { CALL_STATUS, CALL_TYPE, HANGUP_REASON } from "../types/callstate.types";
import { logger } from "../utils/logger";
import { useSignalManager } from "./useSignalManager";
import { useJoinChannel } from "./useJoinChannel";
import { useGroupCallStore } from "../modules/groupCall";
import { callService } from "../services/CallService";
import { callKitEventBus } from "../core/events/CallKitEventBus";

// 组合式API：useCallKit —— 统一的通话控制入口
export function useCallKit(): UseCallKitReturn {
  const chatClientStore = useChatClientStore();
  const callStateStore = useCallStateStore();
  const { sendInviteMessage, sendAnswerMessage } = useSignalManager();

  // ─── 发起 ───

  const call = async (
    targetId: string,
    type: "audio" | "video",
    msg: string = type === 'audio' ? '邀请您进行语音通话' : '邀请您进行视频通话'
  ) => {
    logger.debug(`call: 发起单人${type}通话，目标: ${targetId}`);
    if (!chatClientStore.getChatClient) {
      logger.warn("ChatClient 未初始化");
      return;
    }
    callStateStore.initInviteInfo({
      calleeUserId: targetId,
      type: type === "audio" ? CALL_TYPE.AUDIO_1V1 : CALL_TYPE.VIDEO_1V1,
    });
    try {
      const message = await sendInviteMessage(targetId, "singleChat" as any, msg);
      logger.info(`call: 邀请发送成功，msgId: ${message.serverMsgId}`);
    } catch (error) {
      logger.error(`call: 邀请发送失败`, error);
    }
  };

  const groupCall = async (
    groupId: string,
    members: string[],
    type: "audio" | "video",
    msg: string = type === 'audio' ? '邀请您加入群组语音通话' : '邀请您加入群组视频通话',
    groupName?: string,
    groupAvatar?: string
  ) => {
    logger.debug(`groupCall: 发起群组${type}通话，groupId: ${groupId}`);
    if (!chatClientStore.getChatClient) {
      logger.warn("ChatClient 未初始化");
      return;
    }
    if (!members || members.length === 0) {
      logger.warn("群组通话必须指定邀请成员列表");
      return;
    }

    try {
      callStateStore.initInviteInfo({
        calleeUserId: groupId,
        type: type === "audio" ? CALL_TYPE.AUDIO_MULTI : CALL_TYPE.VIDEO_MULTI,
      });

      const message = await sendInviteMessage(members, "groupChat" as any, msg, groupId);
      logger.info(`groupCall: 邀请发送成功，msgId: ${message.serverMsgId}`);

      // 主叫方立即进入 IN_CALL 并加入 RTC
      callStateStore.setCallStatus(CALL_STATUS.IN_CALL);

      // 触发 callStarted（群通话主叫方）
      const currentCallState = callStateStore.getCallState;
      callKitEventBus.emit('callStarted', {
        callId: currentCallState.callId,
        channel: currentCallState.channel,
        type: currentCallState.type,
        callerUserId: currentCallState.callerUserId,
        calleeUserId: currentCallState.calleeUserId,
        groupId: groupId,
        isCaller: true,
      });

      const groupCallStore = useGroupCallStore();
      const currentUserId = chatClientStore.getChatClient?.user || '';
      groupCallStore.initSession({
        sessionId: callStateStore.getCallState.channel || groupId,
        groupId,
        callType: type,
        isActive: true,
        startTime: Date.now(),
      });
      groupCallStore.addParticipant({
        userId: currentUserId,
        nickname: currentUserId,
        state: 'joinedRtc',
        isLocal: true,
        videoTrack: null,
        audioTrack: null,
        localStream: null,
        isMuted: false,
        isCameraOn: type === 'video',
        isSpeaking: false,
      });
      members.forEach((m) => {
        groupCallStore.addParticipant({
          userId: m,
          nickname: m,
          state: 'invited',
          isLocal: false,
          videoTrack: null,
          audioTrack: null,
          localStream: null,
          isMuted: false,
          isCameraOn: false,
          isSpeaking: false,
        });
      });

      const { joinChannel } = useJoinChannel();
      await joinChannel();
      logger.info('groupCall: 主叫方已加入 RTC 频道');
    } catch (error) {
      logger.error(`groupCall: 发起失败`, error);
      throw error;
    }
  };

  // ─── 结束 ───

  const hangup = async (reason: HANGUP_REASON = HANGUP_REASON.HANGUP) => {
    logger.info("useCallKit.hangup", { reason });
    await callService.hangup(reason);
  };

  const cancel = async () => {
    logger.info("useCallKit.cancel");
    const callState = callStateStore.getCallState;
    callKitEventBus.emit('callCanceled', {
      callId: callState.callId,
      channel: callState.channel,
      type: callState.type,
      isRemote: false,
      callerUserId: callState.callerUserId,
      calleeUserId: callState.calleeUserId,
      groupId: undefined,
    });
    await callService.cancelCall();
  };

  // ─── 应答 ───

  const accept = async () => {
    logger.info("useCallKit.accept");
    const callState = callStateStore.getCallState;
    if (!callState.callerUserId) {
      logger.error("accept: 无法获取主叫方 ID");
      throw new Error("无法获取主叫方 ID");
    }
    if (callStateStore.getCallStatus !== CALL_STATUS.ALERTING) {
      logger.warn(`accept: 当前状态不是 ALERTING，无法接听`);
      return;
    }
    if (callStateStore.getInviteTimeoutTimer) {
      callStateStore.clearTimeoutTimer();
    }
    await sendAnswerMessage(
      callState.callerUserId,
      { callId: callState.callId, callerDevId: callState.callerDevId, calleeDevId: chatClientStore.getClientDeviceId },
      "accept" as any
    );
    callStateStore.setCallStatus(CALL_STATUS.ANSWER_CALL);
    logger.info("useCallKit.accept: 已发送接听信令");
  };

  const reject = async () => {
    logger.info("useCallKit.reject");
    const callState = callStateStore.getCallState;
    if (!callState.callerUserId) {
      logger.error("reject: 无法获取主叫方 ID");
      throw new Error("无法获取主叫方 ID");
    }
    if (callStateStore.getInviteTimeoutTimer) {
      callStateStore.clearTimeoutTimer();
    }
    await sendAnswerMessage(
      callState.callerUserId,
      { callId: callState.callId, callerDevId: callState.callerDevId, calleeDevId: chatClientStore.getClientDeviceId },
      "refuse" as any
    );
    callStateStore.resetCallState();
    logger.info("useCallKit.reject: 已发送拒绝信令");
  };

  const rejectBusy = async () => {
    logger.info("useCallKit.rejectBusy");
    const callState = callStateStore.getCallState;
    if (!callState.callerUserId) {
      logger.error("rejectBusy: 无法获取主叫方 ID");
      throw new Error("无法获取主叫方 ID");
    }
    if (callStateStore.getInviteTimeoutTimer) {
      callStateStore.clearTimeoutTimer();
    }
    await sendAnswerMessage(
      callState.callerUserId,
      { callId: callState.callId, callerDevId: callState.callerDevId, calleeDevId: chatClientStore.getClientDeviceId },
      "busy" as any
    );
    callStateStore.resetCallState();
    logger.info("useCallKit.rejectBusy: 已发送忙碌拒绝信令");
  };

  return {
    call,
    groupCall,
    hangup,
    cancel,
    accept,
    reject,
    rejectBusy,
  };
}
