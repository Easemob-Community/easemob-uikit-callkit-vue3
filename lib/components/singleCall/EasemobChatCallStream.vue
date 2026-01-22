<template>
  <div class="call-stream-container">
    <!-- 远程视频 - 全屏背景 -->
    <div class="remote-video-container">
      <video ref="remoteVideo" class="remote-video" autoplay></video>
      <div v-if="!hasRemoteVideo" class="remote-placeholder">
        <div class="avatar-placeholder">
          <svg class="user-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
            <path fill-rule="evenodd" clip-rule="evenodd" d="M8 8.90816C8 9.63672 8.16477 10.3145 8.4943 10.9414C8.83953 11.5683 9.30245 12.0681 9.88305 12.4409C10.4637 12.8136 11.0992 13 11.7896 13C12.4801 13 13.1156 12.8136 13.6962 12.4409C14.2768 12.0681 14.7319 11.5683 15.0615 10.9414C15.4067 10.3145 15.5793 9.63672 15.5793 8.90816V7.09184C15.5793 6.34633 15.4067 5.66012 15.0615 5.03321C14.7319 4.40631 14.2768 3.91495 13.6962 3.55913C13.1156 3.18638 12.4801 3 11.7896 3C11.0992 3 10.4637 3.18638 9.88305 3.55913C9.30245 3.91495 8.83953 4.40631 8.4943 5.03321C8.16477 5.66012 8 6.34633 8 7.09184V8.90816ZM12 14C13.4313 14 14.7194 14.1986 15.8644 14.5957C16.8286 14.9267 17.6648 15.3901 18.3729 15.9858C18.9605 16.4657 19.4124 16.987 19.7288 17.5496C19.9096 17.8972 20 18.3522 20 18.9149C20 19.4775 19.8117 19.9657 19.435 20.3794C19.0734 20.7931 18.629 21 18.1017 21H5.89831C5.371 21 4.91902 20.7931 4.54237 20.3794C4.18079 19.9657 4 19.4775 4 18.9149C4 18.3522 4.0904 17.8972 4.27119 17.5496C4.58757 16.987 5.03955 16.4657 5.62712 15.9858C6.33522 15.3901 7.17137 14.9267 8.13559 14.5957C9.2806 14.1986 10.5687 14 12 14Z" />
          </svg>
        </div>
        <p class="remote-name">{{ remoteUserName || '对方' }}</p>
        <p class="connecting-text">连接中...</p>
      </div>
    </div>

    <!-- 本地视频 - 悬浮小窗 -->
    <div v-if="props.type === 'video'" class="local-video-container">
      <video ref="localVideo" class="local-video" autoplay muted></video>
      <div v-if="!isVideoEnabled" class="local-video-disabled">
        <svg class="camera-off-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M3 3L21 21M16 16V19C16 19.5523 15.5523 20 15 20H5C4.44772 20 4 19.5523 4 19V9C4 8.44772 4.44772 8 5 8H8M21 15V9L17 13M17 13V7C17 6.44772 16.5523 6 16 6H10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
    </div>

    <!-- 通话信息栏 -->
    <div class="call-info-bar">
      <div class="call-status">
        <div class="status-dot"></div>
        <span class="call-duration">{{ callDuration }}</span>
      </div>
    </div>

    <!-- 控制按钮 -->
    <div class="call-controls">
      <button 
        class="control-btn" 
        :class="{ active: isMuted }"
        @click="toggleMute"
      >
        <svg v-if="!isMuted" class="btn-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
          <path fill-rule="evenodd" clip-rule="evenodd" d="M12 4C9.51472 4 7.5 6.01472 7.5 8.5V11.5C7.5 13.9853 9.51472 16 12 16C14.4853 16 16.5 13.9853 16.5 11.5V8.5C16.5 6.01472 14.4853 4 12 4ZM12 10.0199C12.6904 10.0199 13.25 9.46025 13.25 8.7699C13.25 8.07954 12.6904 7.5199 12 7.5199C11.3096 7.5199 10.75 8.07954 10.75 8.7699C10.75 9.46025 11.3096 10.0199 12 10.0199Z" />
          <path fill-rule="evenodd" clip-rule="evenodd" d="M19.2565 11.4532C19.2565 11.0114 18.8984 10.6532 18.4565 10.6532C18.0147 10.6532 17.6565 11.0114 17.6565 11.4532C17.6565 14.4705 15.2105 16.9166 12.1931 16.9166H11.7963C8.78476 16.9166 6.34341 14.4752 6.34341 11.4637C6.34341 11.0218 5.98524 10.6637 5.54341 10.6637C5.10158 10.6637 4.74341 11.0218 4.74341 11.4637C4.74341 15.158 7.58384 18.189 11.2 18.4917V19.4503C11.2 19.8921 11.5581 20.2503 12 20.2503C12.4418 20.2503 12.8 19.8921 12.8 19.4503V18.4909C16.4169 18.1831 19.2565 15.1498 19.2565 11.4532Z" />
        </svg>
        <svg v-else class="btn-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
          <path fill-rule="evenodd" clip-rule="evenodd" d="M3.80694 20.1909C3.51405 19.8981 3.51405 19.4232 3.80694 19.1303L19.1323 3.80906C19.4252 3.51616 19.9001 3.51616 20.1929 3.80906C20.4858 4.10195 20.4858 4.57682 20.1929 4.86972L4.8676 20.1909C4.57471 20.4838 4.09983 20.4838 3.80694 20.1909Z" />
          <path fill-rule="evenodd" clip-rule="evenodd" d="M8.48343 17.7627C9.30606 18.2658 10.2448 18.5977 11.25 18.7088V20.25C11.25 20.6642 11.5858 21 12 21C12.4142 21 12.75 20.6642 12.75 20.25V18.7088C16.125 18.3357 18.75 15.4744 18.75 12V11C18.75 10.5858 18.4142 10.25 18 10.25C17.5858 10.25 17.25 10.5858 17.25 11V12C17.25 14.8995 14.8995 17.25 12 17.25C11.1288 17.25 10.3071 17.0378 9.58393 16.6622L8.48343 17.7627ZM10.5264 15.7198C10.9824 15.9006 11.4796 16 12 16C14.2091 16 16 14.2091 16 12V10.2462L10.5264 15.7198ZM15.8484 5.90554L8.28023 13.4737C8.09939 13.0177 8 12.5204 8 12V7C8 4.79086 9.79086 3 12 3C13.8297 3 15.3724 4.22845 15.8484 5.90554ZM7.3378 14.4162L6.2373 15.5167C5.61097 14.4925 5.25 13.2884 5.25 12V11C5.25 10.5858 5.58579 10.25 6 10.25C6.41421 10.25 6.75 10.5858 6.75 11V12C6.75 12.8712 6.96223 13.6929 7.3378 14.4162Z" />
        </svg>
        <span class="btn-label">{{ isMuted ? '取消静音' : '静音' }}</span>
      </button>

      <button 
        v-if="props.type === 'video'"
        class="control-btn" 
        :class="{ active: !isVideoEnabled }"
        @click="toggleVideo"
      >
        <svg v-if="isVideoEnabled" class="btn-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
          <path fill-rule="evenodd" clip-rule="evenodd" d="M3.88889 5C2.84568 5 2 5.84568 2 6.88889V17.1111C2 18.1543 2.84568 19 3.88889 19H15.8611C16.9043 19 17.75 18.1543 17.75 17.1111V15.3089L21.0178 17.1244C21.4585 17.3692 22 17.0505 22 16.5464V7.46025C22 6.95616 21.4585 6.63753 21.0178 6.88233L17.75 8.69779V6.88889C17.75 5.84568 16.9043 5 15.8611 5H3.88889ZM5.5 10C6.32843 10 7 9.32843 7 8.5C7 7.67157 6.32843 7 5.5 7C4.67157 7 4 7.67157 4 8.5C4 9.32843 4.67157 10 5.5 10Z" />
        </svg>
        <svg v-else class="btn-icon" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
          <path fill-rule="evenodd" clip-rule="evenodd" d="M7.24619 19H14.3611C15.4043 19 16.25 18.1543 16.25 17.1111V15.3089L19.5178 17.1244C19.9585 17.3692 20.5 17.0505 20.5 16.5464V7.46025C20.5 6.95616 19.9585 6.63753 19.5178 6.88233L19.1714 7.0748L7.24619 19ZM15.9249 5.82909C15.5851 5.32872 15.0115 5 14.3611 5H5.38889C4.34568 5 3.5 5.84568 3.5 6.88889V17.1111C3.5 17.4409 3.58453 17.751 3.73312 18.0209L15.9249 5.82909Z" />
          <path fill-rule="evenodd" clip-rule="evenodd" d="M3.80694 20.1909C3.51405 19.8981 3.51405 19.4232 3.80694 19.1303L19.1323 3.80906C19.4252 3.51616 19.9001 3.51616 20.1929 3.80906C20.4858 4.10195 20.4858 4.57682 20.1929 4.86972L4.8676 20.1909C4.57471 20.4838 4.09983 20.4838 3.80694 20.1909Z" />
        </svg>
        <span class="btn-label">{{ isVideoEnabled ? '关闭摄像头' : '开启摄像头' }}</span>
      </button>

      <button class="control-btn hangup-btn" @click="endCall">
        <svg class="btn-icon" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
          <path d="M8.43445 12.6265C8.40888 12.6658 8.46336 13.037 8.45381 13.1428C8.43469 13.3543 8.44114 13.5264 8.40602 13.6715C8.24328 14.7412 7.53366 15.2879 5.71437 15.4497C4.58252 15.5543 3.85663 15.3068 3.4024 14.7319C3.08891 14.3045 2.98642 13.7342 3.01174 12.967C2.99573 12.9006 2.99239 12.4507 3.02751 12.3056C3.02369 10.4 7.03906 8.58585 11.9887 8.60976C16.8967 8.60665 20.9804 10.4191 21.0002 12.3909L20.9971 12.6688L20.994 12.9466C20.9911 13.9523 20.9178 14.5203 20.5023 14.9781C20.0867 15.4359 19.3642 15.6384 18.3857 15.5067C16.2946 15.2681 15.6485 14.6246 15.6064 13.1421C15.616 13.0363 15.6286 12.6527 15.5871 12.6257C15.5742 12.2815 14.196 11.9462 12.0345 11.9979C9.81551 11.9561 8.40554 12.2159 8.43445 12.6265Z" />
        </svg>
        <span class="btn-label">挂断</span>
      </button>
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

