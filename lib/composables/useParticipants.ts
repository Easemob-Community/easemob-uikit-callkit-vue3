import { computed } from 'vue'
import { useCallStateStore } from '../store/callState'
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
  const callStateStore = useCallStateStore()
  const rtcChannelStore = useRtcChannelStore()
  const chatClientStore = useChatClientStore()
  const globalCallStore = useGlobalCallStore()

  /**
   * 动态生成群组参与者列表
   * 自动过滤已离开的用户，自动标记加入状态
   */
  const participants = computed<Participant[]>(() => {
    const state = callStateStore.getCallState
    const participantList: Participant[] = []
    
    // 获取当前用户ID（优先使用传入的，其次从 chatClient 获取，最后兜底 callerUserId）
    const currentUser = currentUserId || chatClientStore.getChatClient?.user || state.callerUserId
    
    // 访问 joinedRtcUsers 确保计算属性响应其变化
    const joinedUsers = Array.from(rtcChannelStore.joinedRtcUsers)
    
    logger.debug('[useParticipants] 计算参与者列表:', {
      currentUser,
      callerUserId: state.callerUserId,
      invitedMembers: JSON.parse(JSON.stringify(state.invitedMembers ?? [])),
      joinedRtcUsers: joinedUsers,
      leftUsers: Array.from(rtcChannelStore.leftUsers),
      uidToUserIdMap: JSON.parse(JSON.stringify(Array.from(rtcChannelStore.uidToUserIdMap.entries())))
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
    if (state.callerUserId && state.callerUserId !== currentUser) {
      const hasJoined = rtcChannelStore.isUserInRtc(state.callerUserId)
      const isInInvitedList = (state.invitedMembers ?? []).includes(state.callerUserId)
      const hasExplicitlyLeft = rtcChannelStore.hasUserLeft(state.callerUserId) // 🔑 检查是否已明确离开
      
      // 主叫方在以下情况显示：
      // 1. 已加入RTC (hasJoined = true)
      // 2. 还在邀请列表中 (isInInvitedList = true)  
      // 3. 被叫方刚加入时（invitedMembers可能已清空，但还没有人标记为joined，且未明确离开）
      const shouldShowCaller = !hasExplicitlyLeft && (hasJoined || isInInvitedList || rtcChannelStore.joinedRtcUsers.size === 0)
      
      if (shouldShowCaller) {
        participantList.push({
          userId: state.callerUserId,
          userName: globalCallStore.getUserInfo(state.callerUserId)?.nickname || state.callerUserId,
          avatar: globalCallStore.getUserInfo(state.callerUserId)?.avatarURL,
          isMuted: false,
          isInviting: !hasJoined, // 根据RTC状态决定是否还在邀请中
          hasJoined: hasJoined
        })
      }
    }
    
    // 添加其他被邀请成员（排除已明确离开的用户）
    const invitedMembers = state.invitedMembers ?? []
    if (invitedMembers.length > 0) {
      invitedMembers.forEach(userId => {
        // 避免重复添加，且排除已明确离开的用户
        if (userId !== currentUser && userId !== state.callerUserId && !rtcChannelStore.hasUserLeft(userId)) {
          const hasJoined = rtcChannelStore.isUserInRtc(userId)
          participantList.push({
            userId,
            userName: globalCallStore.getUserInfo(userId)?.nickname || userId,
            avatar: globalCallStore.getUserInfo(userId)?.avatarURL,
            isMuted: false,
            isInviting: !hasJoined, // 根据RTC状态决定是否还在邀请中
            hasJoined: hasJoined
          })
        }
      })
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
