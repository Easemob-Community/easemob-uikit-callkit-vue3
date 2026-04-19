<template>
  <GroupCallShell
    v-if="isVisible"
    ref="groupCallShellRef"
    :group-id="groupId || callStateStore.getCallState.groupId || ''"
    :group-name="groupName || callStateStore.getCallState.groupName"
    :current-user-id="props.currentUserId || chatClientStore.getChatClient?.user || ''"
    :current-nickname="callStateStore.getUserInfo(chatClientStore.getChatClient?.user)?.nickname"
    :current-avatar-url="callStateStore.getUserInfo(chatClientStore.getChatClient?.user)?.avatarURL"
    :rtc-service="rtcChannelStore.rtcService"
    @hangup="handleHangup"
    @add-participant="handleAddParticipant"
  />
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useCallStateStore } from '../../store/callState'
import { useRtcChannelStore } from '../../store/rtcChannel'
import { useChatClientStore } from '../../store/chatClient'
import { CALL_STATUS, CALL_TYPE } from '../../types/callstate.types'
import { GroupCallShell } from '../../modules/groupCall'

interface Props {
  groupId?: string
  groupName?: string
  groupAvatar?: string
  type?: 'audio' | 'video'
  currentUserId?: string
  autoShow?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  type: 'video',
  autoShow: true
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

const groupCallShellRef = ref<InstanceType<typeof GroupCallShell> | null>(null)

const isVisible = computed(() => {
  if (!props.autoShow) return true
  const status = callStateStore.getCallStatus
  const callType = callStateStore.getCallState.type
  const isGroupCall = callType === CALL_TYPE.VIDEO_MULTI || callType === CALL_TYPE.AUDIO_MULTI
  const isInCall = status === CALL_STATUS.IN_CALL || status === CALL_STATUS.INVITING
  return isGroupCall && isInCall
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
      const callType = callStateStore.getCallState.type === CALL_TYPE.AUDIO_MULTI ? 'audio' : 'video'
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
