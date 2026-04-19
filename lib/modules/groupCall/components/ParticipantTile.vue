<template>
  <div class="gcall-tile">
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
      <div v-else class="gcall-tile-avatar-fallback">
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

    <!-- 信息条 -->
    <div class="gcall-tile-info">
      <span class="gcall-tile-name">{{ participant.nickname }}</span>
      <span v-if="participant.isMuted" class="gcall-tile-mic">🔇</span>
      <span v-else-if="participant.isSpeaking" class="gcall-tile-speaking">🗣️</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed, onUnmounted } from 'vue'
import type { Participant } from '../types'

interface Props {
  participant: Participant
}

const props = defineProps<Props>()
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

onUnmounted(() => {
  const el = videoEl.value
  if (el) {
    el.srcObject = null
  }
})
</script>

<style scoped>
.gcall-tile {
  position: relative;
  width: 100%;
  height: 100%;
  background: #1a1a1a;
  border-radius: 8px;
  overflow: hidden;
}

.gcall-tile-video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.gcall-tile-video.mirror {
  transform: scaleX(-1);
}

.gcall-tile-placeholder {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: white;
}

.gcall-tile-avatar {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  object-fit: cover;
}

.gcall-tile-avatar-fallback {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: #444;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  font-weight: 500;
}

.gcall-tile-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.8);
}

.gcall-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: gcall-spin 1s linear infinite;
}

@keyframes gcall-spin {
  to {
    transform: rotate(360deg);
  }
}

.gcall-tile-hint {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
}

.gcall-tile-info {
  position: absolute;
  bottom: 8px;
  left: 8px;
  right: 8px;
  display: flex;
  align-items: center;
  gap: 6px;
  color: white;
  font-size: 12px;
  background: rgba(0, 0, 0, 0.5);
  padding: 4px 8px;
  border-radius: 4px;
  pointer-events: none;
}

.gcall-tile-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
