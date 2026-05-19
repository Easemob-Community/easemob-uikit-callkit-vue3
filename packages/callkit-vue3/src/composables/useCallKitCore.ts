/**
 * useCallKitCore — Vue3 Composable 封装 @easemob/callkit-core
 *
 * 将 CallKitCore 的纯事件回调映射为 Vue3 响应式状态 (ref / reactive)，
 * 并桥接到旧版 Pinia Store 和 callKitEventBus，保持 UI 层零改动。
 *
 * 设计：模块级单例，所有调用者共享同一个 CallKitCore 实例和响应式状态。
 * 生命周期由 Provider.vue 统一管理（init/destroy），子组件只消费 API。
 */
import { ref, reactive, readonly, shallowRef, type DeepReadonly } from 'vue'
import {
  CallKitCore,
  CALL_STATUS,
  CALL_TYPE,
  HANGUP_REASON as CORE_HANGUP_REASON,
  type CallKitCoreConfig,
  type CallKitEvent,
  type UIEvent,
  type RtcEvent,
  type InviteCallParams,
  type AnswerCallParams,
  type HangupParams,
  type InviteGroupCallParams,
  type RtcReport,
  type SingleCallState,
  type GroupSessionState,
  type GroupParticipant,
  type RtcAdapter,
} from '@easemob/callkit-core'
import { useRtcChannelStore } from '../store/rtcChannel'
import { useCallTimerStore } from '../store/callTimer'
import { useGlobalCallStore } from '../store/globalCall'
import { useChatClientStore } from '../store/chatClient'

import { useGroupCallStore } from '../modules/groupCall'
import { callKitEventBus } from '../core/events/CallKitEventBus'
import { buildBaseEventFields, getCurrentUserId } from '../core/events/helpers'
import { HANGUP_REASON } from '../types/callstate.types'
import { logger } from '../utils/logger'

// ═════════════════════════════════════════════════
// 模块级单例状态（所有调用者共享）
// ═════════════════════════════════════════════════

export interface ReactiveCallState {
  status: CALL_STATUS
  callId: string
  channel: string
  token: string
  type: CALL_TYPE
  callerDevId: string
  calleeDevId: string
  callerUserId: string
  calleeUserId: string
  audioEnabled: boolean
  videoEnabled: boolean
  startTime: number | null
}

export interface CallEventLog {
  type: string
  payload: any
  timestamp: number
}

// ─── 共享的响应式状态 ───
const _callState = reactive<ReactiveCallState>({
  status: CALL_STATUS.IDLE,
  callId: '',
  channel: '',
  token: '',
  type: CALL_TYPE.AUDIO_1V1,
  callerDevId: '',
  calleeDevId: '',
  callerUserId: '',
  calleeUserId: '',
  audioEnabled: true,
  videoEnabled: true,
  startTime: null,
})

const _groupSession = shallowRef<GroupSessionState | null>(null)
const _groupParticipants = ref<GroupParticipant[]>([])
const _lastEvent = shallowRef<CallKitEvent | null>(null)
const _eventLog = ref<CallEventLog[]>([])
const _error = ref<string | null>(null)
const _isInitialized = ref(false)

// ─── 共享的 core 实例 ───
let _coreInstance: CallKitCore | null = null

// ─── HANGUP_REASON 映射 ───
function mapCoreReasonToHangupReason(reason: string): HANGUP_REASON {
  switch (reason) {
    case 'hangup': return HANGUP_REASON.HANGUP
    case 'cancel': return HANGUP_REASON.CANCEL
    case 'refuse': return HANGUP_REASON.REMOTE_REFUSE
    case 'busy': return HANGUP_REASON.BUSY
    case 'timeout': return HANGUP_REASON.NO_RESPONSE
    case 'remoteCancel': return HANGUP_REASON.REMOTE_CANCEL
    case 'remoteHangup': return HANGUP_REASON.HANGUP
    case 'normal': return HANGUP_REASON.HANGUP
    default: return HANGUP_REASON.HANGUP
  }
}

// ─── 判断事件是否由本端触发 ───
function isLocalEvent(event: CallKitEvent): boolean {
  const remoteTypes = new Set(['callRefused', 'callBusy', 'callCanceled', 'callTimeout'])
  return !remoteTypes.has(event.type)
}

