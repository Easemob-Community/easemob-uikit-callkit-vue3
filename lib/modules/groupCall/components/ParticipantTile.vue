<template>
  <div class="gcall-tile" @click="handleClick">
    <!-- 视频层 -->
    <video
      v-if="showVideo"
      ref="videoEl"
      class="gcall-tile-video"
      :class="{ mirror: participant.isLocal }"
      autoplay
      playsinline
      :muted="participant.isLocal"
    />

    <!-- 占位层 -->
    <div v-else class="gcall-tile-placeholder">
      <img
        v-if="participant.avatarUrl"
        :src="participant.avatarUrl"
        class="gcall-tile-avatar"
        alt="avatar"
      />
      <div
        v-else
        class="gcall-tile-avatar-fallback"
        :style="{ background: avatarGradient }"
      >
        {{ nicknameFirstChar }}
      </div>
      <div v-if="participant.state === 'invited'" class="gcall-tile-loading">
        <div class="gcall-spinner" />
        <span>邀请中...</span>
      </div>
      <div v-else-if="participant.state === 'joinedRtc'" class="gcall-tile-hint">
        已接通，等待画面...
      </div>
    </div>

    <!-- Hover 放大提示 -->
    <div class="gcall-tile-hover-icon">
      <CallKitIcon name="chevron-4-all-around" :width="14" :height="14" color="#fff" />
    </div>

    <!-- 信息条 -->
    <div class="gcall-tile-info">
      <span class="gcall-tile-name">{{ participant.nickname }}</span>
      <span v-if="participant.isMuted" class="gcall-tile-mic">
        <CallKitIcon name="mic-slash" :width="14" :height="14" />
      </span>
      <span v-else-if="participant.isSpeaking" class="gcall-tile-speaking">
        <CallKitIcon name="speaker-wave-2" :width="14" :height="14" />
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed, onUnmounted } from 'vue'
import CallKitIcon from './CallKitIcon.vue'
import type { Participant } from '../types'

interface Props {
  participant: Participant
}

const props = defineProps<Props>()
const emit = defineEmits<{
  click: [userId: string]
}>()

const videoEl = ref<HTMLVideoElement | null>(null)

const showVideo = computed(() => {
  if (props.participant.isLocal) {
    return !!props.participant.localStream
  }
  return props.participant.state === 'publishing' && !!props.participant.videoTrack
})

const nicknameFirstChar = computed(() => {
  return props.participant.nickname?.charAt(0)?.toUpperCase() || '?'
})

// 根据 userId hash 生成渐变色
const avatarGradient = computed(() => {
  const hash = props.participant.userId.split('').reduce((acc, char) => {
    return char.charCodeAt(0) + ((acc << 5) - acc)
  }, 0)
  const h1 = Math.abs(hash % 360)
  const h2 = (h1 + 40) % 360
  return `linear-gradient(135deg, hsl(${h1}, 60%, 45%) 0%, hsl(${h2}, 60%, 35%) 100%)`
})

// 当 track、stream 或 video 元素本身变化时，执行 play
watch(
  [() => props.participant.videoTrack, () => props.participant.localStream, videoEl],
  () => {
    const el = videoEl.value
    if (!el) return

    if (props.participant.isLocal && props.participant.localStream) {
      if (el.srcObject !== props.participant.localStream) {
        el.srcObject = props.participant.localStream
        el.play().catch((err) => console.warn('本地视频播放失败', err))
      }
      return
    }

    const track = props.participant.videoTrack
    if (track) {
      track.play(el)
    } else {
      el.srcObject = null
    }
  },
  { immediate: true }
)

function handleClick() {
  emit('click', props.participant.userId)
}

onUnmounted(() => {
  const el = videoEl.value
  if (el) {
    el.srcObject = null
  }
})
</script>

<style scoped src="./ParticipantTile.css"></style>
