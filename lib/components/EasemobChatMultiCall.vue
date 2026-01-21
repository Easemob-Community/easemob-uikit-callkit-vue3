<template>
  <div 
    ref="containerRef" 
    class="easemob-chat-multi-call"
    :style="backgroundStyle"
    @click="handleClearScreen"
  >
    <!-- Header 区域 -->
    <div v-if="!isClearScreen" class="call-header">
      <div class="header-content">
        <img v-if="groupAvatar" :src="groupAvatar" class="group-avatar" />
        <div class="header-info">
          <h3>{{ groupName || groupId }}</h3>
          <span class="call-duration">{{ callDuration }}</span>
        </div>
      </div>
      <div class="header-actions">
        <button @click.stop="toggleFullscreen" class="icon-btn">
          <span v-if="isFullscreen">退出全屏</span>
          <span v-else>全屏</span>
        </button>
        <button @click.stop="handleAddParticipant" class="icon-btn">
          添加成员
        </button>
      </div>
    </div>

    <!-- 视频内容区域 -->
    <div class="video-content" ref="contentRef">
      <div v-if="participants.length === 0" class="empty-state">
        暂无参与者
      </div>
      
      <!-- 网格布局模式 -->
      <div 
        v-else-if="!isMainVideoMode" 
        class="video-grid"
        :class="`video-grid-rows-${layoutConfig.rows}`"
      >
        <div 
          v-for="(row, rowIndex) in layoutRows" 
          :key="rowIndex"
          class="video-row"
        >
          <div
            v-for="participant in row"
            :key="participant.userId"
            class="video-wrapper"
            :style="videoWrapperStyle"
            @click.stop="handleVideoClick(participant.userId)"
          >
            <div class="participant-video">
              <video
                ref="videoRefs"
                :data-user-id="participant.userId"
                autoplay
                playsinline
                :muted="participant.userId === currentUserId"
              ></video>
              <div class="participant-info">
                <span>{{ participant.userName }}</span>
                <span v-if="participant.isMuted" class="muted-indicator">🔇</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 主视频模式（一大多小） -->
      <div v-else class="main-video-layout">
        <!-- 主视频 -->
        <div class="main-video" :style="mainVideoStyle" @click.stop="exitMainVideoMode">
          <div class="participant-video">
            <video
              :data-user-id="selectedParticipant?.userId"
              autoplay
              playsinline
              :muted="selectedParticipant?.userId === currentUserId"
            ></video>
            <div class="participant-info">
              <span>{{ selectedParticipant?.userName }}</span>
              <span v-if="selectedParticipant?.isMuted" class="muted-indicator">🔇</span>
            </div>
          </div>
        </div>

        <!-- 缩略图列表 -->
        <div v-if="otherParticipants.length > 0" class="thumbnails-container">
          <!-- 左滚动按钮 -->
          <button 
            v-if="canScrollLeft" 
            class="scroll-button scroll-left"
            @click.stop="scrollThumbnails('left')"
          >
            ‹
          </button>

          <!-- 缩略图滚动区域 -->
          <div class="thumbnails-scroll" ref="thumbnailScrollRef">
            <div class="thumbnails-list" :style="thumbnailsListStyle">
              <div
                v-for="participant in otherParticipants"
                :key="participant.userId"
                class="thumbnail-wrapper"
                @click.stop="handleVideoClick(participant.userId)"
              >
                <div class="participant-video">
                  <video
                    :data-user-id="participant.userId"
                    autoplay
                    playsinline
                    :muted="participant.userId === currentUserId"
                  ></video>
                  <div class="participant-info">
                    <span>{{ participant.userName }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 右滚动按钮 -->
          <button 
            v-if="canScrollRight" 
            class="scroll-button scroll-right"
            @click.stop="scrollThumbnails('right')"
          >
            ›
          </button>
        </div>
      </div>
    </div>

    <!-- Controls 区域 -->
    <div v-if="!isClearScreen" class="call-controls">
      <button @click.stop="toggleMute" :class="{ active: isMuted }" class="control-btn">
        {{ isMuted ? '取消静音' : '静音' }}
      </button>
      <button @click.stop="toggleVideo" :class="{ active: !isVideoEnabled }" class="control-btn">
        {{ isVideoEnabled ? '关闭摄像头' : '开启摄像头' }}
      </button>
      <button @click.stop="toggleScreenShare" :class="{ active: isScreenSharing }" class="control-btn">
        {{ isScreenSharing ? '停止共享' : '共享屏幕' }}
      </button>
      <button @click.stop="endCall" class="control-btn end-call-btn">挂断</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useCallStateStore } from '../store/callState'
