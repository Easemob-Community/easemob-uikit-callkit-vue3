<template>
  <GroupCallShell
    v-if="isVisible"
    ref="groupCallShellRef"
    :group-id="groupId || ''"
    :group-name="groupName || ''"
    :current-user-id="props.currentUserId || chatClientStore.getChatClient?.user || ''"
    :current-nickname="globalCallStore.getUserInfo(chatClientStore.getChatClient?.user)?.nickname"
    :current-avatar-url="globalCallStore.getUserInfo(chatClientStore.getChatClient?.user)?.avatarURL"
    :rtc-service="rtcChannelStore.getRtcService()"
    @hangup="handleHangup"
    @add-participant="handleAddParticipant"
  />
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useCallStateStore } from '../../store/callState'
import { useRtcChannelStore } from '../../store/rtcChannel'
import { useChatClientStore } from '../../store/chatClient'
import { useGlobalCallStore } from '../../store/globalCall'
import { CALL_STATUS, CALL_TYPE } from '../../types/callstate.types'
import { GroupCallShell } from '../../modules/groupCall'
import { logger } from '../../utils/logger'

const props = withDefaults(defineProps<{
  groupId?: string
  groupName?: string
  groupAvatar?: string
  type?: 'audio' | 'video'
  currentUserId?: string
  autoShow?: boolean
}>(), {
  autoShow: true,
})

const emit = defineEmits<{
  /** 通话开始（可选监听） */
  callStarted: []
  /** 通话结束（可选监听） */
  callEnded: []
  /** 添加参与者按钮点击（可选监听） */
  addParticipant: []
  /** 邀请超时（可选监听） */
  participantTimeout: [userId: string]
  /** 发生错误（可选监听） */
  error: [error: Error]
}>()

const callStateStore = useCallStateStore()
const rtcChannelStore = useRtcChannelStore()
const chatClientStore = useChatClientStore()
const globalCallStore = useGlobalCallStore()

const groupCallShellRef = ref<InstanceType<typeof GroupCallShell> | null>(null)

const isVisible = computed(() => {
  if (props.autoShow === false) return true
  const status = callStateStore.getCallStatus
  const callType = callStateStore.getCallState.type
  const callId = callStateStore.getCallState.callId
  const isGroupCall = callType === CALL_TYPE.VIDEO_MULTI || callType === CALL_TYPE.AUDIO_MULTI
  const isInCall = status === CALL_STATUS.IN_CALL || status === CALL_STATUS.INVITING
  const hasValidCall = !!callId && callId.length > 0
  const result = isGroupCall && isInCall && hasValidCall
  logger.debug('[EasemobChatMultiCall] isVisible check:', {
    status,
    callType,
    callId,
    isGroupCall,
    isInCall,
    hasValidCall,
    result,
  })
  return result
})

const handleHangup = () => {
  emit('callEnded')
}

const handleAddParticipant = () => {
  emit('addParticipant')
}

// 主叫方 / 被邀请方：GroupCallShell 可能因 v-if 延迟渲染，
// 监听 ref 变化自动补调 startSession（幂等，重复调用安全）
watch(
  groupCallShellRef,
  (shell, prevShell) => {
    if (shell && !prevShell) {
      const status = callStateStore.getCallStatus
      const type = callStateStore.getCallState.type
      // 只有真正处于群通话状态中才补调 startSession，避免 autoShow=false 时误触发
      const isGroupCall = type === CALL_TYPE.VIDEO_MULTI || type === CALL_TYPE.AUDIO_MULTI
      const isInCall = status === CALL_STATUS.IN_CALL || status === CALL_STATUS.INVITING
      if (!isGroupCall || !isInCall) {
        logger.info('[EasemobChatMultiCall] shell 渲染但不在群通话状态，跳过 startSession')
        return
      }
      const callType = type === CALL_TYPE.AUDIO_MULTI ? 'audio' : 'video'
      shell.startSession({
        sessionId: callStateStore.getCallState.channel || '',
        callType,
      })
      emit('callStarted')
    }
  },
  { immediate: false }
)
</script>

<style scoped>
/* 薄 wrapper，无额外样式 */
</style>
