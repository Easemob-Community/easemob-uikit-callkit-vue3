<template>
  <div>
    <!-- 大窗口模式 -->
    <div v-if="!isMinimized" class="easemob-chat-single-call">
      <!-- 待接听状态子组件 -->
      <EasemobChatCallWaiting v-if="callStatus === CALL_STATUS.INVITING" :targetUser="props.targetUser" :type="props.type"
        @cancel="handleCancelCall" @switchToVideo="handleSwitchToVideo" />

      <!-- 通话中状态子组件 -->
      <EasemobChatCallStream v-else :type="props.type" @ended="handleEndCall" />
      
      <!-- 最小化按钮 -->
      <button v-if="callStatus !== CALL_STATUS.INVITING" class="minimize-btn" @click="handleMinimize" title="最小化">
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M5 12H19" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
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
import EasemobChatCallWaiting from './EasemobChatCallWaiting.vue'
import EasemobChatCallStream from './EasemobChatCallStream.vue'
import EasemobChatMiniWindow from '../EasemobChatMiniWindow.vue'

interface Props {
  targetUser: string
  type: 'audio' | 'video'
  enableRingtone?: boolean
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

// 处理切换到视频通话
const handleSwitchToVideo = () => {
  // 这里应该实现从语音切换到视频的逻辑
  console.log('Switching to video call')
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
})

onUnmounted(() => {
  if (stopStateWatch) {
    stopStateWatch()
  }
  handleEndCall()
})
</script>

<style scoped>
.easemob-chat-single-call {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.9);
  z-index: 1000;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.minimize-btn {
  position: absolute;
  top: 24px;
  right: 80px;
  width: 48px;
  height: 48px;
  background: rgba(255, 255, 255, 0.15);
  border: 2px solid rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s;
  backdrop-filter: blur(10px);
  z-index: 10;
}

.minimize-btn:hover {
  background: rgba(255, 255, 255, 0.25);
  border-color: rgba(255, 255, 255, 0.3);
  transform: scale(1.05);
}

.minimize-btn svg {
  width: 24px;
  height: 24px;
}
</style>