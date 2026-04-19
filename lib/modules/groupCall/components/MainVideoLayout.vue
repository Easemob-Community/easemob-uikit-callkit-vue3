<template>
  <div class="gcall-main-layout">
    <!-- 主视频 -->
    <div class="gcall-main-video" @click="handleMainClick">
      <ParticipantTile :participant="mainParticipant" />
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
