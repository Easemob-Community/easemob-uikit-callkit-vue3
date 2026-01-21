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
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
import type { IAgoraRTCRemoteUser } from 'agora-rtc-sdk-ng'
import { useCallStateStore } from '../../store/callState'
import { useRtcChannelStore } from '../../store/rtcChannel'
import { useEndCall } from '../../composables/useEndCall'
import { logger } from '../../utils/logger'

interface Props {
  type: 'audio' | 'video'
}

const props = defineProps<Props>()

const emit = defineEmits<{
  ended: []
}>()

// 从 store 获取 RtcService 实例
const callStateStore = useCallStateStore()
const rtcChannelStore = useRtcChannelStore()
const rtcService = computed(() => rtcChannelStore.rtcService)

const localVideo = ref<HTMLVideoElement>()
const remoteVideo = ref<HTMLVideoElement>()
const isMuted = ref(false)
const isVideoEnabled = ref(true)
// 切换静音
const toggleMute = async () => {
  if (!rtcService.value) {
    logger.warn('切换静音失败: RtcService未初始化')
    return
  }
  
  try {
    const newState = await rtcService.value.toggleAudio(!isMuted.value)
    isMuted.value = !newState
    logger.info('切换静音状态:', isMuted.value)
  } catch (error) {
    logger.error('切换静音失败:', error)
  }
}

// 切换视频
const toggleVideo = async () => {
  if (!rtcService.value) {
    logger.warn('切换视频失败: RtcService未初始化')
    return
  }
  
  try {
    const newState = await rtcService.value.toggleVideo(!isVideoEnabled.value)
    isVideoEnabled.value = newState
    logger.info('切换视频状态:', isVideoEnabled.value)
  } catch (error) {
    logger.error('切换视频失败:', error)
  }
}

// 结束通话
const endCall = async () => {
  try {
    logger.info('用户点击挂断按钮，开始挂断流程')
    
    // 调用 CallService 发送挂断信令并清理资源
    const { hangupCall } = useEndCall()
    await hangupCall()
    
    logger.info('挂断流程完成')
  } catch (error) {
    logger.error('挂断失败:', error)
  } finally {
    // 发送 ended 事件通知父组件
    emit('ended')
  }
}

// 设置远程视频播放
const playRemoteVideo = (userId: string) => {
  if (!rtcService.value || !remoteVideo.value) {
    return
  }
  
  const remoteVideoTrack = rtcService.value.getRemoteVideoTrack(userId)
  if (remoteVideoTrack) {
    remoteVideoTrack.play(remoteVideo.value)
    logger.info('远程视频开始播放', { userId })
  }
}

// 播放本地视频
const playLocalVideo = () => {
  if (!rtcService.value || !localVideo.value) {
    return
  }
  
  // 如果不是视频通话,不需要播放本地视频
  if (props.type !== 'video') {
    return
  }
  
  // 获取本地视频轨道
  const client = rtcService.value.getClient()
  if (!client) {
    return
  }
  
  // 从 RtcService 获取本地视频流
  const localStream = rtcService.value.getLocalVideoStream()
  if (localStream) {
    const videoTrack = localStream.getVideoTracks()[0]
    if (videoTrack && videoTrack.readyState === 'live') {
      localVideo.value.srcObject = localStream
      logger.info('本地视频开始播放')
    }
  }
}

onMounted(() => {
  // 不在这里加入频道，因为 useListenerManager 已经处理了加入频道的逻辑
  // 这里只需要设置本地视频播放和监听远程用户事件
  logger.info('EasemobChatCallStream mounted, 等待RTC连接就绪')
  
  // 如果RTC已经连接，立即播放本地视频
  if (rtcChannelStore.isConnected) {
    playLocalVideo()
  }
  
  // 监听RTC连接状态变化
  const stopWatch = rtcChannelStore.$subscribe((mutation, state) => {
    if (state.isConnected && !localVideo.value?.srcObject) {
      playLocalVideo()
    }
  })
  
  // 监听 localStream 的变化，当视频轨道重新创建时自动更新播放
  watch(
    () => rtcChannelStore.localStream,
    (newStream) => {
      if (newStream && localVideo.value && props.type === 'video') {
        const videoTrack = newStream.getVideoTracks()[0]
        if (videoTrack && videoTrack.readyState === 'live') {
          // 检查是否是新的流，避免重复设置
          const currentStream = localVideo.value.srcObject as MediaStream | null
          if (!currentStream || currentStream.id !== newStream.id) {
            localVideo.value.srcObject = newStream
            logger.info('本地视频流更新，重新播放', { streamId: newStream.id })
          }
        }
      } else if (!newStream && localVideo.value) {
        // 视频流被清空，清除播放
        localVideo.value.srcObject = null
        logger.info('本地视频流已清空')
      }
    },
    { immediate: false } // 不立即执行，等待组件挂载后
  )
  
  // 监听RTC事件 - 监听远程用户发布媒体
  if (rtcService.value) {
    const client = rtcService.value.getClient()
    if (client) {
      // RtcService 已经自动订阅了远程用户，这里只需要播放视频
      client.on('user-published', async (user: IAgoraRTCRemoteUser, mediaType: 'audio' | 'video') => {
        logger.info('组件收到远程用户发布媒体:', { uid: user.uid, mediaType })
        
        // 如果是视频，等待订阅完成后播放远程视频
        if (mediaType === 'video') {
          // 延迟一小段时间确保订阅完成
          setTimeout(() => {
            playRemoteVideo(user.uid.toString())
          }, 100)
        }
      })
    }
  }
  
  // 组件卸载时清理监听
  onUnmounted(() => {
    if (stopWatch) {
      stopWatch()
    }
  })
})

// onUnmounted 时不主动离开频道，由 CallService 统一管理
// 这样避免重复离开频道的操作
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