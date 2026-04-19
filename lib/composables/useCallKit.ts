import { useChatClientStore } from "../store/chatClient";
import type { UseCallKitReturn } from "../types";
import { useCallStateStore } from "../store/callState";
import { CALL_STATUS, CALL_TYPE } from "../types/callstate.types";
import { logger } from "../utils/logger";
import { useSignalManager } from "./useSignalManager";
import { useJoinChannel } from "./useJoinChannel";
import { USE_NEW_GROUP_CALL } from "../config/featureFlags";
import { useGroupCallStore } from "../modules/groupCall";

// 组合式API：useCallKit
export function useCallKit(): UseCallKitReturn {
  const chatClientStore = useChatClientStore();
  const callStateStore = useCallStateStore();
  const startSingleCall = async (
    targetId: string,
    type: "audio" | "video",
    msg: string
  ) => {
    logger.debug(
      `startSingleCall: 开始发起单人${type}通话，目标用户ID: ${targetId}`
    );

    if (!chatClientStore.getChatClient) {
      logger.warn("ChatClient未初始化，请确保在Provider内使用");
      return;
    }

    //设置当前通话状态为inviting
    callStateStore.initInviteInfo({
      calleeUserId: targetId,
      type: type === "audio" ? CALL_TYPE.AUDIO_1V1 : CALL_TYPE.VIDEO_1V1,
    });

    logger.verbose(`startSingleCall: 已初始化邀请信息，通话类型: ${type}`);
    // 使用信令管理器处理信令发送
    const { sendInviteMessage } = useSignalManager();
    try {
      // 使用信令管理器发送邀请消息
      const message = await sendInviteMessage(
        targetId,
        "singleChat" as any,
        msg
      );
      logger.info(
        `startSingleCall: 发送单人通话邀请信息成功，消息ID: ${message.serverMsgId}`
      );
      logger.verbose(`startSingleCall: 邀请消息详情:`, message);
    } catch (error) {
      logger.error(`startSingleCall: 发送单人通话邀请信息失败:`, error);
    }
  };
  const startGroupCall = async (
    groupId: string,
    members: string[],
    type: "audio" | "video",
    msg: string,
    groupName?: string,
    groupAvatar?: string
  ) => {
    logger.debug(
      `startGroupCall: 开始发起群组${type}通话，群组ID: ${groupId}，邀请成员数: ${members.length}`
    );

    if (!chatClientStore.getChatClient) {
      logger.warn("ChatClient未初始化，请确保在Provider内使用");
      return;
    }

    if (!members || members.length === 0) {
      logger.warn("群组通话必须指定邀请成员列表");
      return;
    }

    try {
      // 设置当前通话状态为inviting
      callStateStore.initInviteInfo({
        groupId,
        groupName,
        groupAvatar,
        calleeUserId: groupId,
        type: type === "audio" ? CALL_TYPE.AUDIO_MULTI : CALL_TYPE.VIDEO_MULTI,
        invitedMembers: members,
      });

      logger.verbose(`startGroupCall: 已初始化群组邀请信息，通话类型: ${type}`);
      logger.info(`startGroupCall: 准备发送群组通话邀请信息`);

      // 使用信令管理器发送群组邀请消息
      const { sendInviteMessage } = useSignalManager();
      try {
        const message = await sendInviteMessage(
          members,
          "groupChat" as any,
          msg,
          groupId
        );
        logger.info(
          `startGroupCall: 发送群组通话邀请信息成功，消息ID: ${message.serverMsgId}`
        );
        logger.verbose(`startGroupCall: 邀请消息详情:`, message);
        
        // 主叫方发送邀请后，立即将状态更新为IN_CALL并加入RTC频道
        logger.info('startGroupCall: 主叫方立即加入RTC频道')
        callStateStore.setCallStatus(CALL_STATUS.IN_CALL)

        // 如果启用了新群组通话模块，提前初始化 Store
        if (USE_NEW_GROUP_CALL) {
          const groupCallStore = useGroupCallStore()
          const currentUserId = chatClientStore.getChatClient?.user || ''
          groupCallStore.initSession({
            sessionId: callStateStore.getCallState.channel || groupId,
            groupId,
            callType: type,
            isActive: true,
            startTime: Date.now(),
          })
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
          })
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
            })
          })
        }

        // 加入RTC频道
        const { joinChannel } = useJoinChannel()
        await joinChannel()
        logger.info('startGroupCall: 主叫方已成功加入RTC频道')
      } catch (error) {
        logger.error(`startGroupCall: 发送群组通话邀请信息失败:`, error);
        throw error;
      }
    } catch (error) {
      logger.error(`startGroupCall: 群组通话初始化失败:`, error);
      throw error;
    }
  };
  return {
    startSingleCall,
    startGroupCall,
  };
}