// 使用 store 状态确保响应式
const isMuted = computed(() => !rtcChannelStore.audioEnabled)
const isVideoEnabled = computed(() => rtcChannelStore.videoEnabled)

// 通话时长（从 store 获取格式化后的字符串）
const callDuration = computed(() => rtcChannelStore.formattedCallDuration)

// 远程用户信息
const remoteUserName = computed(() => {
  const callState = callStateStore.getCallState
  const remoteUserId = callState.calleeUserId || callState.callerUserId
  if (remoteUserId) {
    const userInfo = callStateStore.getUserInfo(remoteUserId)
    return userInfo.nickname || remoteUserId
  }
  return ''
})

// 是否有远程视频
const hasRemoteVideo = ref(false)
// 重试计数
const retryCount = ref(0)
const MAX_RETRY = 5

// 切换静音
const toggleMute = async () => {
  if (!rtcService.value) {
    logger.warn('切换静音失败: RtcService未初始化')
    return
  }
  
  try {
    // 修复：传入当前状态的反转值（即目标开启/关闭状态）
    const targetState = !rtcChannelStore.audioEnabled
    await rtcService.value.toggleAudio(targetState)
    logger.info('切换静音状态成功:', !targetState)
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
    // 修复：传入当前状态的反转值
    const targetState = !rtcChannelStore.videoEnabled
    await rtcService.value.toggleVideo(targetState)
    logger.info('切换视频状态成功:', targetState)
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
    logger.warn('播放远程视频失败：rtcService或remoteVideo元素不存在')
    return
  }
  
  // 获取RTC客户端
  const client = rtcService.value.getClient()
  if (!client || !client.remoteUsers || client.remoteUsers.length === 0) {
    logger.warn('播放远程视频失败：未找到远程用户', { userId })
    return
  }
  
  // 获取第一个远程用户（1v1情况下只有一个）
  const remoteUser = client.remoteUsers[0]
  if (!remoteUser) {
    logger.warn('播放远程视频失败：远程用户列表为空')
    return
  }
  
  // 使用uid获取远程视频轨道
  const remoteVideoTrack = rtcService.value.getRemoteVideoTrack(remoteUser.uid.toString())
  if (remoteVideoTrack) {
    try {
      remoteVideoTrack.play(remoteVideo.value)
      hasRemoteVideo.value = true
      retryCount.value = 0 // 重置重试计数
      logger.info('远程视频开始播放', { userId, uid: remoteUser.uid })
    } catch (error) {
      logger.error('播放远程视频失败', error)
    }
  } else {
    // 有限次数重试
    if (retryCount.value < MAX_RETRY) {
      retryCount.value++
      logger.warn(`播放远程视频失败：未找到远程视频轨道，重试 ${retryCount.value}/${MAX_RETRY}`, { userId, uid: remoteUser.uid })
      setTimeout(() => {
        playRemoteVideo(userId)
      }, 500)
    } else {
      logger.error(`播放远程视频失败：重试${MAX_RETRY}次后仍未找到远程视频轨道`, { userId, uid: remoteUser.uid })
    }
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
      
      // 监听远程用户取消发布
      client.on('user-unpublished', (user: IAgoraRTCRemoteUser, mediaType: 'audio' | 'video') => {
        if (mediaType === 'video') {
          hasRemoteVideo.value = false
        }
      })
    }
  }
  
  // 监听窗口展开事件，重新播放远程视频
  const handleWindowExpanded = () => {
    logger.info('收到窗口展开事件，重新播放远程视频')
    // 重置重试计数
    retryCount.value = 0
    // 延迟确保DOM已更新
    setTimeout(() => {
      if (props.type === 'video' && rtcService.value) {
        // 获取远程用户ID并重新播放
        const callStateStore = useCallStateStore()
        const remoteUserId = callStateStore.calleeUserId || callStateStore.callerUserId
        if (remoteUserId) {
          playRemoteVideo(remoteUserId)
        }
      }
    }, 200)
  }
  
  window.addEventListener('callkit:window-expanded', handleWindowExpanded)
  
  // 组件卸载时清理监听
  onUnmounted(() => {
    if (stopWatch) {
      stopWatch()
    }
    window.removeEventListener('callkit:window-expanded', handleWindowExpanded)
  })
})