import { CallService } from '../services/CallService'
import { HANGUP_REASON } from '../types/callstate.types'
import { logger } from '../utils/logger'

interface Participant {
  userId: string
  userName: string
  avatar?: string
  isHost?: boolean
  isMuted?: boolean
}

interface Props {
  groupId?: string
  groupName?: string
  groupAvatar?: string
  participants: Participant[]
  type: 'audio' | 'video'
  maxParticipants?: number
  backgroundImage?: string
  currentUserId?: string
}

const props = withDefaults(defineProps<Props>(), {
  maxParticipants: 18,
  type: 'video'
})

const emit = defineEmits<{
  callStarted: []
  callEnded: []
  addParticipant: []
}>()

const callStateStore = useCallStateStore()

// Refs
const containerRef = ref<HTMLDivElement>()
const contentRef = ref<HTMLDivElement>()
const thumbnailScrollRef = ref<HTMLDivElement>()
const videoRefs = ref<HTMLVideoElement[]>([])

// 状态
const isMuted = ref(false)
const isVideoEnabled = ref(true)
const isScreenSharing = ref(false)
const isCallActive = ref(false)
const isClearScreen = ref(false)
const isFullscreen = ref(false)

// 布局模式
const isMainVideoMode = ref(false)
const selectedVideoId = ref<string | null>(null)

// 滚动状态
const canScrollLeft = ref(false)
const canScrollRight = ref(false)

// 容器尺寸
const containerSize = ref({ width: 0, height: 0 })

// 通话时长
const callDuration = ref('00:00:00')
let durationTimer: number | null = null
let startTime = 0

// 计算属性
const backgroundStyle = computed(() => {
  if (props.backgroundImage) {
    return {
      backgroundImage: `url(${props.backgroundImage})`,
      backgroundSize: '100% 100%',
      backgroundPosition: '0px 0px',
      backgroundRepeat: 'no-repeat'
    }
  }
  return {}
})

// 布局配置
interface LayoutConfig {
  rows: number
  cols: number
  maxCols: number
  itemsPerRow: number[]
}

const layoutConfig = computed((): LayoutConfig => {
  const count = props.participants.length
  const isMobile = containerSize.value.width < 530

  if (count === 0) {
    return { rows: 0, cols: 0, maxCols: 0, itemsPerRow: [] }
  }

  if (isMobile) {
    // 移动端布局
    if (count <= 2) {
      return { rows: 1, cols: count, maxCols: count, itemsPerRow: [count] }
    } else if (count <= 4) {
      return { rows: 2, cols: 2, maxCols: 2, itemsPerRow: [2, count - 2] }
    } else if (count <= 6) {
      return { rows: 3, cols: 2, maxCols: 2, itemsPerRow: [2, 2, count - 4] }
    } else if (count <= 9) {
      return { rows: 3, cols: 3, maxCols: 3, itemsPerRow: [3, 3, count - 6] }
    } else if (count <= 12) {
      return { rows: 4, cols: 3, maxCols: 3, itemsPerRow: [3, 3, 3, count - 9] }
    } else {
      return { rows: 4, cols: 4, maxCols: 4, itemsPerRow: [4, 4, 4, count - 12] }
    }
  } else {
    // 桌面端布局
    if (count <= 4) {
      return { rows: 1, cols: count, maxCols: count, itemsPerRow: [count] }
    } else if (count <= 8) {
      const firstRow = 4
      return { rows: 2, cols: 4, maxCols: 4, itemsPerRow: [firstRow, count - firstRow] }
    } else if (count <= 10) {
      const firstRow = 5
      return { rows: 2, cols: 5, maxCols: 5, itemsPerRow: [firstRow, count - firstRow] }
    } else if (count <= 12) {
      const firstRow = 6
      return { rows: 2, cols: 6, maxCols: 6, itemsPerRow: [firstRow, count - firstRow] }
    } else {
      const firstRow = 6
      const secondRow = 6
      return { 
        rows: 3, 
        cols: 6, 
        maxCols: 6, 
        itemsPerRow: [firstRow, secondRow, count - firstRow - secondRow] 
      }
    }
  }
})

