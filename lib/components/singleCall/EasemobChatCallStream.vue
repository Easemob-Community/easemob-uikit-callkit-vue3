<template>
  <div class="call-stream-container">
    <div class="call-container">
      <div class="local-video">
        <video ref="localVideo" autoplay muted></video>
      </div>
      <div class="remote-video">
        <video ref="remoteVideo" autoplay></video>
      </div>
    </div>
    
    <div class="call-controls">
      <button 
        @click="toggleMute" 
        :class="{ active: isMuted }"
      >
        {{ isMuted ? '取消静音' : '静音' }}
      </button>
      <button 
        @click="toggleVideo" 
        :class="{ active: !isVideoEnabled }"
      >
        {{ isVideoEnabled ? '关闭摄像头' : '开启摄像头' }}
      </button>
      <button @click="endCall" class="end-call">挂断</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

interface Props {
  type: 'audio' | 'video'
}

const props = defineProps<Props>()

const emit = defineEmits<{
  ended: []
}>()

const localVideo = ref<HTMLVideoElement>()
const remoteVideo = ref<HTMLVideoElement>()
const isMuted = ref(false)
const isVideoEnabled = ref(true)

// 切换静音
const toggleMute = () => {
  isMuted.value = !isMuted.value
  // 实现静音逻辑
}

// 切换视频
const toggleVideo = () => {
  isVideoEnabled.value = !isVideoEnabled.value
  // 实现视频开关逻辑
}

// 结束通话
const endCall = () => {
  emit('ended')
}

// 开始媒体流
const startMediaStream = async () => {
  try {
    // 这里应该实现实际的媒体流初始化和推拉流逻辑
    console.log('Starting media stream for', props.type, 'call')
  } catch (error) {
    console.error('Failed to start media stream:', error)
  }
}

onMounted(() => {
  startMediaStream()
})
</script>

<style scoped>
.call-stream-container {
  width: 100%;
  height: 100%;
  position: relative;
}

.call-container {
  position: relative;
  width: 100%;
  height: calc(100% - 80px);
  display: flex;
  align-items: center;
  justify-content: center;
}

.local-video {
  position: absolute;
  top: 20px;
  right: 20px;
  width: 200px;
  height: 150px;
  background: #000;
  border-radius: 8px;
  overflow: hidden;
}

.remote-video {
  width: 80%;
  height: 80%;
  background: #000;
  border-radius: 8px;
  overflow: hidden;
}

.local-video video,
.remote-video video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.call-controls {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 20px;
}

.call-controls button {
  padding: 12px 24px;
  border: none;
  border-radius: 50px;
  background: rgba(255, 255, 255, 0.2);
  color: white;
  cursor: pointer;
  transition: all 0.3s;
}

.call-controls button:hover {
  background: rgba(255, 255, 255, 0.3);
}

.call-controls button.active {
  background: #ff4757;
}

.call-controls button.end-call {
  background: #ff4757;
  color: white;
}

.call-controls button.end-call:hover {
  background: #ff3838;
}
</style>