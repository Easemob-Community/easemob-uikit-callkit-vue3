<template>
  <div class="gcall-shell">
    <!-- Header -->
    <div class="gcall-header">
      <span class="gcall-title">{{ groupName || '群组通话' }}</span>
      <span class="gcall-duration">{{ formattedDuration }}</span>
      <button class="gcall-btn-icon" @click="showAddMember = true">+</button>
    </div>

    <!-- Video Grid -->
    <VideoGrid :participants="participants" />

    <!-- Controls -->
    <div class="gcall-controls">
      <button
        class="gcall-control-btn"
        :class="{ active: localParticipant?.isMuted }"
        @click="toggleMute"
      >
        {{ localParticipant?.isMuted ? '取消静音' : '静音' }}
      </button>
      <button
        class="gcall-control-btn"
        :class="{ active: !localParticipant?.isCameraOn }"
        @click="toggleCamera"
      >
        {{ localParticipant?.isCameraOn ? '关闭摄像头' : '开启摄像头' }}
      </button>
      <button class="gcall-control-btn gcall-hangup" @click="handleHangup">
        挂断
      </button>
    </div>

    <!-- Add Member Modal -->
    <EasemobChatGroupMemberList
      v-if="showAddMember"
      :group-id="groupId"
      :existing-user-ids="existingUserIds"
      :inviting-user-ids="invitingUserIds"
      @close="showAddMember = false"
      @invite="handleInviteMembers"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import VideoGrid from './VideoGrid.vue'
import EasemobChatGroupMemberList from '../../../components/multiCall/EasemobChatGroupMemberList.vue'
import { useGroupCallViewModel } from '../viewModel/useGroupCallViewModel'
import { useRtcChannelStore } from '../../../store/rtcChannel'
import type { RtcService } from '../../../services/RtcService'
import { logger } from '../../../utils/logger'

interface Props {
  groupId: string
  groupName?: string
  currentUserId: string
  currentNickname?: string
  currentAvatarUrl?: string
  rtcService?: RtcService | null
}

const props = defineProps<Props>()
const emit = defineEmits<{
  hangup: []
  addParticipant: []
}>()

const vm = useGroupCallViewModel()
const rtcChannelStore = useRtcChannelStore()
const showAddMember = ref(false)

const participants = computed(() => vm.participants.value)
const localParticipant = computed(() => vm.localParticipant.value)

const existingUserIds = computed(() => participants.value.map(p => p.userId))
const invitingUserIds = computed(() =>
  participants.value.filter(p => p.state === 'invited').map(p => p.userId)
)

const formattedDuration = computed(() => {
  const total = vm.callDuration.value
  const m = Math.floor(total / 60)
    .toString()
    .padStart(2, '0')
  const s = (total % 60).toString().padStart(2, '0')
  return `${m}:${s}`
})

// 暴露给父组件的初始化方法
defineExpose({
  startSession: (payload: {
    sessionId: string
    callType: 'video' | 'audio'
  }) => {
    vm.startSession({
      sessionId: payload.sessionId,
      groupId: props.groupId,
      callType: payload.callType,
      localUserId: props.currentUserId,
      localNickname: props.currentNickname || props.currentUserId,
      localAvatarUrl: props.currentAvatarUrl,
    })
  },

  addRemoteParticipant: vm.addRemoteParticipant,
  markRemoteAccepted: vm.markRemoteAccepted,
  bindRtcService: vm.bindRtcService,
  unbindRtcService: vm.unbindRtcService,
  sendInvite: vm.sendInvite,
})

// 监听 RTC Service 绑定
watch(
  () => props.rtcService,
  (svc) => {
    if (svc) {
      vm.bindRtcService(svc)
    } else {
      vm.unbindRtcService()
    }
  },
  { immediate: true }
)

// 同步本地视频流：RtcService 创建轨道后会写入 rtcChannelStore.localStream
watch(
  () => rtcChannelStore.localStream,
  (stream) => {
    if (stream) {
      logger.info('[GroupCallShell] 检测到本地视频流更新')
      vm.setLocalStream(stream)
    }
  },
  { immediate: true }
)

async function toggleMute() {
  if (!props.rtcService) return
  const target = !localParticipant.value?.isMuted
  try {
    const actual = await props.rtcService.toggleAudio(!target)
    vm.setLocalMute(!actual)
  } catch (e) {
    logger.error('[GroupCallShell] 切换静音失败', e)
  }
}

async function toggleCamera() {
  if (!props.rtcService) return
  const target = !localParticipant.value?.isCameraOn
  try {
    const actual = await props.rtcService.toggleVideo(target)
    vm.setLocalCamera(actual)
  } catch (e) {
    logger.error('[GroupCallShell] 切换摄像头失败', e)
  }
}

async function handleHangup() {
  await vm.hangup()
  emit('hangup')
}

async function handleInviteMembers(userIds: string[]) {
  try {
    const message = '邀请你加入音视频通话'
    await vm.sendInvite(userIds, props.groupId, message)
    showAddMember.value = false
  } catch (error) {
    logger.error('[GroupCallShell] 邀请成员失败', error)
  }
}
</script>

<style scoped>
.gcall-shell {
  width: 800px;
  height: 600px;
  max-width: 90vw;
  max-height: 90vh;
  background: #1a1a1a;
  color: white;
  display: flex;
  flex-direction: column;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
}

.gcall-header {
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  background: rgba(0, 0, 0, 0.3);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.gcall-title {
  font-weight: 500;
  font-size: 14px;
}

.gcall-duration {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.7);
  font-variant-numeric: tabular-nums;
}

.gcall-btn-icon {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: none;
  background: rgba(255, 255, 255, 0.15);
  color: white;
  cursor: pointer;
}

.gcall-controls {
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 0 16px;
  background: rgba(0, 0, 0, 0.3);
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.gcall-control-btn {
  padding: 8px 16px;
  border-radius: 20px;
  border: none;
  background: rgba(255, 255, 255, 0.12);
  color: white;
  font-size: 13px;
  cursor: pointer;
  transition: background 0.2s;
}

.gcall-control-btn.active {
  background: rgba(255, 255, 255, 0.3);
}

.gcall-control-btn.gcall-hangup {
  background: #e74c3c;
}

.gcall-modal {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}

.gcall-modal-content {
  background: #222;
  color: white;
  padding: 20px;
  border-radius: 8px;
  min-width: 240px;
}
</style>