// onUnmounted 时不主动离开频道，由 CallService 统一管理
// 这样避免重复离开频道的操作
onUnmounted(() => {
  // 不调用 stopCallTimer，由 CallService 统一管理
})
</script>

<style scoped>
/* ========== 主容器 ========== */
.call-stream-container {
  width: 100%;
  height: 100%;
  position: relative;
  background-image: url(/lib/callkit-static-assets/images/callkit_bg.png);
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* ========== 远程视频区域 ========== */
.remote-video-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: #1a1a2e;
  display: flex;
  align-items: center;
  justify-content: center;
}

.remote-video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.remote-placeholder {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  color: white;
  z-index: 1;
}

.avatar-placeholder {
  width: 120px;
  height: 120px;
  margin: 0 auto 24px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(10px);
  border: 3px solid rgba(255, 255, 255, 0.2);
}

.user-icon {
  width: 60px;
  height: 60px;
  color: rgba(255, 255, 255, 0.8);
}

.remote-name {
  font-size: 24px;
  font-weight: 600;
  margin: 0 0 8px;
  color: white;
}

.connecting-text {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.7);
  margin: 0;
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

/* ========== 本地视频小窗 ========== */
.local-video-container {
  position: absolute;
  top: 24px;
  right: 24px;
  width: 160px;
  height: 120px;
  background: #000;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  z-index: 10;
  border: 2px solid rgba(255, 255, 255, 0.1);
}

