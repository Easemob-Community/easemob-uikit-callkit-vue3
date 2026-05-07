/**
 * useCallKitCore —— CallKitCore Vue3 适配层（双轨并行方案）
 *
 * 职责：
 * 1. 封装 `@easemob/callkit-core` 的 `CallKitCore` 实例
 * 2. 将 Core 事件映射回 Pinia Store（callStateStore / groupCallStore）
 * 3. 将 Core 事件转发到 `callKitEventBus`，保持现有 UI 组件兼容性
 * 4. 处理 `shouldJoinRtc` → 调用现有 `useJoinChannel().joinChannel()`
 *
 * 约束：
 * - 不修改任何现有 `lib/` 文件
 * - 返回接口与 `useCallKit()` 完全一致
 */

import { onUnmounted } from 'vue'
import { ChatSDK } from '../core/sdk/imSDK'
import {
  CallKitCore,
  CALL_STATUS as CoreCallStatus,
  CALL_TYPE as CoreCallType,
  HANGUP_REASON as CoreHangupReason,
} from '@easemob/callkit-core'
import type { CallKitEvent as CoreEvent } from '@easemob/callkit-core'

import { useChatClientStore } from '../store/chatClient'
import { useCallStateStore } from '../store/callState'
import { useGlobalCallStore } from '../store/globalCall'
import { useGroupCallStore } from '../modules/groupCall'
import { useRtcChannelStore } from '../store/rtcChannel'
import { useSingleCallRtcStore } from '../store/singleCallRtc'
import { CALL_STATUS, CALL_TYPE, HANGUP_REASON } from '../types/callstate.types'
import type { UseCallKitReturn, CallParams, GroupCallParams } from '../types'
import { callKitEventBus } from '../core/events/CallKitEventBus'
import { buildBaseEventFields, getCurrentUserId } from '../core/events/helpers'
import { logger } from '../utils/logger'
import { useJoinChannel } from './useJoinChannel'
import { useListenerManager } from './useListenerManager'

// ───────────────────────────────────────────────
// 辅助：Core reason → lib HANGUP_REASON 映射
// ───────────────────────────────────────────────

function mapCoreReasonToLib(
  reason: 'hangup' | 'cancel' | 'refuse' | 'busy' | 'timeout' | 'remoteHangup' | 'remoteCancel'
): HANGUP_REASON {
  const map: Record<string, HANGUP_REASON> = {
    hangup: HANGUP_REASON.HANGUP,
    cancel: HANGUP_REASON.CANCEL,
    remoteCancel: HANGUP_REASON.REMOTE_CANCEL,
    refuse: HANGUP_REASON.REFUSE,
    busy: HANGUP_REASON.BUSY,
    timeout: HANGUP_REASON.NO_RESPONSE,
    remoteHangup: HANGUP_REASON.HANGUP,
  }
  return map[reason] || HANGUP_REASON.ABNORMAL_END
}

// ───────────────────────────────────────────────
// 辅助：构建 event bus payload 的基础字段
// ───────────────────────────────────────────────

function buildEventContext(
  callState: ReturnType<ReturnType<typeof useCallStateStore>['$state']>
) {
  return {
    callId: callState.callId,
    channel: callState.channel,
    type: callState.type,
    callerUserId: callState.callerUserId,
    calleeUserId: callState.calleeUserId,
    groupId: undefined as string | undefined,
  }
}

// ───────────────────────────────────────────────
// 模块级单例（供 InvitationNotification 等组件跨 setup 调用）
// ───────────────────────────────────────────────

let sharedCoreInstance: CallKitCore | null = null
let coreRefCount = 0

export function isCoreActive(): boolean {
  return sharedCoreInstance !== null
}

// ───────────────────────────────────────────────
// Composable
// ───────────────────────────────────────────────

