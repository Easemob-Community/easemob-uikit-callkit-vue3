<template>
  <div>
    <!-- 大窗口模式 -->
    <div 
      v-if="!isMinimized" 
      ref="callContainerRef"
      class="easemob-chat-single-call"
      :class="{ 'is-dragging': isDragging }"
      :style="[containerStyle, backgroundStyle]"
      @mousedown="handleMouseDown"
    >
      <!-- 通话内容区域 -->
      <div class="call-content">
        <!-- 待接听状态子组件 - 只要不在通话中就显示等待界面 -->
        <EasemobChatCallWaiting v-if="!isInCall" :targetUser="props.targetUser" :type="props.type"
          @cancel="handleCancelCall" @switchToVideo="handleSwitchToVideo" />

        <!-- 通话中状态子组件 -->
        <EasemobChatCallStream v-else :type="props.type" @ended="handleEndCall" />
      </div>
      
      <!-- 最小化按钮 -->
      <button v-if="isInCall" class="minimize-btn" @click="handleMinimize" title="最小化" @mousedown.stop>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path fill-rule="evenodd" clip-rule="evenodd" d="M5.25 2.5C3.73122 2.5 2.5 3.73122 2.5 5.25V15.4995C2.5 17.0183 3.73122 18.2495 5.25 18.2495H9.50539C9.91961 18.2495 10.2554 17.9137 10.2554 17.4995C10.2554 17.0853 9.91961 16.7495 9.50539 16.7495H5.25C4.55964 16.7495 4 16.1899 4 15.4995V5.25C4 4.55964 4.55964 4 5.25 4H15.4995C16.1899 4 16.7495 4.55964 16.7495 5.25V9.50993C16.7495 9.92414 17.0853 10.2599 17.4995 10.2599C17.9137 10.2599 18.2495 9.92414 18.2495 9.50993V5.25C18.2495 3.73122 17.0183 2.5 15.4995 2.5H5.25ZM13.4995 12.9995H19.4995C19.7757 12.9995 19.9995 13.2234 19.9995 13.4995V19.4995C19.9995 19.7757 19.7757 19.9995 19.4995 19.9995H13.4995C13.2234 19.9995 12.9995 19.7757 12.9995 19.4995V13.4995C12.9995 13.2234 13.2234 12.9995 13.4995 12.9995ZM11.4995 13.4995C11.4995 12.3949 12.3949 11.4995 13.4995 11.4995H19.4995C20.6041 11.4995 21.4995 12.3949 21.4995 13.4995V19.4995C21.4995 20.6041 20.6041 21.4995 19.4995 21.4995H13.4995C12.3949 21.4995 11.4995 20.6041 11.4995 19.4995V13.4995Z" fill="currentColor"/>
        </svg>
      </button>
    </div>
    
    <!-- 小窗口模式 -->
    <EasemobChatMiniWindow 
      v-if="isMinimized" 
      @expand="handleExpand" 
      @close="handleEndCall"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useCallStateStore } from '../../store/callState'
import { CALL_STATUS } from '../../types/callstate.types'
import { DEFAULT_BACKGROUND_IMAGE, getAssetUrl } from '../../config/assets'
import EasemobChatCallWaiting from './EasemobChatCallWaiting.vue'
import EasemobChatCallStream from './EasemobChatCallStream.vue'
import EasemobChatMiniWindow from '../EasemobChatMiniWindow.vue'

interface Props {
  targetUser: string
  type: 'audio' | 'video'
  enableRingtone?: boolean
  /**
   * 自定义背景图 URL
   * 如果不传则使用默认 CDN 背景图
   * 如需离线使用，可传本地路径如：'/callkit-static-assets/images/callkit_bg.png'
   */
  backgroundImage?: string
}

const props = withDefaults(defineProps<Props>(), {
  enableRingtone: true
})

const emit = defineEmits<{
  callStarted: []
  callEnded: []
  callCanceled: []
}>()

// 通话状态管理 - 直接使用store
const callStateStore = useCallStateStore()
const isCallActive = ref(false)

// 计算属性 - 获取当前通话状态
const callStatus = computed(() => callStateStore.status)

// 判断是否处于通话中状态（IN_CALL 表示已接通）
const isInCall = computed(() => callStateStore.status === CALL_STATUS.IN_CALL)

// 小窗口模式状态
const isMinimized = computed(() => callStateStore.isMinimized)

// 最小化窗口
const handleMinimize = () => {
  callStateStore.isMinimized = true
}