.local-video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.local-video-disabled {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
}

.camera-off-icon {
  width: 40px;
  height: 40px;
  color: rgba(255, 255, 255, 0.6);
}

/* ========== 通话信息栏 ========== */
.call-info-bar {
  position: absolute;
  top: 24px;
  left: 24px;
  z-index: 10;
}

.call-status {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: rgba(0, 0, 0, 0.4);
  border-radius: 20px;
  backdrop-filter: blur(10px);
}

.status-dot {
  width: 8px;
  height: 8px;
  background: #4ade80;
  border-radius: 50%;
  animation: blink 2s ease-in-out infinite;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}

.call-duration {
  font-size: 14px;
  font-weight: 600;
  color: white;
  font-variant-numeric: tabular-nums;
}

/* ========== 控制按钮区域 ========== */
.call-controls {
  position: absolute;
  bottom: 40px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 16px;
  z-index: 10;
  padding: 0 20px;
}

.control-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 16px;
  min-width: 72px;
  background: rgba(255, 255, 255, 0.15);
  border: 2px solid rgba(255, 255, 255, 0.2);
  border-radius: 16px;
  color: white;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  backdrop-filter: blur(10px);
  font-size: 12px;
  font-weight: 500;
}

.control-btn:hover {
  background: rgba(255, 255, 255, 0.25);
  border-color: rgba(255, 255, 255, 0.3);
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
}