// ─── Store 引用（延迟获取）───
function getStores() {
  return {
    rtcChannelStore: useRtcChannelStore(),
    callTimerStore: useCallTimerStore(),
    globalCallStore: useGlobalCallStore(),
    groupCallStore: useGroupCallStore(),
    chatClientStore: useChatClientStore(),

  }
}

// ─── 同步状态 ───
function syncState(state: SingleCallState) {
  _callState.status = state.status
  _callState.callId = state.callId
  _callState.channel = state.channel
  _callState.token = state.token
  _callState.type = state.type
  _callState.callerDevId = state.callerDevId
  _callState.calleeDevId = state.calleeDevId
  _callState.callerUserId = state.callerUserId
  _callState.calleeUserId = state.calleeUserId
  _callState.audioEnabled = state.audioEnabled
  _callState.videoEnabled = state.videoEnabled
  _callState.startTime = state.startTime
}

function syncGroupSession() {
  if (!_coreInstance) return
  _groupSession.value = _coreInstance.getGroupCallSession()
}

function logEvent(event: CallKitEvent) {
  const entry: CallEventLog = {
    type: event.type,
    payload: event.payload,
    timestamp: Date.now(),
  }
  _eventLog.value.push(entry)
  if (_eventLog.value.length > 100) {
    _eventLog.value = _eventLog.value.slice(-100)
  }
  _lastEvent.value = event
}

// ─── 构建旧版事件 payload ───
function buildLegacyPayload(event: CallKitEvent) {
  const payload = event.payload as any
  const isLocal = isLocalEvent(event)
  const base = buildBaseEventFields({
    callId: payload.callId || '',
    channel: payload.channel || '',
    type: payload.callType || CALL_TYPE.AUDIO_1V1,
    callerUserId: payload.callerUserId || '',
    calleeUserId: payload.calleeUserId,
    groupId: payload.groupId,
  }, isLocal)
  return { ...base, ...payload, isLocal }
}

// ─── 资源清理（不触发事件）───
async function cleanupResources() {
  const stores = getStores()
  const rtcService = stores.rtcChannelStore.getRtcService()
  if (rtcService) {
    try {
      const client = rtcService.getClient()
      if (client && client.connectionState === 'CONNECTED') {
        const localTracks = client.localTracks
        if (localTracks && localTracks.length > 0) {
          await client.unpublish(localTracks)
        }
      }
    } catch (e) {
      logger.debug('[useCallKitCore] unpublish 失败:', e)
    }
    try {
      await rtcService.leaveChannel()
    } catch (e) {
      logger.debug('[useCallKitCore] leaveChannel 失败:', e)
    }
  }
  stores.rtcChannelStore.reset()
}

// ─── 重置状态（不触发事件）───
function resetCallState(reason: HANGUP_REASON) {
  const stores = getStores()

  // 计算通话时长
  let duration = 0
  try {
    const callTimerStore = stores.callTimerStore
    if (callTimerStore.callStartTime > 0) {
      duration = Date.now() - callTimerStore.callStartTime
      callTimerStore.reset()
    }
    const groupCallStore = stores.groupCallStore
    if (groupCallStore.session?.startTime && groupCallStore.session.startTime > 0) {
      duration = Date.now() - groupCallStore.session.startTime
      groupCallStore.destroySession()
    }
  } catch (_e) {
    // 忽略
  }

  // 重置小窗状态
  const globalCallStore = stores.globalCallStore
  if (globalCallStore.isMinimized) {
    globalCallStore.isMinimized = false
  }

  return duration
}

