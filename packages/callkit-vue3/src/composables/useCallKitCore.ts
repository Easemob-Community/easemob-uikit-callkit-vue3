/**
 * useCallKitCore — Vue3 Composable 封装 @easemob/callkit-core
 *
 * 将 CallKitCore 的纯事件回调映射为 Vue3 响应式状态 (ref / reactive)，
 * 供 UI 组件直接绑定。
 *
 * 用法：
 *   const { callState, groupSession, events, init, inviteCall, answerCall, hangup, ... } = useCallKitCore()
 */
import { ref, reactive, readonly, shallowRef, onUnmounted, type DeepReadonly } from 'vue'
import {
  CallKitCore,
  CALL_STATUS,
  CALL_TYPE,
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
} from '@easemob/callkit-core'

// ────────────────────────────────────────────────
// 响应式状态类型
// ────────────────────────────────────────────────

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

// ────────────────────────────────────────────────
// Composable
// ────────────────────────────────────────────────

export function useCallKitCore() {
  // 核心实例
  const coreInstance = shallowRef<CallKitCore | null>(null)

  // ─── 响应式状态 ───
  const callState = reactive<ReactiveCallState>({
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

  const groupSession = shallowRef<GroupSessionState | null>(null)
  const groupParticipants = ref<GroupParticipant[]>([])
  const lastEvent = shallowRef<CallKitEvent | null>(null)
  const eventLog = ref<CallEventLog[]>([])
  const error = ref<string | null>(null)
  const isInitialized = ref(false)

  // ─── 同步状态 ───
  function syncState(state: SingleCallState) {
    callState.status = state.status
    callState.callId = state.callId
    callState.channel = state.channel
    callState.token = state.token
    callState.type = state.type
    callState.callerDevId = state.callerDevId
    callState.calleeDevId = state.calleeDevId
    callState.callerUserId = state.callerUserId
    callState.calleeUserId = state.calleeUserId
    callState.audioEnabled = state.audioEnabled
    callState.videoEnabled = state.videoEnabled
    callState.startTime = state.startTime
  }

  function syncGroupSession() {
    if (!coreInstance.value) return
    groupSession.value = coreInstance.value.getGroupCallSession()
    // 同步参与者列表：通过事件中携带的信息更新
    // 注：CallKitCore 未直接暴露 getAllParticipants，我们通过事件跟踪参与者
  }

  function logEvent(event: CallKitEvent) {
    const entry: CallEventLog = {
      type: event.type,
      payload: event.payload,
      timestamp: Date.now(),
    }
    eventLog.value.push(entry)
    // 保留最近 100 条
    if (eventLog.value.length > 100) {
      eventLog.value = eventLog.value.slice(-100)
    }
    lastEvent.value = event
  }

  // ─── 初始化 ───
  function init(config: Omit<CallKitCoreConfig, 'onEvent'>) {
    if (coreInstance.value) {
      console.warn('[useCallKitCore] 已初始化，先销毁旧实例')
      coreInstance.value.destroy()
    }

    const core = new CallKitCore({
      ...config,
      onEvent: (event: CallKitEvent) => {
        // 记录日志
        logEvent(event)

        // 每次事件后同步状态
        syncState(core.getSingleCallState())
        syncGroupSession()

        // 跟踪群聊参与者
        if (event.type === 'groupCallInit') {
          const p = (event as any).payload
          groupParticipants.value = (p.invitedMembers || []).map((userId: string) => ({
            userId,
            state: 'invited',
          }))
        } else if (event.type === 'participantStateChanged') {
          const p = (event as any).payload
          const idx = groupParticipants.value.findIndex(pp => pp.userId === p.userId)
          if (idx >= 0) {
            groupParticipants.value[idx] = { ...groupParticipants.value[idx], state: p.state }
          }
        } else if (event.type === 'participantJoined') {
          const p = (event as any).payload
          if (!groupParticipants.value.find(pp => pp.userId === p.userId)) {
            groupParticipants.value.push({ userId: p.userId, state: 'accepted' } as any)
          }
        } else if (event.type === 'participantLeft') {
          const p = (event as any).payload
          groupParticipants.value = groupParticipants.value.filter(pp => pp.userId !== p.userId)
        }

        // 透传给用户提供的回调
        if (config.onUIEvent && isUIEvent(event)) {
          config.onUIEvent(event as UIEvent)
        }
        if (config.onRtcEvent && isRtcEvent(event)) {
          config.onRtcEvent(event as RtcEvent)
        }
      },
    })

    coreInstance.value = core
    isInitialized.value = true
    error.value = null

    // 初始同步
    syncState(core.getSingleCallState())
  }

  // ─── API 代理 ───
  async function inviteCall(params: InviteCallParams) {
    if (!coreInstance.value) throw new Error('CallKitCore 未初始化')
    try {
      await coreInstance.value.inviteCall(params)
      syncState(coreInstance.value.getSingleCallState())
    } catch (err: any) {
      error.value = err.message
      throw err
    }
  }

  async function answerCall(params: AnswerCallParams) {
    if (!coreInstance.value) throw new Error('CallKitCore 未初始化')
    try {
      await coreInstance.value.answerCall(params)
      syncState(coreInstance.value.getSingleCallState())
    } catch (err: any) {
      error.value = err.message
      throw err
    }
  }

  async function hangup(params?: HangupParams) {
    if (!coreInstance.value) throw new Error('CallKitCore 未初始化')
    try {
      await coreInstance.value.hangup(params)
      syncState(coreInstance.value.getSingleCallState())
    } catch (err: any) {
      error.value = err.message
      throw err
    }
  }

  async function inviteGroupCall(params: InviteGroupCallParams) {
    if (!coreInstance.value) throw new Error('CallKitCore 未初始化')
    try {
      await coreInstance.value.inviteGroupCall(params)
      syncState(coreInstance.value.getSingleCallState())
      syncGroupSession()
    } catch (err: any) {
      error.value = err.message
      throw err
    }
  }

  function toggleAudio() {
    if (!coreInstance.value) return
    coreInstance.value.toggleAudio()
    syncState(coreInstance.value.getSingleCallState())
  }

  function toggleVideo() {
    if (!coreInstance.value) return
    coreInstance.value.toggleVideo()
    syncState(coreInstance.value.getSingleCallState())
  }

  function reportRtcEvent(report: RtcReport) {
    if (!coreInstance.value) return
    coreInstance.value.reportRtcEvent(report)
    syncGroupSession()
  }

  async function destroy() {
    if (coreInstance.value) {
      await coreInstance.value.destroy()
      coreInstance.value = null
      isInitialized.value = false
    }
  }

  // 组件卸载自动销毁
  onUnmounted(() => {
    destroy()
  })

  return {
    // 响应式状态（只读）
    callState: readonly(callState) as DeepReadonly<ReactiveCallState>,
    groupSession: readonly(groupSession),
    groupParticipants: readonly(groupParticipants),
    lastEvent: readonly(lastEvent),
    eventLog: readonly(eventLog),
    error: readonly(error),
    isInitialized: readonly(isInitialized),

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

    // 常量（方便模板使用）
    CALL_STATUS,
    CALL_TYPE,
  }
}

// 类型守卫（从 core 重导）
function isUIEvent(event: CallKitEvent): event is UIEvent {
  const rtcTypes = new Set(['shouldJoinRtc', 'shouldLeaveRtc', 'shouldPublishTracks', 'localAudioChanged', 'localVideoChanged'])
  return !rtcTypes.has(event.type)
}

function isRtcEvent(event: CallKitEvent): event is RtcEvent {
  const rtcTypes = new Set(['shouldJoinRtc', 'shouldLeaveRtc', 'shouldPublishTracks', 'localAudioChanged', 'localVideoChanged'])
  return rtcTypes.has(event.type)
}
