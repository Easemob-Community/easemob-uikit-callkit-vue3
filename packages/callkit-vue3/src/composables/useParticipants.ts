import { computed } from 'vue'
import { useCallKitCore } from './useCallKitCore'
import { useRtcChannelStore } from '../store/rtcChannel'
import { useChatClientStore } from '../store/chatClient'
import { useGlobalCallStore } from '../store/globalCall'
import { logger } from '../utils/logger'

export interface Participant {
  userId: string
  userName: string
  avatar?: string
  isMuted: boolean
  isInviting: boolean
  hasJoined: boolean
}

/**
 * 自动生成参与者列表的 composable
 * @deprecated 旧架构已废弃，群组通话请使用 useGroupCallViewModel / GroupCallStore
 */
export function useParticipants(currentUserId?: string) {
  const { callState: coreCallState } = useCallKitCore()
  const rtcChannelStore = useRtcChannelStore()
  const chatClientStore = useChatClientStore()
  const globalCallStore = useGlobalCallStore()

  /**
   * 动态生成群组参与者列表
   * 自动过滤已离开的用户，自动标记加入状态
   */
  const participants = computed<Participant[]>(() => {
    const participantList: Participant[] = []

    // 获取当前用户ID（优先使用传入的，其次从 chatClient 获取，最后兜底 callerUserId）
    const currentUser = currentUserId || chatClientStore.getChatClient?.user || coreCallState.callerUserId

    // 从 RtcService 获取用户状态
    const rtcService = rtcChannelStore.getRtcService()

    logger.debug('[useParticipants] 计算参与者列表:', {
      currentUser,
      callerUserId: coreCallState.callerUserId,
    })

    // 添加当前用户
    if (currentUser) {
      participantList.push({
        userId: currentUser,
        userName: globalCallStore.getUserInfo(currentUser)?.nickname || currentUser,
        avatar: globalCallStore.getUserInfo(currentUser)?.avatarURL,
        isMuted: false,
        isInviting: false,
        hasJoined: true
      })
    }

    // 添加主叫方（如果不是当前用户）
    // 主叫方始终添加，直到明确离开（通过 userLeft 事件标记）
    if (coreCallState.callerUserId && coreCallState.callerUserId !== currentUser) {
      const hasJoined = rtcService?.isUserInRtc(coreCallState.callerUserId) ?? false
      const hasExplicitlyLeft = rtcService?.hasUserLeft(coreCallState.callerUserId) ?? false

      // 主叫方在以下情况显示：
      // 1. 已加入RTC (hasJoined = true)
      // 2. 被叫方刚加入时（还没有人标记为joined，且未明确离开）
      const shouldShowCaller = !hasExplicitlyLeft && (hasJoined || !rtcService || rtcService.isUserInRtc(coreCallState.callerUserId) === false)

      if (shouldShowCaller) {
        participantList.push({
          userId: coreCallState.callerUserId,
          userName: globalCallStore.getUserInfo(coreCallState.callerUserId)?.nickname || coreCallState.callerUserId,
          avatar: globalCallStore.getUserInfo(coreCallState.callerUserId)?.avatarURL,
          isMuted: false,
          isInviting: !hasJoined,
          hasJoined: hasJoined
        })
      }
    }

    // 只返回当前仍在RTC频道中的用户，以及那些还在邀请中的用户
    const result = participantList.filter(p => p.hasJoined || p.isInviting)

    logger.debug('[useParticipants] 计算结果:', {
      totalCount: result.length,
      participants: result.map(p => ({
        userId: p.userId,
        isInviting: p.isInviting,
        hasJoined: p.hasJoined
      }))
    })

    return result
  })

  return {
    participants
  }
}
