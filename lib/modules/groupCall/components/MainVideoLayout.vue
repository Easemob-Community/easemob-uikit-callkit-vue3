<template>
  <div class="gcall-main-layout">
    <!-- 主视频 -->
    <div class="gcall-main-video" @click="handleMainClick">
      <div class="gcall-main-video-inner">
        <ParticipantTile :key="mainParticipant.userId" :participant="mainParticipant" />
      </div>
      <button class="gcall-main-video-exit" title="返回九宫格" @click.stop="handleExit">
        <CallKitIcon name="chevron-4-cluster" :width="16" :height="16" color="#fff" />
      </button>
    </div>

    <!-- 缩略图 -->
    <div v-if="otherParticipants.length > 0" class="gcall-thumbnails">
      <button
        v-if="canScrollLeft"
        class="gcall-scroll-btn"
        @click="scroll('left')"
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M8 2L4 6L8 10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </button>

      <div ref="scrollRef" class="gcall-thumbnails-scroll" @scroll="checkScroll">
        <div
          v-for="p in otherParticipants"
          :key="p.userId"
          class="gcall-thumbnail"
          :class="{ active: p.userId === selectedId }"
          @click="handleThumbnailClick(p.userId)"
        >
          <ParticipantTile :participant="p" />
        </div>
      </div>

      <button
        v-if="canScrollRight"
        class="gcall-scroll-btn"
        @click="scroll('right')"
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M4 2L8 6L4 10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, nextTick, watch } from 'vue'
import ParticipantTile from './ParticipantTile.vue'
import CallKitIcon from './CallKitIcon.vue'
import type { Participant } from '../types'

interface Props {
  participants: Participant[]
  selectedId: string
}

const props = defineProps<Props>()
const emit = defineEmits<{
  select: [userId: string]
  exit: []
}>()

const scrollRef = ref<HTMLDivElement | null>(null)
const canScrollLeft = ref(false)
const canScrollRight = ref(false)

const mainParticipant = computed(() => {
  return props.participants.find((p) => p.userId === props.selectedId) || props.participants[0]
})

const otherParticipants = computed(() => {
  return props.participants.filter((p) => p.userId !== props.selectedId)
})

function checkScroll() {
  const el = scrollRef.value
  if (!el) return
  canScrollLeft.value = el.scrollLeft > 0
  canScrollRight.value = el.scrollLeft < el.scrollWidth - el.clientWidth - 2
}

function scroll(direction: 'left' | 'right') {
  const el = scrollRef.value
  if (!el) return
  const amount = 80
  el.scrollBy({ left: direction === 'left' ? -amount : amount, behavior: 'smooth' })
}

function handleThumbnailClick(userId: string) {
  emit('select', userId)
}

function handleMainClick() {
  // 点击主视频区域也可以切换选中者（循环）
  const idx = props.participants.findIndex((p) => p.userId === props.selectedId)
  const next = props.participants[(idx + 1) % props.participants.length]
  if (next) {
    emit('select', next.userId)
  }
}

function handleExit() {
  emit('exit')
}

// 监听列表变化重新检查滚动状态
watch(() => props.participants.length, () => {
  nextTick(checkScroll)
})

// 初始检查
nextTick(checkScroll)
</script>

<style scoped>
/* ========== 主视频模式 ========== */
.gcall-main-layout {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  padding: 8px;
  gap: 8px;
}

.gcall-main-video {
  flex: 1;
  min-height: 120px;
  position: relative;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
}

.gcall-main-video-inner {
  position: absolute;
  inset: 0;
  display: flex;
  overflow: hidden;
}

.gcall-main-video-inner > :deep(.gcall-tile) {
  flex: 1;
  min-height: 0;
  border-radius: 0;
}

.gcall-main-video-exit {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.5);
  border: none;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.2s ease;
  z-index: 5;
}

.gcall-main-video:hover .gcall-main-video-exit {
  opacity: 1;
}

.gcall-thumbnails {
  height: 84px;
  min-height: 84px;
  max-height: 84px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  position: relative;
  overflow: hidden;
}

.gcall-thumbnails-scroll {
  flex: 1;
  height: 100%;
  overflow-x: auto;
  overflow-y: hidden;
  display: flex;
  align-items: center;
  gap: 8px;
  scroll-behavior: smooth;
  scrollbar-width: none; /* Firefox */
}

.gcall-thumbnails-scroll::-webkit-scrollbar {
  display: none; /* Chrome/Safari */
}

.gcall-thumbnail {
  width: 120px;
  height: 72px;
  flex-shrink: 0;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  transition: box-shadow 0.2s ease;
}

.gcall-thumbnail.active {
  box-shadow: 0 0 0 2px #33b1ff;
}

.gcall-thumbnail :deep(.gcall-tile) {
  border-radius: 0;
}

.gcall-thumbnail :deep(.gcall-tile-info) {
  display: none;
}

.gcall-thumbnail :deep(.gcall-tile-hover-icon) {
  display: none;
}

/* 缩略图内 avatar 缩小适配，避免 80px 在 72px 容器里溢出变形 */
.gcall-thumbnail :deep(.gcall-tile-avatar),
.gcall-thumbnail :deep(.gcall-tile-avatar-fallback) {
  width: 36px;
  height: 36px;
  font-size: 14px;
}

.gcall-thumbnail :deep(.gcall-tile-placeholder) {
  gap: 4px;
}

.gcall-thumbnail :deep(.gcall-tile-hint) {
  font-size: 10px;
}

.gcall-scroll-btn {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.5);
  border: none;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  transition: background 0.2s ease;
}

.gcall-scroll-btn:hover {
  background: rgba(0, 0, 0, 0.7);
}

/* ========== 响应式 ========== */
@media (max-width: 768px) {
  .gcall-thumbnails {
    height: 76px;
    min-height: 76px;
    max-height: 76px;
  }

  .gcall-thumbnail {
    width: 108px;
    height: 64px;
  }
}

@media (max-width: 480px) {
  .gcall-thumbnails {
    height: 68px;
    min-height: 68px;
    max-height: 68px;
  }

  .gcall-thumbnail {
    width: 96px;
    height: 56px;
  }
}
</style>