// 展开窗口
const handleExpand = () => {
  callStateStore.isMinimized = false
  // 延迟后通知子组件重新播放远程视频
  setTimeout(() => {
    // 触发一个自定义事件让 CallStream 组件重新播放视频
    window.dispatchEvent(new CustomEvent('callkit:window-expanded'))
  }, 100)
}

// 开始通话
const startCall = async () => {
  try {
    isCallActive.value = true
    emit('callStarted')

    // 这里应该集成实际的通话SDK
    console.log(`Starting ${props.type} call with ${props.targetUser}`)
  } catch (error) {
    console.error('Failed to start call:', error)
    handleEndCall()
  }
}

// 处理取消呼叫
const handleCancelCall = () => {
  // 触发取消事件供外层使用
  emit('callCanceled')
}

// 处理结束通话
const handleEndCall = () => {
  isCallActive.value = false
  emit('callEnded')
}

// ========== 背景图配置 ==========
const backgroundStyle = computed(() => {
  const bgUrl = getAssetUrl(props.backgroundImage, DEFAULT_BACKGROUND_IMAGE)
  return {
    backgroundImage: `url(${bgUrl})`
  }
})

// ========== 拖拽功能 ==========
const callContainerRef = ref<HTMLElement>()
const isDragging = ref(false)
const dragOffset = ref({ x: 0, y: 0 })
const containerPosition = ref({ x: 0, y: 0 })
const hasDragged = ref(false) // 标记是否已经开始拖拽

// 容器样式（用于动态定位）
const containerStyle = computed(() => {
  if (!hasDragged.value) {
    return {} // 使用默认的居中样式
  }
  return {
    left: `${containerPosition.value.x}px`,
    top: `${containerPosition.value.y}px`,
    transform: 'translate(-50%, -50%)'
  }
})

// 处理鼠标按下开始拖拽
const handleMouseDown = (e: MouseEvent) => {
  // 只有左键可以拖拽
  if (e.button !== 0) return
  
  const container = callContainerRef.value
  if (!container) return

  isDragging.value = true
  
  const rect = container.getBoundingClientRect()
  
  // 如果是第一次拖拽，设置初始位置为当前中心点
  if (!hasDragged.value) {
    hasDragged.value = true
    containerPosition.value = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2
    }
  }
  
  // 计算鼠标相对于容器中心点的偏移
  dragOffset.value = {
    x: e.clientX - containerPosition.value.x,
    y: e.clientY - containerPosition.value.y
  }
}

// 处理鼠标移动
const handleMouseMove = (e: MouseEvent) => {
  if (!isDragging.value) return
  
  const container = callContainerRef.value
  if (!container) return
  
  const rect = container.getBoundingClientRect()
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight
  
  // 计算新位置（以中心点为基准）
  let newX = e.clientX - dragOffset.value.x
  let newY = e.clientY - dragOffset.value.y
  
  // 边界限制 - 确保容器不会被拖出视口
  const minVisible = 60 // 至少保留60px可见
  const halfWidth = rect.width / 2
  const halfHeight = rect.height / 2
  
  // 限制范围：容器中心点不能超出视口边界
  const minX = halfWidth - rect.width + minVisible
  const maxX = viewportWidth - halfWidth + rect.width - minVisible - 10
  const minY = halfHeight - rect.height + minVisible
  const maxY = viewportHeight - halfHeight + rect.height - minVisible - 10
  
  newX = Math.max(minX, Math.min(maxX, newX))
  newY = Math.max(minY, Math.min(maxY, newY))
  
  containerPosition.value = { x: newX, y: newY }
}

// 处理鼠标释放
const handleMouseUp = () => {
  isDragging.value = false
}

// 监听通话状态变化 - 使用store.$subscribe
let stopStateWatch: Function | null = null

onMounted(() => {
  startCall()

  // 设置状态监听器
  stopStateWatch = callStateStore.$subscribe((_mutation, state) => {
    console.log('Call state changed:', state.status)
    // 当状态变为IDLE时，触发callEnded事件关闭弹窗
    if (state.status === CALL_STATUS.IDLE && isCallActive.value) {
      handleEndCall()
    }
  })
  
  // 添加全局鼠标事件监听
  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', handleMouseUp)
})

onUnmounted(() => {
  if (stopStateWatch) {
    stopStateWatch()
  }
  handleEndCall()
  
  // 移除全局鼠标事件监听
  document.removeEventListener('mousemove', handleMouseMove)
  document.removeEventListener('mouseup', handleMouseUp)
})
</script>

<style scoped src="./styles/EasemobChatSingleCall.css"></style>