// 按行分组参与者
const layoutRows = computed(() => {
  const rows: Participant[][] = []
  let participantIndex = 0

  layoutConfig.value.itemsPerRow.forEach(itemCount => {
    const row = props.participants.slice(participantIndex, participantIndex + itemCount)
    rows.push(row)
    participantIndex += itemCount
  })

  return rows
})

// 视频窗口样式
const videoWrapperStyle = computed(() => {
  const { rows, maxCols } = layoutConfig.value
  const gap = 8
  const headerHeight = isClearScreen.value ? 0 : 60
  const controlsHeight = isClearScreen.value ? 0 : 60
  const containerPadding = 8
  
  const availableHeight = containerSize.value.height - headerHeight - controlsHeight - containerPadding * 2 - 16 - 8
  const availableWidth = containerSize.value.width - containerPadding * 2 - gap * 2

  const totalRowGaps = Math.max(0, rows - 1) * gap
  const videoContainerHeight = availableHeight - totalRowGaps
  const heightPerRow = videoContainerHeight / rows

  const totalWidthGaps = (maxCols - 1) * gap
  const widthBasedVideoWidth = (availableWidth - totalWidthGaps) / maxCols
  const widthBasedVideoHeight = widthBasedVideoWidth / 1 // aspectRatio = 1

  const heightBasedVideoHeight = heightPerRow
  const heightBasedVideoWidth = heightBasedVideoHeight * 1

  let finalVideoWidth: number
  let finalVideoHeight: number

  if (widthBasedVideoHeight <= heightPerRow) {
    finalVideoWidth = widthBasedVideoWidth
    finalVideoHeight = widthBasedVideoHeight
  } else {
    finalVideoWidth = heightBasedVideoWidth
    finalVideoHeight = heightBasedVideoHeight
  }

  finalVideoWidth = Math.max(100, finalVideoWidth)
  finalVideoHeight = Math.max(100, finalVideoHeight)

  return {
    width: `${finalVideoWidth}px`,
    height: `${finalVideoHeight}px`,
    flexShrink: 0,
    flexGrow: 0
  }
})

// 主视频模式相关
const selectedParticipant = computed(() => {
  if (!selectedVideoId.value) return props.participants[0]
  return props.participants.find(p => p.userId === selectedVideoId.value) || props.participants[0]
})

const otherParticipants = computed(() => {
  return props.participants.filter(p => p.userId !== selectedParticipant.value?.userId)
})

const mainVideoStyle = computed(() => {
  const gap = 12
  const containerPadding = 16
  const thumbnailHeight = 72
  const headerHeight = isClearScreen.value ? 0 : 60
  const controlsHeight = isClearScreen.value ? 0 : 60
  
  const totalFixedHeight = headerHeight + controlsHeight + 16 + 8
  const availableHeight = containerSize.value.height - totalFixedHeight - 14
  const availableWidth = containerSize.value.width - containerPadding * 2

  const mainVideoMaxHeight = availableHeight - thumbnailHeight - gap - containerPadding * 2
  const mainVideoMaxWidth = availableWidth

  let videoWidth = mainVideoMaxWidth
  let videoHeight = videoWidth / 1

  if (videoHeight > mainVideoMaxHeight) {
    videoHeight = mainVideoMaxHeight
    videoWidth = mainVideoMaxHeight * 1
  }

  videoWidth = Math.max(100, videoWidth)
  videoHeight = Math.max(100, videoHeight)

  if (videoWidth > videoHeight) {
    videoWidth = videoHeight * 1
  } else {
    videoHeight = videoWidth / 1
  }

  return {
    width: `${videoWidth}px`,
    height: `${videoHeight}px`
  }
})

const thumbnailsListStyle = computed(() => {
  const thumbnailWidth = 72
  const gap = 8
  const totalWidth = otherParticipants.value.length * (thumbnailWidth + gap) - gap
  return {
    display: 'flex',
    gap: `${gap}px`,
    width: `${totalWidth}px`,
    minWidth: 'max-content',
    height: '100%'
  }
})