.control-btn:active {
  transform: translateY(0);
}

.control-btn.active {
  background: rgba(239, 68, 68, 0.9);
  border-color: rgba(239, 68, 68, 1);
}

.control-btn.active:hover {
  background: rgba(220, 38, 38, 0.9);
}

.hangup-btn {
  background: rgba(239, 68, 68, 0.9);
  border-color: rgba(239, 68, 68, 1);
  min-width: 80px;
}

.hangup-btn:hover {
  background: rgba(220, 38, 38, 1);
  border-color: rgba(220, 38, 38, 1);
  transform: translateY(-2px) scale(1.05);
}

.btn-icon {
  width: 24px;
  height: 24px;
  color: currentColor;
}

.btn-label {
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
}

/* ========== 响应式适配 ========== */
@media (max-width: 768px) {
  .local-video-container {
    width: 120px;
    height: 90px;
    top: 16px;
    right: 16px;
  }

  .call-info-bar {
    top: 16px;
    left: 16px;
  }

  .call-controls {
    bottom: 24px;
    gap: 12px;
  }

  .control-btn {
    padding: 12px;
    min-width: 64px;
  }

  .btn-label {
    font-size: 11px;
  }

  .btn-icon {
    width: 20px;
    height: 20px;
  }

  .hangup-btn {
    min-width: 72px;
  }
}

@media (max-width: 480px) {
  .local-video-container {
    width: 100px;
    height: 75px;
  }

  .control-btn {
    padding: 10px;
    min-width: 56px;
  }

  .hangup-btn {
    min-width: 64px;
  }

  .btn-label {
    font-size: 10px;
  }
}
</style>