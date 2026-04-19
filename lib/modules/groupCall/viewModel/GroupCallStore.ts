import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Participant, GroupCallSessionState, UidResolution } from '../types'
import { logger } from '../../../utils/logger'

/**
 * GroupCallStore - 群组通话参与者与状态的单一事实源
 * 替代旧架构中的 useParticipants + rtcChannelStore 分散逻辑
 */
export const useGroupCallStore = defineStore('groupCall', () => {
  // ========== State ==========
  const session = ref<GroupCallSessionState | null>(null)
  const participants = ref<Map<string, Participant>>(new Map())
  const uidToUserIdMap = ref<Map<string, string>>(new Map())
  const acceptedMembers = ref<Set<string>>(new Set())

  // ========== Getters ==========
  const participantList = computed<Participant[]>(() => {
    return Array.from(participants.value.values()).sort((a, b) => {
      // 本地用户永远排第一
      if (a.isLocal !== b.isLocal) return a.isLocal ? -1 : 1
      // 然后按 joinedAt / invitedAt 排序
      const tA = a.joinedAt || a.invitedAt
      const tB = b.joinedAt || b.invitedAt
      return tA - tB
    })
  })

  const localParticipant = computed<Participant | undefined>(() => {
    return participantList.value.find(p => p.isLocal)
  })

  const activeParticipants = computed<Participant[]>(() => {
    return participantList.value.filter(p => p.state !== 'left')
  })

  const publishingParticipants = computed<Participant[]>(() => {
    return activeParticipants.value.filter(p => p.state === 'publishing')
  })

  // ========== Actions ==========

  function initSession(payload: GroupCallSessionState) {
    session.value = payload
    participants.value = new Map()
    uidToUserIdMap.value = new Map()
    acceptedMembers.value = new Set()
    logger.info('[GroupCallStore] 会话初始化', payload)
  }

  function destroySession() {
    session.value = null
    participants.value = new Map()
    uidToUserIdMap.value = new Map()
    acceptedMembers.value = new Set()
    logger.info('[GroupCallStore] 会话销毁')
  }

  function addParticipant(participant: Omit<Participant, 'invitedAt'>) {
    if (participants.value.has(participant.userId)) {
      logger.warn('[GroupCallStore] 参与者已存在，忽略重复添加', participant.userId)
      return
    }
    participants.value.set(participant.userId, {
      ...participant,
      invitedAt: Date.now(),
    })
    logger.info('[GroupCallStore] 添加参与者', participant.userId, participant.state)
  }

  function removeParticipant(userId: string) {
    const existed = participants.value.delete(userId)
    if (existed) {
      logger.info('[GroupCallStore] 移除参与者', userId)
    }
  }

  function setParticipantState(userId: string, state: Participant['state']) {
    const p = participants.value.get(userId)
    if (!p) {
      logger.warn('[GroupCallStore] 尝试更新不存在参与者的状态', userId, state)
      return
    }
    const oldState = p.state
    p.state = state
    if ((state === 'joinedRtc' || state === 'publishing') && !p.joinedAt) {
      p.joinedAt = Date.now()
    }
    logger.info('[GroupCallStore] 状态变更', { userId, oldState, newState: state })
    // Vue3 ref(Map) 对内部对象属性修改是浅响应的，需重新赋值触发更新
    participants.value = new Map(participants.value)
  }

  function markAccepted(userId: string) {
    acceptedMembers.value.add(userId)
    const p = participants.value.get(userId)
    if (p && p.state === 'invited') {
      p.state = 'accepted'
    }
    logger.info('[GroupCallStore] 标记已接受', userId)
  }

  function setUidMapping(uid: string, userId: string) {
    uidToUserIdMap.value.set(uid, userId)
    logger.info('[GroupCallStore] uid 映射建立', { uid, userId })
  }

  /**
   * 核心方法：解析 uid -> userId
   * confidence: certain(已建立映射) / inferred(强推断) / unknown(未找到)
   */
  function resolveUid(uid: string): UidResolution {
    const mapped = uidToUserIdMap.value.get(uid)
    if (mapped) {
      return { userId: mapped, confidence: 'certain' }
    }

    // L2 推断：查找 accepted 但未建立映射的用户
    const candidates = Array.from(acceptedMembers.value).filter(
      id => !Array.from(uidToUserIdMap.value.values()).includes(id)
    )
    if (candidates.length === 1) {
      // 唯一候选，安全推断
      const inferredUserId = candidates[0]
      setUidMapping(uid, inferredUserId)
      return { userId: inferredUserId, confidence: 'inferred' }
    }

    return { userId: null, confidence: 'unknown' }
  }

  function setVideoTrack(userId: string, track: Participant['videoTrack']) {
    const p = participants.value.get(userId)
    if (!p) return
    p.videoTrack = track
    if (track && p.state !== 'publishing' && p.state !== 'left') {
      p.state = 'publishing'
    }
    // 如果 track 被清空但仍在 publishing，回退到 joinedRtc
    if (!track && p.state === 'publishing') {
      p.state = 'joinedRtc'
    }
    // Vue3 ref(Map) 对内部对象属性修改是浅响应的，需重新赋值触发更新
    participants.value = new Map(participants.value)
  }

  function setAudioTrack(userId: string, track: Participant['audioTrack']) {
    const p = participants.value.get(userId)
    if (!p) return
    p.audioTrack = track
    // audio track 单独不会触发 publishing，但如果已有 video 则保持 publishing
    if (track && p.state !== 'publishing' && p.state !== 'left' && p.videoTrack) {
      p.state = 'publishing'
    }
    // Vue3 ref(Map) 对内部对象属性修改是浅响应的，需重新赋值触发更新
    participants.value = new Map(participants.value)
  }

  function setLocalStream(userId: string, stream: MediaStream | null) {
    const p = participants.value.get(userId)
    if (p) {
      p.localStream = stream
      // Vue3 ref(Map) 对内部对象属性修改是浅响应的，需重新赋值触发更新
      participants.value = new Map(participants.value)
    }
  }

  function setMuteState(userId: string, isMuted: boolean) {
    const p = participants.value.get(userId)
    if (p) {
      p.isMuted = isMuted
      // Vue3 ref(Map) 对内部对象属性修改是浅响应的，需重新赋值触发更新
      participants.value = new Map(participants.value)
    }
  }

  function setCameraState(userId: string, isCameraOn: boolean) {
    const p = participants.value.get(userId)
    if (p) {
      p.isCameraOn = isCameraOn
      // Vue3 ref(Map) 对内部对象属性修改是浅响应的，需重新赋值触发更新
      participants.value = new Map(participants.value)
    }
  }

  function setSpeakingState(userId: string, isSpeaking: boolean) {
    const p = participants.value.get(userId)
    if (p) {
      p.isSpeaking = isSpeaking
      // Vue3 ref(Map) 对内部对象属性修改是浅响应的，需重新赋值触发更新
      participants.value = new Map(participants.value)
    }
  }

  return {
    // state
    session,
    participants,
    uidToUserIdMap,
    acceptedMembers,
    // getters
    participantList,
    localParticipant,
    activeParticipants,
    publishingParticipants,
    // actions
    initSession,
    destroySession,
    addParticipant,
    removeParticipant,
    setParticipantState,
    markAccepted,
    setUidMapping,
    resolveUid,
    setVideoTrack,
    setAudioTrack,
    setLocalStream,
    setMuteState,
    setCameraState,
    setSpeakingState,
  }
})
