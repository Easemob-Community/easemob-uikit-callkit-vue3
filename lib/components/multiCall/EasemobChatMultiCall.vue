<template>
  <div v-if="isVisible">
    <!-- 大窗口模式 -->
    <div 
      v-if="!isMinimized"
      ref="elementRef"
      class="easemob-chat-multi-call"
      :class="{ 'is-dragging': isDragging, 'has-dragged': hasDragged }"
      :style="[style, backgroundStyle]"
      @click="handleClearScreen"
    >
    <!-- Header 区域（可拖拽） -->
    <div @mousedown="startDrag" class="header-drag-area">
      <CallHeader 
        v-if="!isClearScreen"
        :group-id="groupId"
        :group-name="groupName"
        :group-avatar="groupAvatar"
        :duration="callDuration"
        @add-participant="handleAddParticipant"
        @minimize="handleMinimize"
      />
    </div>

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
              :ref="el => setVideoRef(el as HTMLVideoElement | null, mainParticipant?.userId)"
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
              <!-- 🔑 音频状态标识 -->
              <div class="audio-indicators">
                <img 
                  v-if="!mainParticipant?.isInviting && hasAudioTrack(mainParticipant?.userId)" 
                  :src="ICONS.MIC_ON" 
                  class="audio-indicator mic-on"
                  title="已上麦"
                  alt="mic on"
                />
                <img 
                  v-else-if="!mainParticipant?.isInviting" 
                  :src="ICONS.MIC_OFF" 
                  class="audio-indicator mic-off"
                  title="未上麦"
                  alt="mic off"
                />
                <span v-if="mainParticipant?.isMuted" class="muted-indicator">🔇</span>
              </div>
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
                :ref="el => setVideoRef(el as HTMLVideoElement | null, participant.userId)"
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
                <!-- 🔑 音频状态标识 -->
                <div class="audio-indicators">
                  <img 
                    v-if="!participant.isInviting && hasAudioTrack(participant.userId)" 
                    :src="ICONS.MIC_ON" 
                    class="audio-indicator mic-on"
                    title="已上麦"
                    alt="mic on"
                  />
                  <img 
                    v-else-if="!participant.isInviting" 
                    :src="ICONS.MIC_OFF" 
                    class="audio-indicator mic-off"
                    title="未上麦"
                    alt="mic off"
                  />
                  <span v-if="participant.isMuted" class="muted-indicator">🔇</span>
                </div>
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
import { ref, computed, onMounted, onUnmounted, nextTick, watch, type CSSProperties } from 'vue'
import { useCallStateStore } from '../../store/callState'
import { useRtcChannelStore } from '../../store/rtcChannel'
import { CallService } from '../../services/CallService'
import { HANGUP_REASON, CALL_STATUS, CALL_TYPE } from '../../types/callstate.types'
import { logger } from '../../utils/logger'
import { DEFAULT_BACKGROUND_IMAGE, ICONS, getAssetUrl } from '../../config/assets'
import EasemobChatMiniWindow from '../../components/EasemobChatMiniWindow.vue'
import EasemobChatGroupMemberList from './EasemobChatGroupMemberList.vue'
import { useSignalManager } from '../../composables/useSignalManager'
import { useParticipants } from '../../composables/useParticipants'
import { useDraggable } from '../../composables/useDraggable'
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
  participants?: Participant[] // 🔑 改为可选，内部自动管理
  type: 'audio' | 'video'
  maxParticipants?: number
  backgroundImage?: string
  currentUserId?: string
  autoShow?: boolean // 🔑 新增：自动根据通话状态显示/隐藏
}

const props = withDefaults(defineProps<Props>(), {
  maxParticipants: 18,
  type: 'video',
  autoShow: true // 默认启用自动显示
})

const emit = defineEmits<{
  /** 通话开始（可选监听） */
  callStarted: []
  /** 通话结束（可选监听） */
  callEnded: []
  /** 添加参与者按钮点击（可选监听，不监听时内部自动打开成员列表） */
  addParticipant: []
  /** 邀请超时（可选监听） */
  participantTimeout: [userId: string]
  /** 
   * 用户离开RTC（可选监听）
   * @deprecated 内部已自动处理，无需监听
   */
  userLeft: [userId: string]
  /** 
   * 用户视频已播放（可选监听）
   * @deprecated 内部已自动处理，无需监听
   */
  userJoined: [userId: string]
  /** 发生错误（可选监听） */
  error: [error: Error]
}>()

