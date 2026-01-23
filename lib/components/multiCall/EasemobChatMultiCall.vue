<template>
  <div>
    <!-- 大窗口模式 -->
    <div 
      v-if="!isMinimized"
      ref="containerRef" 
      class="easemob-chat-multi-call"
      :style="backgroundStyle"
      @click="handleClearScreen"
    >
    <!-- Header 区域 -->
    <CallHeader 
      v-if="!isClearScreen"
      :group-id="groupId"
      :group-name="groupName"
      :group-avatar="groupAvatar"
      :duration="callDuration"
      @add-participant="handleAddParticipant"
      @minimize="handleMinimize"
    />

    <!-- 视频内容区域 -->
    <div class="video-content" ref="contentRef">
      <div v-if="participants.length === 0" class="empty-state">
        暂无参与者
      </div>
      
      <!-- 左大右小固定布局 -->
      <div v-else class="left-right-layout">
        <!-- 左侧主视频 -->
        <div class="main-video-wrapper">
          <div class="participant-video video-appearing" :key="'main-' + mainParticipant?.userId">
            <video
              :ref="el => { if (el) videoRefs.push(el as HTMLVideoElement) }"
              :data-user-id="mainParticipant?.userId"
              autoplay
              playsinline
              :muted="mainParticipant?.userId === currentUserId"
            ></video>
            <!-- 邀请中的loading遮罩 -->
            <div v-if="mainParticipant?.isInviting" class="inviting-overlay">
              <div class="loading-spinner"></div>
              <span class="inviting-text">邀请中...</span>
            </div>
            <div class="participant-info">
              <span>{{ mainParticipant?.userName }}</span>
              <span v-if="mainParticipant?.isMuted" class="muted-indicator">🔇</span>
            </div>
          </div>
        </div>

        <!-- 右侧纵向列表 -->
        <div v-if="sideParticipants.length > 0" class="side-video-list">
          <div
            v-for="participant in sideParticipants"
            :key="'side-' + participant.userId"
            class="side-video-item video-appearing"
            @click.stop="switchMainVideo(participant.userId)"
          >
            <div class="participant-video">
              <video
                :ref="el => { if (el) videoRefs.push(el as HTMLVideoElement) }"
                :data-user-id="participant.userId"
                autoplay
                playsinline
                :muted="participant.userId === currentUserId"
              ></video>
              <!-- 邀请中的loading遮罩 -->
              <div v-if="participant.isInviting" class="inviting-overlay">
                <div class="loading-spinner"></div>
                <span class="inviting-text">邀请中...</span>
              </div>
              <div class="participant-info">
                <span>{{ participant.userName }}</span>
                <span v-if="participant.isMuted" class="muted-indicator">🔇</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Controls 区域 -->
    <MultiCallControls
      v-if="!isClearScreen"
      :is-muted="isMuted"
      :is-video-enabled="isVideoEnabled"
      @toggle-mute="toggleMute"
      @toggle-video="toggleVideo"
      @end-call="endCall"
    />
    

  </div>
  
  <!-- 成员列表弹窗 -->
  <EasemobChatGroupMemberList
    v-if="showMemberList"
    :group-id="groupId || callStateStore.getCallState.groupId || ''"
    :existing-user-ids="existingUserIds"
    :inviting-user-ids="invitingUserIds"
    @close="showMemberList = false"
    @invite="handleInviteMembers"
  />
  
  <!-- 小窗口模式 -->
  <EasemobChatMiniWindow 
    v-if="isMinimized" 
    @expand="handleExpand" 
    @close="endCall"
  />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useCallStateStore } from '../../store/callState'
import { useRtcChannelStore } from '../../store/rtcChannel'
import { CallService } from '../../services/CallService'
import { HANGUP_REASON } from '../../types/callstate.types'
import { logger } from '../../utils/logger'
import EasemobChatMiniWindow from '../../components/EasemobChatMiniWindow.vue'
import EasemobChatGroupMemberList from './EasemobChatGroupMemberList.vue'
import { useSignalManager } from '../../composables/useSignalManager'
import CallHeader from './CallHeader.vue'
import MultiCallControls from './MultiCallControls.vue'

interface Participant {
  userId: string
  userName: string
  avatar?: string
  isHost?: boolean
  isMuted?: boolean
  isInviting?: boolean // 是否邀请中
  hasJoined?: boolean // 是否已加入RTC频道
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
  participantTimeout: [userId: string]
  userLeft: [userId: string] // 新增：用户离开RTC事件
}>()

