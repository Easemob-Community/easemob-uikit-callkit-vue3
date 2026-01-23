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
      <button @click="cancelCall" class="cancel-btn">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
          <path d="M8.43445 12.6265C8.40888 12.6658 8.46336 13.037 8.45381 13.1428C8.43469 13.3543 8.44114 13.5264 8.40602 13.6715C8.24328 14.7412 7.53366 15.2879 5.71437 15.4497C4.58252 15.5543 3.85663 15.3068 3.4024 14.7319C3.08891 14.3045 2.98642 13.7342 3.01174 12.967C2.99573 12.9006 2.99239 12.4507 3.02751 12.3056C3.02369 10.4 7.03906 8.58585 11.9887 8.60976C16.8967 8.60665 20.9804 10.4191 21.0002 12.3909L20.9971 12.6688L20.994 12.9466C20.9911 13.9523 20.9178 14.5203 20.5023 14.9781C20.0867 15.4359 19.3642 15.6384 18.3857 15.5067C16.2946 15.2681 15.6485 14.6246 15.6064 13.1421C15.616 13.0363 15.6286 12.6527 15.5871 12.6257C15.5742 12.2815 14.196 11.9462 12.0345 11.9979C9.81551 11.9561 8.40554 12.2159 8.43445 12.6265Z" />
        </svg>
      </button>
      <button v-if="callType === 'audio'" @click="switchToVideo" class="switch-btn">
        <svg width="32" height="32" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
          <path fill-rule="evenodd" clip-rule="evenodd" d="M3.88889 5C2.84568 5 2 5.84568 2 6.88889V17.1111C2 18.1543 2.84568 19 3.88889 19H15.8611C16.9043 19 17.75 18.1543 17.75 17.1111V15.3089L21.0178 17.1244C21.4585 17.3692 22 17.0505 22 16.5464V7.46025C22 6.95616 21.4585 6.63753 21.0178 6.88233L17.75 8.69779V6.88889C17.75 5.84568 16.9043 5 15.8611 5H3.88889ZM5.5 10C6.32843 10 7 9.32843 7 8.5C7 7.67157 6.32843 7 5.5 7C4.67157 7 4 7.67157 4 8.5C4 9.32843 4.67157 10 5.5 10Z" />
        </svg>
      </button>
    </div>
    
    <div class="waiting-timer">{{ waitingTime }}s</div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useEndCall } from '../../composables/useEndCall'

interface Props {
  targetUser: string
  type: 'audio' | 'video'
}

const props = defineProps<Props>()

const { cancelCall: hangupCall } = useEndCall()

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
  stopWaitingTimer()
  hangupCall()
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
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: white;
  background-image: url(/lib/callkit-static-assets/images/callkit_bg.png);
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
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