// ─── 核心事件处理 ───
function handleCoreEvent(event: CallKitEvent) {
  logEvent(event)

  const stores = getStores()
  const { rtcChannelStore, callTimerStore, groupCallStore, chatClientStore } = stores

  // 同步单聊状态到响应式对象
  if (_coreInstance) {
    syncState(_coreInstance.getSingleCallState())
  }
  syncGroupSession()

  switch (event.type) {
    case 'statusChanged': {
      // 状态已通过 syncState 同步到 _callState，无需额外操作
      callKitEventBus.emit('statusChanged', buildLegacyPayload(event))
      break
    }

    case 'incomingCall': {
      callKitEventBus.emit('incomingCall', buildLegacyPayload(event))
      break
    }

    case 'callStarted': {
      callTimerStore.startCallTimer()
      callKitEventBus.emit('callStarted', buildLegacyPayload(event))
      break
    }

    case 'callEnded': {
      const p = event.payload as any
      const reason = mapCoreReasonToHangupReason(p.reason)
      // 清理资源（不重复发送信令，core 已处理）
      cleanupResources().catch((err) => {
        logger.error('[useCallKitCore] 资源清理失败:', err)
      })
      const duration = resetCallState(reason)
      callKitEventBus.emit('callEnded', {
        ...buildLegacyPayload(event),
        reason,
        duration: p.duration || duration || 0,
      })
      break
    }

    case 'callTimeout': {
      callKitEventBus.emit('callTimeout', buildLegacyPayload(event))
      break
    }

    case 'callRefused': {
      callKitEventBus.emit('callRefused', buildLegacyPayload(event))
      break
    }

    case 'callBusy': {
      callKitEventBus.emit('callBusy', buildLegacyPayload(event))
      break
    }

    case 'callCanceled': {
      callKitEventBus.emit('callCanceled', buildLegacyPayload(event))
      break
    }

    case 'shouldJoinRtc': {
      // RTC 加入由 RtcAdapter.joinChannel 处理，此处仅做日志
      const p = event.payload as any
      logger.info('[useCallKitCore] shouldJoinRtc（RtcAdapter 处理）', { channel: p.channel, role: p.role })
      break
    }

    case 'shouldLeaveRtc': {
      logger.info('[useCallKitCore] shouldLeaveRtc')
      const rtcService = rtcChannelStore.getRtcService()
      if (rtcService) {
        rtcService.leaveChannel().catch(() => {})
      }
      break
    }

    case 'localAudioChanged': {
      const p = event.payload as any
      rtcChannelStore.setAudioEnabled(p.enabled)
      break
    }

    case 'localVideoChanged': {
      const p = event.payload as any
      rtcChannelStore.setVideoEnabled(p.enabled)
      break
    }

    case 'groupCallInit': {
      const p = event.payload as any
      groupCallStore.initSession({
        sessionId: p.channel,
        groupId: p.groupId,
        groupName: p.groupName,
        callType: p.callType,
        isActive: true,
        startTime: Date.now(),
      })
      const currentUserId = chatClientStore.getChatClient?.user || ''
      const globalCallStore = stores.globalCallStore
      ;(p.invitedMembers || []).forEach((userId: string) => {
        const info = globalCallStore.getUserInfo(userId)
        groupCallStore.addParticipant({
          userId,
          nickname: info.nickname || userId,
          avatarUrl: info.avatarURL,
          state: 'invited',
          isLocal: userId === currentUserId,
          videoTrack: null,
          audioTrack: null,
          localStream: null,
          isMuted: false,
          isCameraOn: p.callType === 'video',
          isSpeaking: false,
        })
      })
      callKitEventBus.emit('groupCallInit', buildLegacyPayload(event))
      break
    }

    case 'participantStateChanged': {
      const p = event.payload as any
      groupCallStore.setParticipantState(p.userId, p.state)
      callKitEventBus.emit('participantStateChanged', buildLegacyPayload(event))
      break
    }

    case 'participantJoined': {
      const p = event.payload as any
      const globalCallStore = stores.globalCallStore
      const info = globalCallStore.getUserInfo(p.userId)
      if (!groupCallStore.participants.has(p.userId)) {
        groupCallStore.addParticipant({
          userId: p.userId,
          nickname: info.nickname || p.userId,
          avatarUrl: info.avatarURL,
          state: 'joinedRtc',
          isLocal: false,
          videoTrack: null,
          audioTrack: null,
          localStream: null,
          isMuted: false,
          isCameraOn: false,
          isSpeaking: false,
        })
      } else {
        groupCallStore.setParticipantState(p.userId, 'joinedRtc')
      }
      callKitEventBus.emit('participantJoined', buildLegacyPayload(event))
      break
    }

    case 'participantLeft': {
      const p = event.payload as any
      groupCallStore.setParticipantState(p.userId, 'left')
      setTimeout(() => groupCallStore.removeParticipant(p.userId), 2000)
      callKitEventBus.emit('participantLeft', buildLegacyPayload(event))
      break
    }

    case 'rtcReport': {
      callKitEventBus.emit('rtcReport', buildLegacyPayload(event))
      break
    }
  }
}

