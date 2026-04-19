import { ref, computed, type ComputedRef, type Ref } from 'vue'
import { useGroupCallStore } from './GroupCallStore'
import { RtcMediaBridge } from '../media/RtcMediaBridge'
import { GroupCallSignalingAdapter } from '../signaling/GroupCallSignalingAdapter'
import type { RtcService } from '../../../services/RtcService'
import type { Participant } from '../types'
import { logger } from '../../../utils/logger'

export interface UseGroupCallViewModelReturn {
  // 状态
  isActive: ComputedRef<boolean>
  participants: ComputedRef<Participant[]>
  localParticipant: ComputedRef<Participant | undefined>
  callDuration: Ref<number>
  selectedParticipantId: Ref<string | null>

  // 动作
  startSession: (payload: {
    sessionId: string
    groupId: string
    callType: 'video' | 'audio'
    localUserId: string
    localNickname: string
    localAvatarUrl?: string
  }) => void

  addRemoteParticipant: (userId: string, nickname: string, avatarUrl?: string) => void
  markRemoteAccepted: (userId: string) => void
  bindRtcService: (rtcService: RtcService) => void
  unbindRtcService: () => void

  sendInvite: (userIds: string[], groupId: string, message: string) => Promise<void>
  hangup: () => Promise<void>

  // 本地媒体控制
  setLocalStream: (stream: MediaStream | null) => void
  setLocalMute: (isMuted: boolean) => void
  setLocalCamera: (isCameraOn: boolean) => void
  setLocalVideoTrack: (track: any) => void

  // 布局控制
  selectParticipant: (userId: string | null) => void
}

/**
 * useGroupCallViewModel
 * 群组通话的顶层 ViewModel，连接 Store、MediaBridge、SignalingAdapter
 */
export function useGroupCallViewModel(): UseGroupCallViewModelReturn {
  const store = useGroupCallStore()
  const signaling = new GroupCallSignalingAdapter()

  let mediaBridge: RtcMediaBridge | null = null

  const isActive = computed(() => store.session?.isActive ?? false)
  const participants = computed(() => store.participantList)
  const localParticipant = computed(() => store.localParticipant)
  const callDuration = ref(0)
  let _durationTimer: ReturnType<typeof setInterval> | null = null

  function startDurationTimer() {
    if (_durationTimer) clearInterval(_durationTimer)
    _durationTimer = setInterval(() => {
      if (store.session?.startTime) {
        callDuration.value = Math.floor((Date.now() - store.session.startTime) / 1000)
      }
    }, 1000)
  }

  function stopDurationTimer() {
    if (_durationTimer) {
      clearInterval(_durationTimer)
      _durationTimer = null
    }
    callDuration.value = 0
  }
  const selectedParticipantId = ref<string | null>(null)

  function selectParticipant(userId: string | null) {
    selectedParticipantId.value = userId
  }

  function startSession(payload: {
    sessionId: string
    groupId: string
    callType: 'video' | 'audio'
    localUserId: string
    localNickname: string
    localAvatarUrl?: string
  }) {
    store.initSession({
      sessionId: payload.sessionId,
      groupId: payload.groupId,
      callType: payload.callType,
      isActive: true,
      startTime: Date.now(),
    })

    store.addParticipant({
      userId: payload.localUserId,
      nickname: payload.localNickname,
      avatarUrl: payload.localAvatarUrl,
      state: 'joinedRtc',
      isLocal: true,
      videoTrack: null,
      audioTrack: null,
      localStream: null,
      isMuted: false,
      isCameraOn: payload.callType === 'video',
      isSpeaking: false,
    })

    startDurationTimer()
    logger.info('[useGroupCallViewModel] 会话启动', payload.sessionId)
  }

  function addRemoteParticipant(userId: string, nickname: string, avatarUrl?: string) {
    store.addParticipant({
      userId,
      nickname,
      avatarUrl,
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

  function markRemoteAccepted(userId: string) {
    store.markAccepted(userId)
  }

  function bindRtcService(rtcService: RtcService) {
    if (mediaBridge) {
      logger.warn('[useGroupCallViewModel] RtcMediaBridge 已存在，先销毁旧实例')
      mediaBridge.destroy()
    }
    mediaBridge = new RtcMediaBridge(rtcService)
    logger.info('[useGroupCallViewModel] 已绑定 RtcService')
  }

  function unbindRtcService() {
    if (mediaBridge) {
      mediaBridge.destroy()
      mediaBridge = null
      logger.info('[useGroupCallViewModel] 已解绑 RtcService')
    }
  }

  async function sendInvite(userIds: string[], groupId: string, message: string) {
    // 1. 信令发送
    await signaling.sendInvite(userIds, groupId, message)
    // 2. 本地状态更新
    userIds.forEach(id => {
      addRemoteParticipant(id, id) // nickname 兜底，实际应由外部传入
    })
  }

  async function hangup() {
    await signaling.hangup()
    unbindRtcService()
    store.destroySession()
    stopDurationTimer()
  }

  function setLocalStream(stream: MediaStream | null) {
    const local = store.localParticipant
    if (local) {
      store.setLocalStream(local.userId, stream)
    }
  }

  function setLocalMute(isMuted: boolean) {
    const local = store.localParticipant
    if (local) {
      store.setMuteState(local.userId, isMuted)
    }
  }

  function setLocalCamera(isCameraOn: boolean) {
    const local = store.localParticipant
    if (local) {
      store.setCameraState(local.userId, isCameraOn)
    }
  }

  function setLocalVideoTrack(track: any) {
    const local = store.localParticipant
    if (local) {
      store.setVideoTrack(local.userId, track)
    }
  }

  return {
    isActive,
    participants,
    localParticipant,
    callDuration,
    selectedParticipantId,
    startSession,
    addRemoteParticipant,
    markRemoteAccepted,
    bindRtcService,
    unbindRtcService,
    sendInvite,
    hangup,
    setLocalStream,
    setLocalMute,
    setLocalCamera,
    setLocalVideoTrack,
    selectParticipant,
  }
}