const callStateStore = useCallStateStore()
const rtcChannelStore = useRtcChannelStore()

// Refs
const containerRef = ref<HTMLDivElement>()
const contentRef = ref<HTMLDivElement>()
const thumbnailScrollRef = ref<HTMLDivElement>()
const videoRefs = ref<HTMLVideoElement[]>([])

// 状态
const isMuted = ref(false)
const isVideoEnabled = ref(true)
const isCallActive = ref(false)
const isClearScreen = ref(false)

// 主视频选择
const selectedVideoId = ref<string | null>(null)

// 容器尺寸
const containerSize = ref({ width: 0, height: 0 })

// 通话时长（从 store 获取格式化后的字符串）
const callDuration = computed(() => rtcChannelStore.formattedCallDuration)

// 小窗口模式状态
const isMinimized = computed(() => callStateStore.isMinimized)

// 成员列表弹窗状态
const showMemberList = ref(false)

const { sendInviteMessage } = useSignalManager()

// 邀请超时管理
const invitationTimers = ref<Map<string, number>>(new Map())
const INVITATION_TIMEOUT = 30000 // 30秒超时

// 清理指定用户的邀请定时器
const clearInvitationTimer = (userId: string) => {
  const timer = invitationTimers.value.get(userId)
  if (timer) {
    clearTimeout(timer)
    invitationTimers.value.delete(userId)
  }
}

// 清理所有邀请定时器
const clearAllInvitationTimers = () => {
  invitationTimers.value.forEach(timer => clearTimeout(timer))
  invitationTimers.value.clear()
}

// 设置邀请超时定时器
const setInvitationTimer = (userId: string) => {
  clearInvitationTimer(userId)
  
  const timer = window.setTimeout(() => {
    handleInvitationTimeout(userId)
  }, INVITATION_TIMEOUT)
  
  invitationTimers.value.set(userId, timer)
}

// 处理邀请超时
const handleInvitationTimeout = (userId: string) => {
  logger.warn('EasemobChatMultiCall: 邀请超时', userId)
  
  // 从 participants 中移除该用户
  const index = props.participants.findIndex(p => p.userId === userId)
  if (index > -1) {
    // 直接修改 props 是不允许的，需要通过 emit 通知父组件
    emit('participantTimeout', userId)
  }
  
  clearInvitationTimer(userId)
}

// 已经在通话中的用户ID列表
const existingUserIds = computed(() => props.participants.map(p => p.userId))

// 邀请中的用户ID列表
const invitingUserIds = computed(() => 
  props.participants.filter(p => p.isInviting).map(p => p.userId)
)

// 最小化窗口
const handleMinimize = () => {
  callStateStore.isMinimized = true
}

// 展开窗口
const handleExpand = () => {
  callStateStore.isMinimized = false
}

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
  // 使用默认背景图
  return {
    backgroundImage: 'url(/lib/callkit-static-assets/images/callkit_bg.png)',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat'
  }
})

// 主视频参与者（左侧大窗）
const mainParticipant = computed(() => {
  const result = !selectedVideoId.value ? props.participants[0] : (props.participants.find(p => p.userId === selectedVideoId.value) || props.participants[0])
  logger.debug('mainParticipant 计算', { 
    selectedVideoId: selectedVideoId.value,
    mainParticipant: result?.userId,
    totalParticipants: props.participants.length 
  })
  return result
})

// 右侧列表参与者
const sideParticipants = computed(() => {
  const result = props.participants.filter(p => p.userId !== mainParticipant.value?.userId)
  logger.debug('sideParticipants 计算', { 
    mainUserId: mainParticipant.value?.userId,
    sideCount: result.length,
    sideUserIds: result.map(p => p.userId),
    allParticipants: props.participants.map(p => ({
      userId: p.userId,
      isInviting: p.isInviting,
      hasJoined: p.hasJoined
    }))
  })
  return result
})

// 渲染锁，防止并发渲染
const isRendering = ref(false)
let renderTimer: ReturnType<typeof setTimeout> | null = null