// ─── RtcAdapter 实现 ───
function createRtcAdapter(): RtcAdapter {
  return {
    joinChannel: async ({ channel, token, uid, appId }) => {
      const stores = getStores()
      const rtcService = stores.rtcChannelStore.getRtcService()
      if (!rtcService) {
        logger.error('[RtcAdapter] RtcService 未初始化')
        throw new Error('RtcService 未初始化')
      }

      // 1. 加入 RTC 频道
      await rtcService.joinChannel(channel, token, uid as number, appId)
      logger.info('[RtcAdapter] joinChannel 成功', { channel, uid })

      // 2. 自动创建并发布本地轨道（轨道编排下沉到 Adapter）
      const { callState: coreCallState } = useCallKitCore()
      const tracks: any[] = []

      // 创建音频轨道
      const audioTrack = await rtcService.createAudioTrack()
      tracks.push(audioTrack)
      logger.rtc('createAudioTrackSuccess', {})

      // 如果是视频通话，创建视频轨道
      if (coreCallState.type === CALL_TYPE.VIDEO_1V1 || coreCallState.type === CALL_TYPE.VIDEO_MULTI) {
        const videoTrack = await rtcService.createVideoTrack()
        tracks.push(videoTrack)
        logger.rtc('createVideoTrackSuccess', {})
      }

      // 发布轨道
      if (tracks.length > 0) {
        await rtcService.publishTracks(tracks)
        logger.rtc('publishTracksSuccess', {})
      }

      // 3. 更新 store 状态
      stores.rtcChannelStore.setConnected(true)

      // 4. 标记自己已加入 RTC
      const currentUserId = stores.chatClientStore.getChatClient?.user
      if (currentUserId && rtcService) {
        rtcService.markUserJoinedRtc(currentUserId)
      }

      // 5. 被叫方场景：将主叫方加入 pending 列表（用于 uid 映射）
      if (coreCallState.callerUserId && coreCallState.callerUserId !== currentUserId && rtcService) {
        rtcService.addPendingUserId(coreCallState.callerUserId)
        logger.info('[RtcAdapter] 已将主叫方加入 pending 列表:', coreCallState.callerUserId)
      }

      // 6. 启动通话计时
      stores.callTimerStore.startCallTimer()
      logger.rtc('callTimerStarted', {})
    },
    leaveChannel: async () => {
      const stores = getStores()
      const rtcService = stores.rtcChannelStore.getRtcService()
      if (rtcService) {
        await rtcService.leaveChannel()
      }
    },
    publishLocalTracks: async (types) => {
      const stores = getStores()
      const rtcService = stores.rtcChannelStore.getRtcService()
      if (!rtcService) return
      const tracks: any[] = []
      if (types.includes('audio')) {
        tracks.push(await rtcService.createAudioTrack())
      }
      if (types.includes('video')) {
        tracks.push(await rtcService.createVideoTrack())
      }
      if (tracks.length > 0) {
        await rtcService.publishTracks(tracks)
      }
    },
    unpublishLocalTracks: async (types) => {
      const stores = getStores()
      const rtcService = stores.rtcChannelStore.getRtcService()
      if (!rtcService) return
      const tracks: any[] = []
      if (types.includes('audio')) {
        const t = rtcService.getLocalAudioTrack()
        if (t) tracks.push(t)
      }
      if (types.includes('video')) {
        const t = rtcService.getLocalVideoTrack()
        if (t) tracks.push(t)
      }
      if (tracks.length > 0) {
        await rtcService.unpublishTracks(tracks)
      }
    },
    subscribeRemoteUser: async (userId, mediaType) => {
      const stores = getStores()
      const rtcService = stores.rtcChannelStore.getRtcService()
      if (rtcService) {
        await rtcService.subscribeRemoteUser(userId, mediaType)
      }
    },
    unsubscribeRemoteUser: async (userId, mediaType) => {
      const stores = getStores()
      const rtcService = stores.rtcChannelStore.getRtcService()
      if (rtcService) {
        await rtcService.unsubscribeRemoteUser(userId, mediaType)
      }
    },
    setAudioEnabled: async (enabled) => {
      const stores = getStores()
      const rtcService = stores.rtcChannelStore.getRtcService()
      if (rtcService) {
        await rtcService.toggleAudio(enabled)
      }
    },
    setVideoEnabled: async (enabled) => {
      const stores = getStores()
      const rtcService = stores.rtcChannelStore.getRtcService()
      if (rtcService) {
        await rtcService.toggleVideo(enabled)
      }
    },
  }
}