// 方法
const startCall = async () => {
  try {
    isCallActive.value = true
    emit('callStarted')
    
    // 开始计时
    startTime = Date.now()
    startDurationTimer()
    
    console.log(`Starting ${props.type} group call in ${props.groupId || props.groupName}`)
  } catch (error) {
    console.error('Failed to start group call:', error)
  }
}

const startDurationTimer = () => {
  durationTimer = window.setInterval(() => {
    const elapsed = Date.now() - startTime
    const hours = Math.floor(elapsed / 3600000)
    const minutes = Math.floor((elapsed % 3600000) / 60000)
    const seconds = Math.floor((elapsed % 60000) / 1000)
    
    callDuration.value = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  }, 1000)
}

const toggleMute = () => {
  isMuted.value = !isMuted.value
  // TODO: 实现静音逻辑
}

const toggleVideo = () => {
  isVideoEnabled.value = !isVideoEnabled.value
  // TODO: 实现视频开关逻辑
}

const toggleScreenShare = () => {
  isScreenSharing.value = !isScreenSharing.value
  // TODO: 实现屏幕共享逻辑
}

const toggleFullscreen = () => {
  isFullscreen.value = !isFullscreen.value
  // TODO: 实现全屏逻辑
}

const endCall = async () => {
  try {
    logger.info('EasemobChatMultiCall: 用户点击挂断按钮，开始挂断流程')
    
    // 调用 CallService 发送 leaveCall 信令并清理资源
    const callService = new CallService()
    await callService.hangup(HANGUP_REASON.HANGUP)
    
    logger.info('EasemobChatMultiCall: 挂断流程完成')
  } catch (error) {
    logger.error('EasemobChatMultiCall: 挂断失败:', error)
  } finally {
    // 无论信令发送成功与否，都要清理本地状态
    isCallActive.value = false
    if (durationTimer) {
      clearInterval(durationTimer)
      durationTimer = null
    }
    emit('callEnded')
  }
}

const handleAddParticipant = () => {
  emit('addParticipant')
}

// 清屏模式切换
const handleClearScreen = () => {
  isClearScreen.value = !isClearScreen.value
}

// 视频点击处理
const handleVideoClick = (userId: string) => {
  if (!isMainVideoMode.value) {
    // 首次进入主视频模式
    isMainVideoMode.value = true
    selectedVideoId.value = userId
  } else if (selectedVideoId.value !== userId) {
    // 切换主视频
    selectedVideoId.value = userId
  }
}

// 退出主视频模式
const exitMainVideoMode = () => {
  isMainVideoMode.value = false
  selectedVideoId.value = null
}

// 缩略图滚动
const checkScrollState = () => {
  const container = thumbnailScrollRef.value
  if (!container) return

  const { scrollLeft, scrollWidth, clientWidth } = container
  canScrollLeft.value = scrollLeft > 0
  canScrollRight.value = scrollLeft < scrollWidth - clientWidth - 5
}

const scrollThumbnails = (direction: 'left' | 'right') => {
  const container = thumbnailScrollRef.value
  if (!container) return

  const thumbnailWidth = 72
  const gap = 8
  const scrollAmount = (thumbnailWidth + gap) * 2
  const currentScrollLeft = container.scrollLeft
  const targetScrollLeft = direction === 'left'
    ? currentScrollLeft - scrollAmount
    : currentScrollLeft + scrollAmount

  container.scrollTo({
    left: targetScrollLeft,
    behavior: 'smooth'
  })
}

// 更新容器尺寸
const updateContainerSize = () => {
  if (contentRef.value) {
    containerSize.value = {
      width: contentRef.value.clientWidth,
      height: contentRef.value.clientHeight
    }
  }
}

// 监听缩略图滚动
watch(() => thumbnailScrollRef.value, () => {
  const container = thumbnailScrollRef.value
  if (!container) return

  container.addEventListener('scroll', checkScrollState)
  setTimeout(checkScrollState, 200)
}, { immediate: true })

watch(() => otherParticipants.value.length, () => {
  setTimeout(checkScrollState, 300)
})

onMounted(() => {
  startCall()
  updateContainerSize()
  
  // 监听窗口大小变化
  window.addEventListener('resize', updateContainerSize)
  
  // 初始化后延迟计算容器尺寸
  nextTick(() => {
    updateContainerSize()
  })
})