// 渲染视频流到video元素
const renderVideoStreams = () => {
  if (!videoRefs.value || videoRefs.value.length === 0) {
    logger.warn('无video元素可渲染')
    return
  }
  
  // 如果正在渲染，跳过
  if (isRendering.value) {
    logger.debug('渲染中，跳过本次调用')
    return
  }
  
  isRendering.value = true
  
  logger.debug('开始渲染视频流', { 
    videoElementCount: videoRefs.value.length,
    participants: props.participants.map(p => p.userId)
  })
  
  // 去重：使用Set记录已处理的video元素
  const processedElements = new Set<HTMLVideoElement>()
  
  videoRefs.value.forEach((videoElement: HTMLVideoElement) => {
    if (!videoElement) return
    
    // 跳过已处理的元素
    if (processedElements.has(videoElement)) {
      logger.debug('video元素已处理，跳过', { 
        userId: videoElement.getAttribute('data-user-id') 
      })
      return
    }
    processedElements.add(videoElement)
    
    const userId = videoElement.getAttribute('data-user-id')
    if (!userId) {
      logger.warn('video元素缺少data-user-id属性')
      return
    }
    
    const rtcService = rtcChannelStore.rtcService
    if (!rtcService) {
      logger.warn('RtcService未初始化')
      return
    }
    
    // 渲染本地视频流
    if (userId === props.currentUserId) {
      const localStream = rtcChannelStore.localStream
      
      if (localStream) {
        // 只在流不同时才更新
        if (videoElement.srcObject !== localStream) {
          videoElement.srcObject = localStream
          videoElement.muted = true
          videoElement.play().catch(err => {
            logger.error('本地视频播放失败', err)
          })
          logger.debug('本地视频流已设置', { userId })
        }
      } else {
        logger.warn('本地视频流不存在', { userId })
      }
    } else {
      // 渲染远程视频流
      const remoteTrack = rtcService.getRemoteVideoTrack(userId)
      
      if (remoteTrack) {
        const trackId = remoteTrack.getTrackId?.()
        const currentTrackId = videoElement.dataset.playedTrackId
        
        if (currentTrackId !== trackId) {
          // 清空本地流（如果有）
          if (videoElement.srcObject) {
            videoElement.srcObject = null
          }
          
          remoteTrack.play(videoElement)
          videoElement.dataset.playedTrackId = trackId
          logger.debug('远程视频流已播放', { userId, trackId })
        }
      } else {
        logger.warn('远程视频轨道不存在', { userId })
      }
    }
  })
  
  // 渲染完成，释放锁
  setTimeout(() => {
    isRendering.value = false
  }, 100)
}

// 防抖渲染函数
const scheduleRender = (delay: number = 100) => {
  if (renderTimer) {
    clearTimeout(renderTimer)
  }
  
  renderTimer = setTimeout(() => {
    renderVideoStreams()
    renderTimer = null
  }, delay)
}

// 方法
const startCall = async () => {
  try {
    isCallActive.value = true
    emit('callStarted')
    
    // 开始计时
    rtcChannelStore.startCallTimer()
    
    console.log(`Starting ${props.type} group call in ${props.groupId || props.groupName}`)
  } catch (error) {
    console.error('Failed to start group call:', error)
  }
}

const toggleMute = async () => {
  try {
    const rtcService = rtcChannelStore.rtcService
    if (!rtcService) {
      logger.warn('RtcService未初始化，无法切换音频')
      return
    }
    
    const newState = await rtcService.toggleAudio(!isMuted.value)
    isMuted.value = !newState
    logger.info('音频状态已切换:', newState ? '开启' : '静音')
  } catch (error) {
    logger.error('切换音频失败:', error)
  }
}

const toggleVideo = async () => {
  try {
    const rtcService = rtcChannelStore.rtcService
    if (!rtcService) {
      logger.warn('RtcService未初始化，无法切换视频')
      return
    }
    
    const newState = await rtcService.toggleVideo(!isVideoEnabled.value)
    isVideoEnabled.value = newState
    logger.info('视频状态已切换:', newState ? '开启' : '关闭')
  } catch (error) {
    logger.error('切换视频失败:', error)
  }
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
    emit('callEnded')
  }
}

const handleAddParticipant = () => {
  // 优先使用 props 中的 groupId，如果为空则从 store 中获取
  const currentGroupId = props.groupId || callStateStore.getCallState.groupId
  
  if (!currentGroupId) {
    logger.error('EasemobChatMultiCall: 无法添加成员，groupId未提供', {
      propsGroupId: props.groupId,
      storeGroupId: callStateStore.getCallState.groupId
    })
    alert('请输入群组ID')
    return
  }
  
  logger.info('EasemobChatMultiCall: 打开成员列表弹窗，groupId:', currentGroupId)
  showMemberList.value = true
  emit('addParticipant')
}

