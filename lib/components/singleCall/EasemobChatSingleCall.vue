<template>
  <div>
    <!-- 大窗口模式 -->
    <div 
      v-if="!isMinimized" 
      ref="elementRef"
      class="easemob-chat-single-call"
      :class="{ 'is-dragging': isDragging, 'has-dragged': hasDragged }"
      :style="[style, backgroundStyle]"
      @mousedown="startDrag"
    >
      <!-- 通话内容区域 -->
      <div class="call-content">
        <!-- 待接听状态子组件 - 只要不在通话中就显示等待界面 -->
        <EasemobChatCallWaiting v-if="!isInCall" :targetUser="props.targetUser" :type="props.type"
          @cancel="handleCancelCall"/>

        <!-- 通话中状态子组件 -->
        <EasemobChatCallStream v-else :type="props.type" @ended="handleEndCall" />
      </div>
      
      <!-- 最小化按钮 -->
      <button v-if="isInCall" class="minimize-btn" @click="handleMinimize" title="最小化">
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
import { ref, onMounted, onUnmounted, computed, type CSSProperties } from 'vue'
import { useCallStateStore } from '../../store/callState'
import { useGlobalCallStore } from '../../store/globalCall'
import { CALL_STATUS } from '../../types/callstate.types'
import { DEFAULT_BACKGROUND_IMAGE, getAssetUrl } from '../../config/assets'
import { useDraggable } from '../../composables/useDraggable'
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
const globalCallStore = useGlobalCallStore()
const isCallActive = ref(false)

// 计算属性 - 获取当前通话状态
const callStatus = computed(() => callStateStore.status)

// 判断是否处于通话中状态（IN_CALL 表示已接通）
const isInCall = computed(() => callStateStore.status === CALL_STATUS.IN_CALL)

// 小窗口模式状态
const isMinimized = computed(() => globalCallStore.isMinimized)

// 窗口尺寸常量
const CONTAINER_WIDTH = 360
const CONTAINER_HEIGHT = 640

// ========== 使用拖拽 Composable ==========
// 使用 centered 选项让 hook 内部处理居中定位
const {
  elementRef,
  isDragging,
  hasDragged,
  style,
  startDrag
} = useDraggable({
  centered: true,
  width: CONTAINER_WIDTH,
  height: CONTAINER_HEIGHT,
  boundary: true,
  boundaryPadding: 20
})

// 最小化窗口
const handleMinimize = () => {
  globalCallStore.isMinimized = true
}

// 展开窗口
const handleExpand = () => {
  globalCallStore.isMinimized = false
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
const backgroundStyle = computed<CSSProperties>(() => {
  const bgUrl = getAssetUrl(props.backgroundImage, DEFAULT_BACKGROUND_IMAGE)
  return {
    backgroundImage: `url(${bgUrl})`
  }
})

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
})

onUnmounted(() => {
  if (stopStateWatch) {
    stopStateWatch()
  }
  handleEndCall()
})
</script>

<style scoped src="./styles/EasemobChatSingleCall.css"></style>