// ═════════════════════════════════════════════════
// 单例 API
// ═════════════════════════════════════════════════

export function useCallKitCore() {
  // ─── 初始化 ───
  async function init(config: {
    imClient: any
    userProfile?: { userId: string; nickname?: string; avatarURL?: string }
    inviteTimeout?: number
  }) {
    if (_coreInstance) {
      logger.warn('[useCallKitCore] 已初始化，先销毁旧实例')
      await _coreInstance.destroy()
      _coreInstance = null
    }

    const core = new CallKitCore({
      imClient: config.imClient,
      userProfile: config.userProfile,
      inviteTimeout: config.inviteTimeout,
      rtcAdapter: createRtcAdapter(),
      onEvent: handleCoreEvent,
    })

    _coreInstance = core
    _isInitialized.value = true
    _error.value = null

    syncState(core.getSingleCallState())
    logger.info('[useCallKitCore] 初始化完成')
  }

  // ─── API 代理 ───
  async function inviteCall(params: InviteCallParams) {
    if (!_coreInstance) throw new Error('CallKitCore 未初始化')
    try {
      await _coreInstance.inviteCall(params)
      syncState(_coreInstance.getSingleCallState())
    } catch (err: any) {
      _error.value = err.message
      throw err
    }
  }

  async function answerCall(params: AnswerCallParams) {
    if (!_coreInstance) throw new Error('CallKitCore 未初始化')
    try {
      await _coreInstance.answerCall(params)
      syncState(_coreInstance.getSingleCallState())
    } catch (err: any) {
      _error.value = err.message
      throw err
    }
  }

  async function hangup(params?: HangupParams) {
    if (!_coreInstance) throw new Error('CallKitCore 未初始化')
    try {
      await _coreInstance.hangup(params)
      syncState(_coreInstance.getSingleCallState())
    } catch (err: any) {
      _error.value = err.message
      throw err
    }
  }

  async function inviteGroupCall(params: InviteGroupCallParams) {
    if (!_coreInstance) throw new Error('CallKitCore 未初始化')
    try {
      await _coreInstance.inviteGroupCall(params)
      syncState(_coreInstance.getSingleCallState())
      syncGroupSession()
    } catch (err: any) {
      _error.value = err.message
      throw err
    }
  }

  function toggleAudio() {
    if (!_coreInstance) return
    _coreInstance.toggleAudio()
    syncState(_coreInstance.getSingleCallState())
  }

  function toggleVideo() {
    if (!_coreInstance) return
    _coreInstance.toggleVideo()
    syncState(_coreInstance.getSingleCallState())
  }

  function reportRtcEvent(report: RtcReport) {
    if (!_coreInstance) return
    _coreInstance.reportRtcEvent(report)
    syncGroupSession()
  }

  async function destroy() {
    if (_coreInstance) {
      await _coreInstance.destroy()
      _coreInstance = null
      _isInitialized.value = false
      // 重置响应式状态
      syncState({
        status: CALL_STATUS.IDLE,
        callId: '',
        channel: '',
        token: '',
        type: CALL_TYPE.AUDIO_1V1,
        callerDevId: '',
        calleeDevId: '',
        callerUserId: '',
        calleeUserId: '',
        audioEnabled: true,
        videoEnabled: true,
        startTime: null,
      } as SingleCallState)
      _groupSession.value = null
      _eventLog.value = []
      _lastEvent.value = null
    }
  }

  return {
    // 响应式状态（只读）
    callState: readonly(_callState) as DeepReadonly<ReactiveCallState>,
    groupSession: readonly(_groupSession),
    groupParticipants: readonly(_groupParticipants),
    lastEvent: readonly(_lastEvent),
    eventLog: readonly(_eventLog),
    error: readonly(_error),
    isInitialized: readonly(_isInitialized),

    // API
    init,
    inviteCall,
    answerCall,
    hangup,
    inviteGroupCall,
    toggleAudio,
    toggleVideo,
    reportRtcEvent,
    destroy,

    // 常量
    CALL_STATUS,
    CALL_TYPE,
  }
}