export function useCallKitCore(): UseCallKitReturn {
  const chatClientStore = useChatClientStore()
  const callStateStore = useCallStateStore()
  const globalCallStore = useGlobalCallStore()
  const rtcChannelStore = useRtcChannelStore()
  const singleCallRtcStore = useSingleCallRtcStore()

  /**
   * 清理 RTC 资源（离开频道 + 释放轨道）
   */
  const cleanupRtc = async (): Promise<void> => {
    const rtcService = rtcChannelStore.getRtcService()
    if (rtcService) {
      try {
        await rtcService.leaveChannel()
        logger.info('[useCallKitCore] RTC 频道已离开')
      } catch (e) {
        logger.warn('[useCallKitCore] 离开 RTC 频道失败', e)
      }
    }
    singleCallRtcStore.clearLeftUsers()
  }

  /**
   * 懒创建 CallKitCore 实例
   */
  const ensureCore = (): CallKitCore => {
    const imClient = chatClientStore.getChatClient
    if (!imClient) {
      throw new Error('ChatClient 未初始化')
    }
    if (!sharedCoreInstance) {
      // 卸载旧链路监听器，避免 IM 消息被重复处理
      try {
        const { unmountListeners } = useListenerManager()
        unmountListeners()
        logger.info('[useCallKitCore] 旧链路 IM 监听器已卸载')
      } catch (e) {
        logger.warn('[useCallKitCore] 卸载旧链路监听器失败（可能尚未挂载）', e)
      }

      sharedCoreInstance = new CallKitCore({
        imClient: imClient as any,
        onEvent: handleCoreEvent,
        inviteTimeout: callStateStore.inviteTimeout || 30000,
        userProfile: {
          userId: imClient.user || '',
          nickname: globalCallStore.getUserInfo(imClient.user || '').nickname,
          avatarURL: globalCallStore.getUserInfo(imClient.user || '').avatarURL,
        },
        createMessage: (options: any) => ChatSDK.message.create(options),
      })
      logger.warn('🟢 [useCallKitCore] CallKitCore 实例已创建 → CORE 链路正式接管')
    }
    return sharedCoreInstance
  }

  /**
   * Core 事件处理器：同步到 Pinia Store + 转发到 EventBus
   */
  function handleCoreEvent(event: CoreEvent): void {
    const currentUserId = getCurrentUserId()

    switch (event.type) {
      // ── 单聊：来电 ──
      case 'incomingCall': {
        const p = event.payload
        logger.warn(
          `📞 [useCallKitCore] incomingCall | callId=${p.callId} | caller=${p.callerUserId} | type=${p.callType}`
        )
        callStateStore.updateCallState({
          callId: p.callId,
          channel: p.channel,
          type: p.callType,
          callerDevId: p.callerDevId,
          callerUserId: p.callerUserId,
          calleeUserId: p.calleeUserId,
          token: p.token,
        })
        logger.warn('🔄 [useCallKitCore] 单聊被叫方 → callStateStore.setCallStatus(ALERTING)')
        callStateStore.setCallStatus(CALL_STATUS.ALERTING)
        callStateStore.startTimeoutTimer()

        callKitEventBus.emit('incomingCall', {
          ...buildBaseEventFields(
            {
              callId: p.callId,
              channel: p.channel,
              type: p.callType,
              callerUserId: p.callerUserId,
              calleeUserId: p.calleeUserId,
            },
            false
          ),
          callerDevId: p.callerDevId,
          calleeDevId: callStateStore.calleeDevId,
          groupName: p.groupName,
          groupAvatar: undefined,
          invitedMembers: p.invitedMembers,
        })
        break
      }

      // ── 状态变化 ──
      // setCallStatus 内部已 emit statusChanged 到 event bus，此处不重复 emit
      case 'statusChanged': {
        const to = parseInt(event.payload.to, 10)
        if (isNaN(to)) break

        // 主叫方收到 alert 后，Core 状态机变为 ALERTING，但 lib/ 中 ALERTING 是被叫方响铃状态
        // 主叫方同步 ALERTING 会导致 InvitationNotification 错误弹窗
        const isCaller = callStateStore.callerUserId === currentUserId
        if (isCaller && to === CALL_STATUS.ALERTING) {
          logger.debug('[useCallKitCore] 主叫方忽略 ALERTING 状态同步')
          break
        }

        logger.warn(
          `🔄 [useCallKitCore] statusChanged: callStateStore.setCallStatus(${to}) | 当前用户=${currentUserId} | isCaller=${isCaller}`
        )
        callStateStore.setCallStatus(to)
        break
      }

      // ── 通话开始 ──
      case 'callStarted': {
        callStateStore.setCallStatus(CALL_STATUS.IN_CALL)
        const ctx = buildEventContext(callStateStore)
        callKitEventBus.emit('callStarted', {
          ...buildBaseEventFields(ctx, event.payload.isCaller),
          isCaller: event.payload.isCaller,
        })
        break
      }

      // ── 通话结束 ──
      case 'callEnded': {
        const ctx = buildEventContext(callStateStore)
        const reason = mapCoreReasonToLib(event.payload.reason)
        const duration = event.payload.duration || 0
        callStateStore.resetCallState()
        cleanupRtc().catch((e) => logger.warn('[useCallKitCore] RTC 清理失败', e))
        callKitEventBus.emit('callEnded', {
          ...buildBaseEventFields(ctx, false),
          reason,
          duration,
        })
        break
      }

      // ── 超时 ──
      // 注：状态重置由紧随其后的 callEnded 统一处理，避免重复 reset
      case 'callTimeout': {
        const ctx = buildEventContext(callStateStore)
        callKitEventBus.emit('callTimeout', buildBaseEventFields(ctx, false))
        break
      }

      // ── 拒绝 ──
      case 'callRefused': {
        const ctx = buildEventContext(callStateStore)
        callKitEventBus.emit('callRefused', {
          ...buildBaseEventFields(ctx, false),
          isRemote: event.payload.isRemote,
        })
        break
      }

      // ── 忙线 ──
      case 'callBusy': {
        const ctx = buildEventContext(callStateStore)
        callKitEventBus.emit('callBusy', buildBaseEventFields(ctx, false))
        break
      }

      // ── 取消 ──
      case 'callCanceled': {
        const ctx = buildEventContext(callStateStore)
        callKitEventBus.emit('callCanceled', {
          ...buildBaseEventFields(ctx, false),
          isRemote: event.payload.isRemote,
        })
        break
      }

      // ── RTC 加入指令 ──
      case 'shouldJoinRtc': {
        const { joinChannel } = useJoinChannel()
        joinChannel().catch((err) => {
          logger.error('[useCallKitCore] 加入 RTC 频道失败', err)
        })
        break
      }

      // ── 群聊初始化 ──
      case 'groupCallInit': {
        const p = event.payload
        const groupCallStore = useGroupCallStore()
        const isCaller = p.callerUserId === currentUserId

        logger.warn(
          `👥 [useCallKitCore] groupCallInit | callId=${p.callId} | channel=${p.channel} | isCaller=${isCaller} | currentUser=${currentUserId}`
        )

        groupCallStore.initSession({
          sessionId: p.channel,
          groupId: p.groupId,
          groupName: p.groupName || p.groupId,
          callType: p.callType,
          isActive: true,
          startTime: Date.now(),
        })

        // 添加本地用户（主叫方=joinedRtc，被邀请方=invited）
        const localUserInfo = globalCallStore.getUserInfo(currentUserId)
        groupCallStore.addParticipant({
          userId: currentUserId,
          nickname: localUserInfo.nickname || currentUserId,
          avatarUrl: localUserInfo.avatarURL,
          state: isCaller ? 'joinedRtc' : 'invited',
          isLocal: true,
          videoTrack: null,
          audioTrack: null,
          localStream: null,
          isMuted: false,
          isCameraOn: isCaller && p.callType === 'video',
          isSpeaking: false,
        })

        // 添加被邀请成员
        for (const memberId of p.invitedMembers) {
          if (memberId === currentUserId) continue
          const memberInfo = globalCallStore.getUserInfo(memberId)
          groupCallStore.addParticipant({
            userId: memberId,
            nickname: memberInfo.nickname || memberId,
            avatarUrl: memberInfo.avatarURL,
            state: 'invited',
            isLocal: false,
            videoTrack: null,
            audioTrack: null,
            localStream: null,
            isMuted: false,
            isCameraOn: false,
            isSpeaking: false,
          })
        }

        // 同步 callStateStore（UI 组件如 EasemobChatMultiCall 依赖）
        callStateStore.updateCallState({
          callId: p.callId,
          channel: p.channel,
          type: p.callType === 'video' ? CALL_TYPE.VIDEO_MULTI : CALL_TYPE.AUDIO_MULTI,
          callerUserId: p.callerUserId,
          calleeUserId: p.groupId,
        })

        // 被邀请方需要进入 ALERTING 状态以触发 UI 显示
        if (isCaller) {
          logger.warn('🔄 [useCallKitCore] 群聊主叫方 → callStateStore.setCallStatus(IN_CALL)')
          callStateStore.setCallStatus(CALL_STATUS.IN_CALL)
        } else {
          logger.warn('🔄 [useCallKitCore] 群聊被叫方 → callStateStore.setCallStatus(ALERTING) + startTimeoutTimer')
          callStateStore.setCallStatus(CALL_STATUS.ALERTING)
          callStateStore.startTimeoutTimer()
        }
        break
      }

      // ── 群聊参与者状态变化 ──
      case 'participantStateChanged': {
        const groupCallStore = useGroupCallStore()
        const { userId, state } = event.payload
        if (state === 'accepted') {
          groupCallStore.markAccepted(userId)
        } else {
          groupCallStore.setParticipantState(userId, state as any)
        }
        break
      }

      // ── 群聊参与者加入 ──
      case 'participantJoined': {
        const p = event.payload
        const groupCallStore = useGroupCallStore()
        groupCallStore.addParticipant({
          userId: p.userId,
          nickname: p.userId,
          state: 'joinedRtc',
          isLocal: false,
          videoTrack: null,
          audioTrack: null,
          localStream: null,
          isMuted: false,
          isCameraOn: false,
          isSpeaking: false,
        })
        callKitEventBus.emit('participantJoined', {
          userId: p.userId,
          callId: p.callId,
          channel: p.channel,
          groupId: p.groupId,
          conversationId: p.groupId || '',
          isLocal: false,
          localUserRole: 'participant',
        })
        break
      }

      // ── 群聊参与者离开 ──
      case 'participantLeft': {
        const p = event.payload
        const groupCallStore = useGroupCallStore()
        groupCallStore.removeParticipant(p.userId)
        callKitEventBus.emit('participantLeft', {
          userId: p.userId,
          callId: p.callId,
          channel: p.channel,
          groupId: p.groupId,
          reason: p.reason,
          conversationId: p.groupId || '',
          isLocal: false,
          localUserRole: 'participant',
        })
        break
      }

      // ── RTC 离开指令 ──
      case 'shouldLeaveRtc': {
        cleanupRtc().catch((e) => logger.warn('[useCallKitCore] RTC 清理失败', e))
        break
      }

      // ── 发布轨道 ──
      case 'shouldPublishTracks': {
        logger.debug('[useCallKitCore] shouldPublishTracks 暂不处理')
        break
      }

      // ── 本地音频状态变化 ──
      case 'localAudioChanged': {
        rtcChannelStore.setAudioEnabled(event.payload.enabled)
        logger.debug('[useCallKitCore] 本地音频状态:', event.payload.enabled)
        break
      }

      // ── 本地视频状态变化 ──
      case 'localVideoChanged': {
        rtcChannelStore.setVideoEnabled(event.payload.enabled)
        logger.debug('[useCallKitCore] 本地视频状态:', event.payload.enabled)
        break
      }

      default:
        // @ts-ignore
        logger.warn(`[useCallKitCore] 未知事件类型: ${event.type}`)
    }
  }

  // ───────────────────────────────────────────────
  // 生命周期
  // ───────────────────────────────────────────────

  coreRefCount++
  onUnmounted(() => {
    coreRefCount--
    if (coreRefCount === 0 && sharedCoreInstance) {
      sharedCoreInstance.destroy()
      sharedCoreInstance = null
      logger.info('[useCallKitCore] CallKitCore 实例已销毁（refCount=0）')
    }
  })

  // ───────────────────────────────────────────────
  // 公开 API（与 useCallKit 保持一致）
  // ───────────────────────────────────────────────

  const call = async ({
    targetId,
    type,
    userInfo,
  }: CallParams) => {
    logger.debug(`[useCallKitCore] 发起单人${type}通话，目标: ${targetId}`)
    const core = ensureCore()
    const callType = type === 'audio' ? CALL_TYPE.AUDIO_1V1 : CALL_TYPE.VIDEO_1V1

    try {
      await core.inviteCall({
        calleeUserId: targetId,
        callType,
        ext: userInfo ? { ease_chat_uikit_user_info: userInfo } : undefined,
      })
      logger.info(`[useCallKitCore] 单人通话邀请已发送: ${targetId}`)

      // 从 Core 同步 callId/channel/token 到 Store（避免两边各自生成不一致的值）
      const coreState = core.getSingleCallState()
      callStateStore.updateCallState({
        callId: coreState.callId,
        channel: coreState.channel,
        type: coreState.type,
        token: coreState.token,
        callerUserId: coreState.callerUserId,
        callerDevId: coreState.callerDevId,
        calleeUserId: coreState.calleeUserId,
      })
      callStateStore.setCallStatus(CALL_STATUS.INVITING)
      callStateStore.startTimeoutTimer()
    } catch (error) {
      logger.error('[useCallKitCore] 发起单人通话失败', error)
      throw error
    }
  }

  const groupCall = async ({
    groupId,
    members,
    type,
    groupName,
    groupAvatar,
    userInfo,
  }: GroupCallParams) => {
    logger.debug(`[useCallKitCore] 发起群组${type}通话，groupId: ${groupId}`)
    if (!members || members.length === 0) {
      logger.warn('群组通话必须指定邀请成员列表')
      return
    }

    const core = ensureCore()
    const callType = type === 'audio' ? CALL_TYPE.AUDIO_MULTI : CALL_TYPE.VIDEO_MULTI

    try {
      await core.inviteGroupCall({
        groupId,
        participantIds: members,
        callType,
        ext: userInfo ? { ease_chat_uikit_user_info: userInfo } : undefined,
      })
      logger.info(`[useCallKitCore] 群组通话邀请已发送: ${groupId}`)

      // 从 Core 同步 callId/channel/token 到 Store
      const coreState = core.getSingleCallState()
      callStateStore.updateCallState({
        callId: coreState.callId,
        channel: coreState.channel,
        type: coreState.type,
        token: coreState.token,
        callerUserId: coreState.callerUserId,
        callerDevId: coreState.callerDevId,
        calleeUserId: groupId,
      })
      callStateStore.setCallStatus(CALL_STATUS.IN_CALL)

      // 主叫方同步 groupCallStore 和加入 RTC（Core 的 inviteGroupCall 不自动处理 RTC）
      const groupCallStore = useGroupCallStore()
      const currentUserId = chatClientStore.getChatClient?.user || ''
      const localUserInfo = globalCallStore.getUserInfo(currentUserId)

      groupCallStore.initSession({
        sessionId: coreState.channel || groupId,
        groupId,
        groupName: groupName || groupId,
        callType: type,
        isActive: true,
        startTime: Date.now(),
      })

      groupCallStore.addParticipant({
        userId: currentUserId,
        nickname: localUserInfo.nickname || currentUserId,
        avatarUrl: localUserInfo.avatarURL,
        state: 'joinedRtc',
        isLocal: true,
        videoTrack: null,
        audioTrack: null,
        localStream: null,
        isMuted: false,
        isCameraOn: type === 'video',
        isSpeaking: false,
      })

      for (const memberId of members) {
        if (memberId === currentUserId) continue
        const memberInfo = globalCallStore.getUserInfo(memberId)
        groupCallStore.addParticipant({
          userId: memberId,
          nickname: memberInfo.nickname || memberId,
          avatarUrl: memberInfo.avatarURL,
          state: 'invited',
          isLocal: false,
          videoTrack: null,
          audioTrack: null,
          localStream: null,
          isMuted: false,
          isCameraOn: false,
          isSpeaking: false,
        })
      }

      // 触发 callStarted（群通话主叫方）
      const currentCallState = callStateStore.getCallState
      callKitEventBus.emit('callStarted', {
        ...buildBaseEventFields(
          {
            callId: currentCallState.callId,
            channel: currentCallState.channel,
            type: currentCallState.type,
            callerUserId: currentCallState.callerUserId,
            calleeUserId: currentCallState.calleeUserId,
            groupId,
          },
          true
        ),
        isCaller: true,
      })

      // 主叫方立即加入 RTC
      const { joinChannel } = useJoinChannel()
      try {
        await joinChannel()
        logger.info('[useCallKitCore] 主叫方已加入 RTC 频道')
      } catch (rtcError) {
        logger.error('[useCallKitCore] 主叫方加入 RTC 失败', rtcError)
        // 不阻断流程：invite 已发出，被叫方仍可接受
      }
    } catch (error) {
      logger.error('[useCallKitCore] 发起群组通话失败', error)
      // 回滚
      try {
        const groupCallStore = useGroupCallStore()
        groupCallStore.destroySession()
        callStateStore.resetCallState()
      } catch (rollbackError) {
        logger.error('[useCallKitCore] 回滚失败', rollbackError)
      }
      throw error
    }
  }

  const hangup = async (reason: HANGUP_REASON = HANGUP_REASON.HANGUP) => {
    logger.info('[useCallKitCore] hangup', { reason })
    const core = ensureCore()
    await core.hangup()
    await cleanupRtc()
  }

  const cancel = async () => {
    logger.info('[useCallKitCore] cancel')
    const core = ensureCore()
    const callState = callStateStore.getCallState

    // 先 emit callCanceled（本地）
    callKitEventBus.emit('callCanceled', {
      ...buildBaseEventFields(
        {
          callId: callState.callId,
          channel: callState.channel,
          type: callState.type,
          callerUserId: callState.callerUserId,
          calleeUserId: callState.calleeUserId,
        },
        true
      ),
      isRemote: false,
    })

    await core.hangup({ reason: 'cancel' })
  }

  const accept = async () => {
    logger.info('[useCallKitCore] accept')
    const core = ensureCore()
    const callState = callStateStore.getCallState
    if (!callState.callerUserId) {
      logger.error('[useCallKitCore] accept: 无法获取主叫方 ID')
      throw new Error('无法获取主叫方 ID')
    }
    if (callStateStore.getCallStatus !== CALL_STATUS.ALERTING) {
      logger.warn('[useCallKitCore] accept: 当前状态不是 ALERTING，无法接听')
      return
    }
    if (callStateStore.getInviteTimeoutTimer) {
      callStateStore.clearTimeoutTimer()
    }
    await core.answerCall({ callId: callState.callId, accept: true })
    logger.info('[useCallKitCore] accept: 已发送接听信令')
  }

  const reject = async () => {
    logger.info('[useCallKitCore] reject')
    const core = ensureCore()
    const callState = callStateStore.getCallState
    if (!callState.callerUserId) {
      logger.error('[useCallKitCore] reject: 无法获取主叫方 ID')
      throw new Error('无法获取主叫方 ID')
    }
    if (callStateStore.getInviteTimeoutTimer) {
      callStateStore.clearTimeoutTimer()
    }
    await core.answerCall({ callId: callState.callId, accept: false })
    // Core 内部已处理状态重置和事件
    logger.info('[useCallKitCore] reject: 已发送拒绝信令')
  }

  const rejectBusy = async () => {
    logger.info('[useCallKitCore] rejectBusy')
    const core = ensureCore()
    const callState = callStateStore.getCallState
    if (!callState.callerUserId) {
      logger.error('[useCallKitCore] rejectBusy: 无法获取主叫方 ID')
      throw new Error('无法获取主叫方 ID')
    }
    if (callStateStore.getInviteTimeoutTimer) {
      callStateStore.clearTimeoutTimer()
    }
    await core.answerCall({ callId: callState.callId, result: 'busy' })
    logger.info('[useCallKitCore] rejectBusy: 已发送忙碌信令')
  }

  return {
    call,
    groupCall,
    hangup,
    cancel,
    accept,
    reject,
    rejectBusy,
  }
}