const callStateStore = useCallStateStore()
const rtcChannelStore = useRtcChannelStore()

// 🔑 关键优化：内部自动管理 participants
const { participants: internalParticipants } = useParticipants(props.currentUserId)

// 最终使用的 participants（优先使用外部传入的，否则使用内部管理的）
const participants = computed(() => props.participants ?? internalParticipants.value)

// 🔑 关键优化：自动显示/隐藏控制
const isVisible = computed(() => {
  if (!props.autoShow) return true // 不启用自动显示时，始终可见
  
  // 只在群组通话中显示
  const status = callStateStore.getCallStatus
  const callType = callStateStore.getCallState.type
  
  // 检查是否为群组通话类型
  const isGroupCall = callType === CALL_TYPE.VIDEO_MULTI || callType === CALL_TYPE.AUDIO_MULTI
  const isInCall = status === CALL_STATUS.IN_CALL || status === CALL_STATUS.INVITING
  
  // 只有是群组通话且通话状态为 IN_CALL 或 INVITING 时才显示
  return isGroupCall && isInCall
})

// Refs
const contentRef = ref<HTMLDivElement>()
const thumbnailScrollRef = ref<HTMLDivElement>()
const videoRefs = ref<Map<string, HTMLVideoElement>>(new Map())

const setVideoRef = (el: HTMLVideoElement | null, userId: string | undefined) => {
  if (!userId) return
  if (el) {
    videoRefs.value.set(userId, el)
  } else {
    videoRefs.value.delete(userId)
  }
}

// 窗口尺寸常量
const CONTAINER_WIDTH = 800
const CONTAINER_HEIGHT = 600

// ========== 使用拖拽 Composable ==========
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

// 状态
const isMuted = ref(false)
const isVideoEnabled = ref(rtcChannelStore.videoEnabled)
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

// 远程用户检查轮询
const remoteUserCheckInterval = ref<number | null>(null)
const REMOTE_USER_CHECK_INTERVAL = 1000 // 每秒检查一次
const REMOTE_USER_CHECK_MAX_ATTEMPTS = 30 // 最多检查30次（30秒）
let remoteUserCheckAttempts = 0

// 开始轮询检查远程用户
const startRemoteUserCheck = () => {
  // 清除之前的轮询
  if (remoteUserCheckInterval.value) {
    clearInterval(remoteUserCheckInterval.value)
    remoteUserCheckInterval.value = null
  }
  
  remoteUserCheckAttempts = 0
  
  remoteUserCheckInterval.value = window.setInterval(async () => {
    remoteUserCheckAttempts++
    
    const rtcService = rtcChannelStore.rtcService
    if (!rtcService) return
    
    const client = rtcService.getClient()
    if (!client) return
    
    const remoteUsers = client.remoteUsers
    if (remoteUsers && remoteUsers.length > 0) {
      logger.info(`【轮询检查】发现${remoteUsers.length}个远程用户，尝试订阅`, {
        attempt: remoteUserCheckAttempts,
        users: remoteUsers.map((u: any) => ({ uid: u.uid, hasVideo: u.hasVideo, hasTrack: !!u.videoTrack }))
      })
      
      // 尝试订阅所有未订阅的远程用户
      let hasNewSubscription = false
      for (const user of remoteUsers) {
        if (user.hasVideo && !user.videoTrack) {
          try {
            await rtcService.subscribeRemoteUser(user, 'video')
            hasNewSubscription = true
            logger.info('【轮询检查】订阅视频成功:', user.uid)
            
            // 🔑 关键修复：通知父组件该用户已加入
            let userId = rtcChannelStore.getUserIdByUid(user.uid.toString())
            
            // 如果没有映射，尝试从 callerUserId 推断
            if (!userId) {
              const callStateStore = useCallStateStore()
              const state = callStateStore.getCallState
              if (state.callerUserId && state.callerUserId !== props.currentUserId) {
                userId = state.callerUserId
                rtcChannelStore.setUidToUserIdMapping(user.uid.toString(), userId)
              }
            }
            
            if (userId && !rtcChannelStore.isUserInRtc(userId)) {
              logger.info('【轮询检查】标记用户已加入:', userId)
              emit('userJoined', userId)
            }
          } catch (error) {
            logger.error('【轮询检查】订阅视频失败:', error)
          }
        }
        if (user.hasAudio && !user.audioTrack) {
          try {
            await rtcService.subscribeRemoteUser(user, 'audio')
            hasNewSubscription = true
          } catch (error) {
            logger.error('【轮询检查】订阅音频失败:', error)
          }
        }
      }
      
      // 如果有新订阅，触发重新渲染
      if (hasNewSubscription) {
        scheduleRender(300)
      }
    }
    
    // 检查是否达到最大尝试次数
    if (remoteUserCheckAttempts >= REMOTE_USER_CHECK_MAX_ATTEMPTS) {
      logger.info('【轮询检查】达到最大尝试次数，停止轮询')
      if (remoteUserCheckInterval.value) {
        clearInterval(remoteUserCheckInterval.value)
        remoteUserCheckInterval.value = null
      }
    }
  }, REMOTE_USER_CHECK_INTERVAL)
}