onUnmounted(() => {
  endCall()
  window.removeEventListener('resize', updateContainerSize)
  
  const container = thumbnailScrollRef.value
  if (container) {
    container.removeEventListener('scroll', checkScrollState)
  }
})
</script>

<style scoped>
.easemob-chat-multi-call {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.9);
  z-index: 1000;
  display: flex;
  flex-direction: column;
}

/* Header 样式 */
.call-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 60px;
  padding: 0 16px;
  color: white;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.header-content {
  display: flex;
  align-items: center;
  gap: 12px;
}

.group-avatar {
  width: 40px;
  height: 40px;
  border-radius: 4px;
  object-fit: cover;
}

.header-info h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 500;
}

.call-duration {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.7);
}

.header-actions {
  display: flex;
  gap: 8px;
}

.icon-btn {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.1);
  color: white;
  cursor: pointer;
  font-size: 14px;
  transition: background 0.2s;
}

.icon-btn:hover {
  background: rgba(255, 255, 255, 0.2);
}

/* 视频内容区域 */
.video-content {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  padding: 8px;
}

.empty-state {
  color: rgba(255, 255, 255, 0.5);
  font-size: 16px;
}

/* 网格布局 */
.video-grid {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 8px;
}

.video-row {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
}

.video-wrapper {
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.video-wrapper:hover {
  transform: scale(1.02);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.participant-video {
  position: relative;
  width: 100%;
  height: 100%;
  background: #000;
  border-radius: 8px;
  overflow: hidden;
}

.participant-video video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.participant-info {
  position: absolute;
  bottom: 8px;
  left: 8px;
  color: white;
  background: rgba(0, 0, 0, 0.6);
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.muted-indicator {
  font-size: 12px;
}

/* 主视频布局 */
.main-video-layout {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
}

.main-video {
  cursor: pointer;
  transition: transform 0.2s;
}

.main-video:hover {
  transform: scale(1.01);
}

/* 缩略图容器 */
.thumbnails-container {
  position: relative;
  width: 100%;
  max-width: 600px;
  height: 72px;
  display: flex;
  align-items: center;
}

.thumbnails-scroll {
  flex: 1;
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: none;
}

.thumbnails-scroll::-webkit-scrollbar {
  display: none;
}

.thumbnails-list {
  display: flex;
  height: 100%;
}

.thumbnail-wrapper {
  width: 72px;
  height: 72px;
  flex-shrink: 0;
  cursor: pointer;
  transition: transform 0.2s;
}

.thumbnail-wrapper:hover {
  transform: scale(1.05);
}

.thumbnail-wrapper .participant-video {
  border: 2px solid rgba(255, 255, 255, 0.3);
}

.thumbnail-wrapper .participant-info {
  font-size: 10px;
  padding: 2px 4px;
}

/* 滚动按钮 */
.scroll-button {
  position: absolute;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  font-size: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 10;
  transition: background 0.2s;
}

.scroll-button:hover {
  background: rgba(0, 0, 0, 0.9);
}

.scroll-left {
  left: -16px;
}

.scroll-right {
  right: -16px;
}

/* 控制按钮 */
.call-controls {
  display: flex;
  justify-content: center;
  gap: 12px;
  padding: 16px;
  height: 60px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.control-btn {
  padding: 10px 20px;
  border: none;
  border-radius: 50px;
  background: rgba(255, 255, 255, 0.2);
  color: white;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s;
  white-space: nowrap;
}

.control-btn:hover {
  background: rgba(255, 255, 255, 0.3);
}

.control-btn.active {
  background: #ff4757;
}

.end-call-btn {
  background: #ff4757;
}

.end-call-btn:hover {
  background: #ff3838;
}

/* 响应式 */
@media (max-width: 768px) {
  .call-header {
    padding: 0 12px;
  }
  
  .header-info h3 {
    font-size: 14px;
  }
  
  .call-duration {
    font-size: 12px;
  }
  
  .icon-btn {
    padding: 6px 12px;
    font-size: 12px;
  }
  
  .control-btn {
    padding: 8px 16px;
    font-size: 12px;
  }
  
  .thumbnails-container {
    max-width: 100%;
  }
}
</style>