// 处理邀请新成员
const handleInviteMembers = async (userIds: string[]) => {
  try {
    const callType = props.type === 'video' ? 'video' : 'audio'
    const message = `邀请你加入${callType === 'video' ? '视频' : '语音'}通话`
    
    logger.info('EasemobChatMultiCall: 开始邀请新成员', userIds)
    
    // 将新邀请的成员添加到 store 中的 invitedMembers
    const currentInvitedMembers = callStateStore.getInvitedMembers
    const updatedInvitedMembers = [...currentInvitedMembers, ...userIds]
    callStateStore.updateInvitedMembers(updatedInvitedMembers)
    
    logger.debug('已更新invitedMembers:', updatedInvitedMembers)
    
    await sendInviteMessage(
      userIds,
      'groupChat',
      message,
      props.groupId
    )
    
    // 为每个新邀请的成员设置超时定时器
    userIds.forEach(userId => {
      setInvitationTimer(userId)
    })
    
    logger.info('EasemobChatMultiCall: 邀请信令发送成功')
  } catch (error) {
    logger.error('EasemobChatMultiCall: 邀请成员失败', error)
  }
}

// 拖动状态（避免清屏误触发）
const isDragging = ref(false)
const justFinishedDrag = ref(false)

// 清屏模式切换
const handleClearScreen = () => {
  // 拖动中或拖动刚结束时不触发清屏
  if (isDragging.value || justFinishedDrag.value) return
  isClearScreen.value = !isClearScreen.value
}

// 切换主视频
const switchMainVideo = (userId: string) => {
  logger.info('切换主视频:', { from: selectedVideoId.value, to: userId })
  selectedVideoId.value = userId
  
  // 清空videoRefs，避免引用混乱
  videoRefs.value = []
  
  nextTick(() => {
    scheduleRender(150)
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

// 监听参与者列表变化，自动渲染视频流
watch(() => props.participants, () => {
  // 清空并重新收集 videoRefs
  videoRefs.value = []
  
  nextTick(() => {
    scheduleRender(300)
  })
}, { deep: true })

// 监听store中的本地视频流变化
watch(() => rtcChannelStore.localStream, (newStream) => {
  if (newStream) {
    logger.info('本地视频流变化，重新渲染')
    nextTick(() => {
      scheduleRender(200)
    })
  }
})

// 监听小窗模式状态变化，恢复大窗时重新渲染视频流
watch(isMinimized, (minimized) => {
  if (!minimized) {
    logger.info('小窗模式恢复到大窗，重新渲染视频流')
    // 清空videoRefs，避免引用旧元素
    videoRefs.value = []
    nextTick(() => {
      // 延迟渲染，确保DOM已完全恢复
      scheduleRender(300)
    })
  }
})

onMounted(() => {
  startCall()
  updateContainerSize()
  
  // 监听窗口大小变化
  window.addEventListener('resize', updateContainerSize)
  
  // 监听RTC用户事件
  const rtcService = rtcChannelStore.rtcService
  if (rtcService) {
    const client = rtcService.getClient()
    if (client) {
      // 监听远程用户发布视频
      client.on('user-published', async (user: any, mediaType: 'audio' | 'video') => {
        logger.info('远程用户发布流:', user.uid, mediaType)
        if (mediaType === 'video') {
          // 获取userId映射
          const userId = rtcChannelStore.getUserIdByUid(user.uid.toString())
          if (userId) {
            // 清除邀请定时器，用户已加入
            clearInvitationTimer(userId)
          }
          
          scheduleRender(500)
        }
      })
      
      // 监听用户离开RTC
      client.on('user-left', (user: any, reason: string) => {
        logger.info('用户离开RTC:', user.uid, reason)
        
        // 获取userId映射
        const userId = rtcChannelStore.getUserIdByUid(user.uid.toString())
        if (userId) {
          // 清除邀请定时器
          clearInvitationTimer(userId)
          // 通知父组件移除该用户
          emit('userLeft', userId)
        }
      })
    }
  }
  
  // 初始化后延迟计算容器尺寸
  nextTick(() => {
    updateContainerSize()
    // 延迟渲染视频流，确保DOM已准备好
    scheduleRender(500)
  })
})

onUnmounted(() => {
  endCall()
  window.removeEventListener('resize', updateContainerSize)
  
  // 清理所有邀请定时器
  clearAllInvitationTimers()
  
  // 清理渲染定时器
  if (renderTimer) {
    clearTimeout(renderTimer)
    renderTimer = null
  }
})
</script>

<style scoped src="./styles/EasemobChatMultiCall.css"></style>