// 停止轮询检查
const stopRemoteUserCheck = () => {
  if (remoteUserCheckInterval.value) {
    clearInterval(remoteUserCheckInterval.value)
    remoteUserCheckInterval.value = null
    logger.info('【轮询检查】已停止')
  }
}

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
  const index = participants.value.findIndex(p => p.userId === userId)
  if (index > -1) {
    // 直接修改 props 是不允许的，需要通过 emit 通知父组件
    emit('participantTimeout', userId)
  }
  
  clearInvitationTimer(userId)
}

// 已经在通话中的用户ID列表
const existingUserIds = computed(() => participants.value.map(p => p.userId))

// 邀请中的用户ID列表
const invitingUserIds = computed(() => 
  participants.value.filter(p => p.isInviting).map(p => p.userId)
)

// 🔑 关键修复：检查用户是否有音频轨道（用于显示上麦状态）
const hasAudioTrack = (userId: string | undefined): boolean => {
  if (!userId) return false
  
  const rtcService = rtcChannelStore.rtcService
  if (!rtcService) return false
  
  // 获取当前用户 ID（主叫方就是当前用户）
  const currentUserId = callStateStore.getCallState.callerUserId
  
  // 本地用户检查本地音频轨道
  if (userId === currentUserId) {
    return rtcService.isAudioEnabled
  }
  
  // 远程用户检查远程音频轨道
  const remoteAudioTrack = rtcService.getRemoteAudioTrack(userId)
  return !!remoteAudioTrack
}

// 最小化窗口
const handleMinimize = () => {
  callStateStore.isMinimized = true
}

// 展开窗口
const handleExpand = () => {
  callStateStore.isMinimized = false
}

