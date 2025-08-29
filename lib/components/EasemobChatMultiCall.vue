<template>
  <div class="easemob-chat-multi-call">
    <div class="call-header">
      <h3>群组通话 - {{ groupId }}</h3>
      <span class="participant-count">{{ participants.length }} 人</span>
    </div>
    
    <div class="video-grid">
      <div 
        v-for="participant in participants" 
        :key="participant.userId"
        class="participant-video"
      >
        <video 
          ref="videoRefs"
          :data-user-id="participant.userId"
          autoplay
          muted
        ></video>
        <div class="participant-info">
          <span>{{ participant.userName }}</span>
          <span v-if="isMuted" class="muted-indicator">🔇</span>
        </div>
      </div>
    </div>
    
    <div class="call-controls">
      <button @click="toggleMute" :class="{ active: isMuted }">
        {{ isMuted ? '取消静音' : '静音' }}
      </button>
      <button @click="toggleVideo" :class="{ active: !isVideoEnabled }">
        {{ isVideoEnabled ? '关闭摄像头' : '开启摄像头' }}
      </button>
      <button @click="toggleScreenShare" :class="{ active: isScreenSharing }">
        {{ isScreenSharing ? '停止共享' : '共享屏幕' }}
      </button>
      <button @click="endCall" class="end-call">挂断</button>
    </div>
    
    <div class="participant-list">
      <h4>参与者</h4>
      <ul>
        <li v-for="participant in participants" :key="participant.userId">
          {{ participant.userName }}
          <span :class="{ 'status-online': true }">●</span>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

interface Participant {
  userId: string
  userName: string
  avatar?: string
  isHost?: boolean
}

interface Props {
  groupId: string
  participants: Participant[]
  type: 'audio' | 'video'
  maxParticipants?: number
}

const props = withDefaults(defineProps<Props>(), {
  maxParticipants: 9
})

const emit = defineEmits<{
  callStarted: []
  callEnded: []
}>()

const videoRefs = ref<HTMLVideoElement[]>([])
const isMuted = ref(false)
const isVideoEnabled = ref(true)
const isScreenSharing = ref(false)
const isCallActive = ref(false)

const startCall = async () => {
  try {
    isCallActive.value = true
    emit('callStarted')
    
    // 这里应该集成实际的群组通话SDK
    console.log(`Starting ${props.type} group call in ${props.groupId}`)
  } catch (error) {
    console.error('Failed to start group call:', error)
  }
}

const toggleMute = () => {
  isMuted.value = !isMuted.value
  // 实现静音逻辑
}

const toggleVideo = () => {
  isVideoEnabled.value = !isVideoEnabled.value
  // 实现视频开关逻辑
}

const toggleScreenShare = () => {
  isScreenSharing.value = !isScreenSharing.value
  // 实现屏幕共享逻辑
}

const endCall = () => {
  isCallActive.value = false
  emit('callEnded')
}

onMounted(() => {
  startCall()
})

onUnmounted(() => {
  endCall()
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

.call-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  color: white;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.call-header h3 {
  margin: 0;
  font-size: 18px;
}

.participant-count {
  background: rgba(255, 255, 255, 0.2);
  padding: 5px 10px;
  border-radius: 15px;
  font-size: 14px;
}

.video-grid {
  flex: 1;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 10px;
  padding: 20px;
  overflow-y: auto;
}

.participant-video {
  position: relative;
  background: #000;
  border-radius: 8px;
  overflow: hidden;
  aspect-ratio: 16/9;
}

.participant-video video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.participant-info {
  position: absolute;
  bottom: 10px;
  left: 10px;
  color: white;
  background: rgba(0, 0, 0, 0.5);
  padding: 5px 10px;
  border-radius: 15px;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 5px;
}

.muted-indicator {
  font-size: 12px;
}

.call-controls {
  display: flex;
  justify-content: center;
  gap: 20px;
  padding: 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
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

.participant-list {
  position: absolute;
  top: 80px;
  right: 20px;
  width: 200px;
  background: rgba(0, 0, 0, 0.5);
  border-radius: 8px;
  padding: 15px;
  color: white;
}

.participant-list h4 {
  margin: 0 0 10px 0;
  font-size: 16px;
}

.participant-list ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.participant-list li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 5px 0;
  font-size: 14px;
}

.status-online {
  color: #00ff00;
  font-size: 12px;
}

@media (max-width: 768px) {
  .video-grid {
    grid-template-columns: 1fr;
  }
  
  .participant-list {
    position: static;
    width: 100%;
    margin-top: 20px;
  }
}
</style>