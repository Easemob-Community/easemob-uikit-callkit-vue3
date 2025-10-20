<template>
  <div class="call-waiting">
    <div class="caller-info">
      <div class="caller-avatar"></div>
      <div class="caller-details">
        <h3>正在呼叫</h3>
        <p>{{ targetUser }}</p>
        <div class="call-type-indicator">{{ callType === 'audio' ? '语音通话' : '视频通话' }}</div>
      </div>
    </div>
    
    <div class="waiting-controls">
      <button @click="cancelCall" class="cancel-btn">取消</button>
      <button v-if="callType === 'audio'" @click="switchToVideo" class="switch-btn">切换到视频</button>
    </div>
    
    <div class="waiting-timer">{{ waitingTime }}s</div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

interface Props {
  targetUser: string
  type: 'audio' | 'video'
}

const props = defineProps<Props>()

const emit = defineEmits<{
  cancel: []
  switchToVideo: []
}>()

const waitingTime = ref(0)
let waitingTimer: number | null = null

// 启动等待计时器
const startWaitingTimer = () => {
  waitingTime.value = 0
  waitingTimer = window.setInterval(() => {
    waitingTime.value++
  }, 1000)
}

// 停止等待计时器
const stopWaitingTimer = () => {
  if (waitingTimer) {
    clearInterval(waitingTimer)
    waitingTimer = null
  }
}

// 取消呼叫
const cancelCall = () => {
  emit('cancel')
}

// 切换到视频通话
const switchToVideo = () => {
  emit('switchToVideo')
}

const callType = ref(props.type)

onMounted(() => {
  startWaitingTimer()
})

onUnmounted(() => {
  stopWaitingTimer()
})
</script>

<style scoped>
.call-waiting {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: white;
}

.caller-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 50px;
}

.caller-avatar {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  margin-bottom: 20px;
  position: relative;
  overflow: hidden;
}

.caller-details {
  text-align: center;
}

.caller-details h3 {
  font-size: 24px;
  margin: 0 0 10px 0;
  font-weight: normal;
}

.caller-details p {
  font-size: 32px;
  margin: 0 0 10px 0;
  font-weight: bold;
}

.call-type-indicator {
  font-size: 18px;
  color: rgba(255, 255, 255, 0.7);
}

.waiting-controls {
  display: flex;
  gap: 30px;
  margin-bottom: 40px;
}

.cancel-btn {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  border: none;
  background: #ff4757;
  color: white;
  cursor: pointer;
  font-size: 16px;
  transition: all 0.3s;
}

.cancel-btn:hover {
  background: #ff3838;
  transform: scale(1.05);
}

.switch-btn {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  border: none;
  background: #007bff;
  color: white;
  cursor: pointer;
  font-size: 16px;
  transition: all 0.3s;
}

.switch-btn:hover {
  background: #0056b3;
  transform: scale(1.05);
}

.waiting-timer {
  font-size: 20px;
  color: rgba(255, 255, 255, 0.7);
}
</style>