// 计算属性
const backgroundStyle = computed<CSSProperties>(() => {
  const bgUrl = getAssetUrl(props.backgroundImage, DEFAULT_BACKGROUND_IMAGE)
  if (props.backgroundImage) {
    // 用户自定义背景图
    return {
      backgroundImage: `url(${bgUrl})`,
      backgroundSize: '100% 100%',
      backgroundPosition: '0px 0px',
      backgroundRepeat: 'no-repeat'
    }
  }
  // 使用默认背景图
  return {
    backgroundImage: `url(${bgUrl})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat'
  }
})

// 主视频参与者（左侧大窗）
const mainParticipant = computed(() => {
  const result = !selectedVideoId.value ? participants.value[0] : (participants.value.find(p => p.userId === selectedVideoId.value) || participants.value[0])
  logger.debug('mainParticipant 计算', { 
    selectedVideoId: selectedVideoId.value,
    mainParticipant: result?.userId,
    totalParticipants: participants.value.length 
  })
  return result
})

// 右侧列表参与者
const sideParticipants = computed(() => {
  const result = participants.value.filter(p => p.userId !== mainParticipant.value?.userId)
  logger.debug('sideParticipants 计算', { 
    mainUserId: mainParticipant.value?.userId,
    sideCount: result.length,
    sideUserIds: result.map(p => p.userId),
    allParticipants: participants.value.map(p => ({
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
  if (!videoRefs.value || videoRefs.value.size === 0) {
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
    videoElementCount: videoRefs.value.size,
    participants: participants.value.map(p => p.userId)
  })

  videoRefs.value.forEach((videoElement, userId) => {
    if (!videoElement) return
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
          logger.info('✅ 远程视频流已播放', { userId, trackId })
          
          // **关键修复**：通知父组件该用户视频已播放，更新 isInviting 状态
          const participant = participants.value.find(p => p.userId === userId)
          if (participant?.isInviting) {
            logger.info('通知父组件用户视频已播放，更新状态:', userId)
            emit('userJoined', userId)
          }
        } else {
          logger.debug('远程视频轨道已播放过，跳过', { userId, trackId })
        }
      } else {
        // 添加更详细的调试信息
        const client = rtcService.getClient()
        logger.warn('❌ 远程视频轨道不存在', {
          userId,
          remoteUsersCount: client?.remoteUsers?.length || 0,
          remoteUsers: client?.remoteUsers?.map((u: any) => ({
            uid: u.uid,
            hasVideo: u.hasVideo,
            hasTrack: !!u.videoTrack
          })),
          uidToUserIdMap: Array.from(rtcChannelStore.uidToUserIdMap.entries())
        })
        // 清除旧的画面和 trackId，以便重新发布时能重新播放
        if (videoElement.srcObject) {
          videoElement.srcObject = null
        }
        if (videoElement.dataset.playedTrackId) {
          videoElement.dataset.playedTrackId = ''
        }
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
    
    // 延迟检查已存在的远程用户（给 joinChannel 完成和 remoteUsers 更新留出时间）
    setTimeout(async () => {
      const rtcService = rtcChannelStore.rtcService
      if (rtcService) {
        const client = rtcService.getClient()
        if (client && client.remoteUsers && client.remoteUsers.length > 0) {
          logger.info('【startCall延迟检查】检测到已存在的远程用户:', 
            client.remoteUsers.map((u: any) => ({ uid: u.uid, hasVideo: u.hasVideo, hasTrack: !!u.videoTrack })))
          
          for (const user of client.remoteUsers) {
            if (user.hasVideo && !user.videoTrack) {
              logger.info('【startCall延迟检查】订阅用户视频:', user.uid)
              try {
                await rtcService.subscribeRemoteUser(user, 'video')
              } catch (error) {
                logger.error('【startCall延迟检查】订阅视频失败:', error)
              }
            }
            if (user.hasAudio && !user.audioTrack) {
              try {
                await rtcService.subscribeRemoteUser(user, 'audio')
              } catch (error) {
                logger.error('【startCall延迟检查】订阅音频失败:', error)
              }
            }
          }
          
          // 订阅完成后重新渲染
          scheduleRender(500)
        } else {
          logger.info('【startCall延迟检查】暂无远程用户')
        }
      }
    }, 2000) // 2秒后检查，确保 joinChannel 已完成
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
    
    // 根据当前通话状态选择挂断原因
    const currentStatus = callStateStore.getCallStatus
    const callState = callStateStore.getCallState
    
    // 🔑 关键修复：群组通话主叫方状态是 IN_CALL，但可能还没有人加入
    // 需要判断是否有人真正加入了 RTC 通话
    const isGroupCall = callState.type === CALL_TYPE.VIDEO_MULTI || callState.type === CALL_TYPE.AUDIO_MULTI
    const currentUserId = callState.callerUserId
    // 使用 rtcChannelStore.joinedRtcUsers 获取真正加入 RTC 的成员
    const joinedRtcUsers = Array.from(rtcChannelStore.joinedRtcUsers)
    const otherJoinedMembers = joinedRtcUsers.filter((id: string) => id !== currentUserId)
    
    // 对于群组通话：
    // - 如果状态是 INVITING，或者状态是 IN_CALL 但还没有其他成员加入，使用 CANCEL
    // - 如果已经有其他成员加入，使用 HANGUP
    let isInviting = currentStatus === CALL_STATUS.INVITING
    if (isGroupCall && currentStatus === CALL_STATUS.IN_CALL && otherJoinedMembers.length === 0) {
      isInviting = true
      logger.info('EasemobChatMultiCall: 群组通话主叫方，状态 IN_CALL 但无其他成员加入，视为邀请中')
    }
    
    // 邀请中状态使用 CANCEL 原因（发送取消邀请信令）
    // 通话中状态使用 HANGUP 原因（发送离开通话信令）
    const hangupReason = isInviting ? HANGUP_REASON.CANCEL : HANGUP_REASON.HANGUP
    
    logger.info(`EasemobChatMultiCall: 当前状态: ${currentStatus}，已加入RTC成员: ${joinedRtcUsers.length}，其他成员: ${otherJoinedMembers.length}，使用挂断原因: ${hangupReason}`)
    
    // 调用 CallService 发送信令并清理资源
    const callService = new CallService()
    await callService.hangup(hangupReason)
    
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
    
    // 🔑 关键修复：将新邀请的用户标记为待加入RTC，确保他们加入后能正确建立 uid->userId 映射
    userIds.forEach(userId => {
      rtcChannelStore.addPendingUserId(userId)
    })
    
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
const isUserDragging = ref(false)
const justFinishedDrag = ref(false)

// 清屏模式切换
const handleClearScreen = () => {
  // 拖动中或拖动刚结束时不触发清屏
  if (isUserDragging.value || justFinishedDrag.value) return
  isClearScreen.value = !isClearScreen.value
}

// 切换主视频
const switchMainVideo = (userId: string) => {
  logger.info('切换主视频:', { from: selectedVideoId.value, to: userId })
  selectedVideoId.value = userId
  
  // 清空videoRefs，避免引用混乱
  videoRefs.value = new Map()
  
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
watch(() => participants.value, (newParticipants) => {
  // 🔑 关键修复：如果当前选中的主视频用户已不在参与者列表中，切换回本地视频
  if (selectedVideoId.value) {
    const stillExists = newParticipants.some(p => p.userId === selectedVideoId.value)
    if (!stillExists) {
      logger.info('选中的主视频用户已不在参与者列表中，自动切换回本地视频:', selectedVideoId.value)
      selectedVideoId.value = null
    }
  }
  
  // 清空并重新收集 videoRefs
  videoRefs.value = new Map()
  
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
    videoRefs.value = new Map()
    nextTick(() => {
      // 延迟渲染，确保DOM已完全恢复
      scheduleRender(300)
    })
  }
})

// 监听已加入RTC的用户列表变化，当有新用户加入时重新渲染
watch(() => rtcChannelStore.joinedRtcUsers, (newJoinedUsers) => {
  logger.info('已加入RTC用户列表变化:', Array.from(newJoinedUsers))
  nextTick(() => {
    scheduleRender(300)
  })
}, { deep: true })

onMounted(async () => {
  startCall()
  updateContainerSize()
  
  // 监听窗口大小变化
  window.addEventListener('resize', updateContainerSize)
  
  // 监听RTC用户事件
  const rtcService = rtcChannelStore.rtcService
  if (rtcService) {
    const client = rtcService.getClient()
    if (client) {
      // 🔑 关键修复：监听远程用户发布流（audio 或 video 任一发布就结束 loading）
      client.on('user-published', async (user: any, mediaType: 'audio' | 'video') => {
        logger.info('远程用户发布流:', user.uid, mediaType)
        
        // 获取userId映射（优先使用已存储的映射）
        let userId = rtcChannelStore.getUserIdByUid(user.uid.toString())
        
        // 如果没有映射，尝试从 callerUserId 推断（主叫方）
        if (!userId) {
          const callStateStore = useCallStateStore()
          const state = callStateStore.getCallState
          // 如果是群组通话且 callerUserId 存在，假设远程用户就是主叫方
          if (state.callerUserId && state.callerUserId !== props.currentUserId) {
            userId = state.callerUserId
            // 建立映射以便后续使用
            rtcChannelStore.setUidToUserIdMapping(user.uid.toString(), userId)
            logger.info('通过 callerUserId 推断 userId 映射:', { uid: user.uid, userId })
          }
        }
        
        if (userId) {
          // 清除邀请定时器，用户已加入
          clearInvitationTimer(userId)
          
          // 🔑 关键修复：audio 或 video 任一发布就标记用户已加入RTC
          if (!rtcChannelStore.isUserInRtc(userId)) {
            logger.info('远程用户发布流，标记为已加入:', { userId, mediaType })
            rtcChannelStore.markUserJoinedRtc(userId)
            emit('userJoined', userId)
          }
        }
        
        scheduleRender(500)
      })
      
      // 🔑 关键修复：监听远程用户取消发布流（视频结束时销毁窗口）
      client.on('user-unpublished', (user: any, mediaType: 'audio' | 'video') => {
        logger.info('远程用户取消发布流:', user.uid, mediaType)
        
        // 获取userId映射
        let userId = rtcChannelStore.getUserIdByUid(user.uid.toString())
        
        // 如果没有映射，尝试从 callerUserId 推断
        if (!userId) {
          const callStateStore = useCallStateStore()
          const state = callStateStore.getCallState
          if (state.callerUserId && state.callerUserId !== props.currentUserId) {
            userId = state.callerUserId
          }
        }
        
        // 当视频流结束时，只清除视频画面，不视为离开通话
        if (mediaType === 'video' && userId) {
          logger.info('远程用户视频流结束，清除视频画面:', { uid: user.uid, userId })

          // 清除该用户 video 元素的播放状态，以便重新发布时能重新播放
          const videoEl = videoRefs.value.get(userId)
          if (videoEl) {
            videoEl.srcObject = null
            videoEl.dataset.playedTrackId = ''
          }

          // 如果当前主视频是该用户，自动切换回本地视频
          if (selectedVideoId.value === userId) {
            logger.info('当前主视频用户视频结束，自动切换回本地视频:', userId)
            selectedVideoId.value = null
          }

          scheduleRender(200)
        }
      })
      
      // 监听用户离开RTC
      client.on('user-left', (user: any, reason: string) => {
        logger.info('用户离开RTC:', user.uid, reason)
        
        // 获取userId映射
        let userId = rtcChannelStore.getUserIdByUid(user.uid.toString())
        
        // 如果没有映射，尝试从 callerUserId 推断
        if (!userId) {
          const callStateStore = useCallStateStore()
          const state = callStateStore.getCallState
          if (state.callerUserId && state.callerUserId !== props.currentUserId) {
            userId = state.callerUserId
          }
        }
        
        if (userId) {
          // 清除邀请定时器
          clearInvitationTimer(userId)
          
          // 如果当前主视频是该用户，自动切换回本地视频
          if (selectedVideoId.value === userId) {
            logger.info('当前主视频用户离开，自动切换回本地视频:', userId)
            selectedVideoId.value = null
          }
          
          // 通知父组件移除该用户
          emit('userLeft', userId)
        }
      })
      
      // **关键修复**：检查已存在的远程用户（可能在我们监听之前就已加入）
      const remoteUsers = client.remoteUsers
      logger.info('【onMounted】检查已存在远程用户:', { 
        count: remoteUsers?.length || 0,
        users: remoteUsers?.map((u: any) => ({ 
          uid: u.uid, 
          hasVideo: u.hasVideo, 
          hasTrack: !!u.videoTrack,
          videoTrackReady: u.videoTrack?.getMediaStreamTrack?.() ? 'yes' : 'no'
        }))
      })
      
      if (remoteUsers && remoteUsers.length > 0) {
        for (const user of remoteUsers) {
          logger.info('【onMounted】处理远程用户:', { uid: user.uid, hasVideo: user.hasVideo, hasTrack: !!user.videoTrack })
          
          // 如果用户已发布视频但未订阅，进行订阅
          if (user.hasVideo && !user.videoTrack) {
            logger.info('【onMounted】订阅用户视频:', user.uid)
            try {
              await rtcService.subscribeRemoteUser(user, 'video')
              logger.info('【onMounted】视频订阅成功:', user.uid)
            } catch (error) {
              logger.error('【onMounted】视频订阅失败:', error)
            }
          } else if (user.videoTrack) {
            logger.info('【onMounted】用户已有视频轨道:', user.uid)
          }
          
          if (user.hasAudio && !user.audioTrack) {
            try {
              await rtcService.subscribeRemoteUser(user, 'audio')
            } catch (error) {
              logger.error('【onMounted】音频订阅失败:', error)
            }
          }
        }
      } else {
        logger.info('【onMounted】暂无远程用户，将在 startCall 中延迟检查')
      }
    }
  }
  
  // 初始化后延迟计算容器尺寸
  nextTick(() => {
    updateContainerSize()
    // 延迟渲染视频流，确保DOM已准备好
    scheduleRender(500)
  })
  
  // 启动轮询检查远程用户（关键修复）
  startRemoteUserCheck()
})

onUnmounted(() => {
  // 🔑 关键修复：确保始终清理RTC资源，即使通话状态为IDLE
  const rtcService = rtcChannelStore.rtcService
  if (rtcService) {
    logger.info('EasemobChatMultiCall: 组件销毁，清理RTC资源')
    // 停止本地音视频轨道
    try {
      rtcService.leaveChannel()
    } catch (error) {
      logger.warn('EasemobChatMultiCall: 离开频道时出错:', error)
    }
  }
  
  // 尝试发送挂断信令（如果通话仍在进行）
  endCall()
  
  window.removeEventListener('resize', updateContainerSize)
  
  // 清理所有邀请定时器
  clearAllInvitationTimers()
  
  // 清理渲染定时器
  if (renderTimer) {
    clearTimeout(renderTimer)
    renderTimer = null
  }
  
  // 停止远程用户检查轮询
  stopRemoteUserCheck()
})
</script>

<style scoped src="./styles/EasemobChatMultiCall.css"></style>