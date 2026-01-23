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
    <div v-if="!isClearScreen" class="call-header">
      <div class="header-content">
        <img v-if="groupAvatar" :src="groupAvatar" class="group-avatar" />
        <div class="header-info">
          <h3>{{ groupName || groupId }}</h3>
          <span class="call-duration">{{ callDuration }}</span>
        </div>
      </div>
      <div class="header-actions">
        <button @click.stop="handleAddParticipant" class="icon-btn">
          <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
            <path fill-rule="evenodd" clip-rule="evenodd" d="M18.22 10.22C18.22 10.6508 18.5692 11 19 11C19.4308 11 19.78 10.6508 19.78 10.22L19.78 8.78003L21.22 8.78002C21.6508 8.78002 22 8.43079 22 7.99999C22 7.5692 21.6508 7.21997 21.22 7.21997L19.78 7.21998L19.78 5.78002C19.78 5.34923 19.4308 5 19 5C18.5692 5 18.22 5.34923 18.22 5.78002L18.22 7.21999L16.78 7.22C16.3492 7.22 16 7.56922 16 8.00002C16 8.43081 16.3492 8.78004 16.78 8.78004L18.22 8.78003L18.22 10.22Z" />
            <path fill-rule="evenodd" clip-rule="evenodd" d="M12.4818 12.5687C12.5541 12.5288 12.6256 12.4862 12.6962 12.4409C13.2768 12.0681 13.7319 11.5683 14.0615 10.9414C14.4067 10.3145 14.5793 9.63672 14.5793 8.90816V7.09184C14.5793 6.34633 14.4067 5.66012 14.0615 5.03321C13.7319 4.40631 13.2768 3.91495 12.6962 3.55913C12.1156 3.18638 11.4801 3 10.7896 3C10.0992 3 9.46366 3.18638 8.88305 3.55913C8.30245 3.91495 7.83953 4.40631 7.4943 5.03321C7.16477 5.66012 7 6.34633 7 7.09184V8.90816C7 9.63672 7.16477 10.3145 7.4943 10.9414C7.83953 11.5683 8.30245 12.0681 8.88305 12.4409C8.97661 12.5009 9.0716 12.5562 9.16802 12.6065C9.66991 12.8688 10.2105 13 10.7896 13C10.8603 13 10.9305 12.998 11 12.9941C11.527 12.9645 12.0209 12.8227 12.4818 12.5687ZM12.744 14.1072C12.1884 14.0357 11.6071 14 11 14C10.9295 14 10.8594 14.0005 10.7896 14.0014C10.1446 14.0103 9.52913 14.0604 8.94335 14.1516C8.30561 14.2509 7.70303 14.3989 7.13559 14.5957C6.17137 14.9267 5.33522 15.3901 4.62712 15.9858C4.03955 16.4657 3.58757 16.987 3.27119 17.5496C3.0904 17.8972 3 18.3522 3 18.9149C3 19.4775 3.18079 19.9657 3.54237 20.3794C3.91902 20.7931 4.371 21 4.89831 21H17.1017C17.629 21 18.0734 20.7931 18.435 20.3794C18.8117 19.9657 19 19.4775 19 18.9149C19 18.3522 18.9096 17.8972 18.7288 17.5496C18.4124 16.987 17.9605 16.4657 17.3729 15.9858C16.6648 15.3901 15.8286 14.9267 14.8644 14.5957C14.2051 14.367 13.4983 14.2042 12.744 14.1072ZM17.4053 18.2566C17.1952 17.8922 16.8797 17.5197 16.424 17.1476L16.4156 17.1407L16.4072 17.1336C15.8543 16.6685 15.1845 16.2915 14.3774 16.0145L14.3728 16.0129C13.4116 15.6795 12.2935 15.5 11 15.5C9.70653 15.5 8.5884 15.6795 7.62716 16.0129L7.62258 16.0145L7.62258 16.0145C6.81549 16.2915 6.1457 16.6685 5.5928 17.1336L5.58444 17.1407L5.57599 17.1476C5.12032 17.5197 4.8048 17.8922 4.59471 18.2567C4.56071 18.3309 4.5 18.5244 4.5 18.9149C4.5 19.1181 4.55224 19.2513 4.66199 19.3809C4.76716 19.493 4.82385 19.5 4.89831 19.5H17.1017C17.1635 19.5 17.1883 19.4893 17.1976 19.4849C17.2084 19.4799 17.2458 19.4607 17.3056 19.3923L17.3156 19.3809L17.3258 19.3696C17.4495 19.2338 17.5 19.1064 17.5 18.9149C17.5 18.5244 17.4393 18.3308 17.4053 18.2566ZM8.81534 10.2306C9.04375 10.6409 9.3346 10.9482 9.69343 11.1786L8.88305 12.4409L9.69343 11.1786C10.0321 11.396 10.3863 11.5 10.7896 11.5C11.193 11.5 11.5472 11.396 11.8859 11.1786C12.2421 10.9499 12.5216 10.647 12.7337 10.2434L12.7405 10.2306L12.7475 10.2178C12.9684 9.81667 13.0793 9.38847 13.0793 8.90816V7.09184C13.0793 6.5884 12.9655 6.15265 12.7475 5.75678L12.7405 5.74403L12.7337 5.73114C12.5246 5.33334 12.2533 5.04694 11.9125 4.83808L11.8991 4.82987L11.8859 4.82139C11.5472 4.60397 11.193 4.5 10.7896 4.5C10.3863 4.5 10.0321 4.60397 9.69343 4.82139L9.68022 4.82987L9.66683 4.83808C9.32322 5.04865 9.04053 5.33964 8.81535 5.74396C8.60927 6.14091 8.5 6.58179 8.5 7.09184V8.90816C8.5 9.39561 8.60669 9.82887 8.81534 10.2306Z" />
          </svg>
          <span>添加成员</span>
        </button>
        <button @click.stop="handleMinimize" class="icon-btn">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path fill-rule="evenodd" clip-rule="evenodd" d="M5.25 2.5C3.73122 2.5 2.5 3.73122 2.5 5.25V15.4995C2.5 17.0183 3.73122 18.2495 5.25 18.2495H9.50539C9.91961 18.2495 10.2554 17.9137 10.2554 17.4995C10.2554 17.0853 9.91961 16.7495 9.50539 16.7495H5.25C4.55964 16.7495 4 16.1899 4 15.4995V5.25C4 4.55964 4.55964 4 5.25 4H15.4995C16.1899 4 16.7495 4.55964 16.7495 5.25V9.50993C16.7495 9.92414 17.0853 10.2599 17.4995 10.2599C17.9137 10.2599 18.2495 9.92414 18.2495 9.50993V5.25C18.2495 3.73122 17.0183 2.5 15.4995 2.5H5.25ZM13.4995 12.9995H19.4995C19.7757 12.9995 19.9995 13.2234 19.9995 13.4995V19.4995C19.9995 19.7757 19.7757 19.9995 19.4995 19.9995H13.4995C13.2234 19.9995 12.9995 19.7757 12.9995 19.4995V13.4995C12.9995 13.2234 13.2234 12.9995 13.4995 12.9995ZM11.4995 13.4995C11.4995 12.3949 12.3949 11.4995 13.4995 11.4995H19.4995C20.6041 11.4995 21.4995 12.3949 21.4995 13.4995V19.4995C21.4995 20.6041 20.6041 21.4995 19.4995 21.4995H13.4995C12.3949 21.4995 11.4995 20.6041 11.4995 19.4995V13.4995Z" fill="currentColor"/>
          </svg>
          <span>最小化</span>
        </button>
      </div>
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
    <div v-if="!isClearScreen" class="call-controls">
      <button @click.stop="toggleMute" :class="{ active: isMuted }" class="control-btn">
        <svg v-if="!isMuted" width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
          <path fill-rule="evenodd" clip-rule="evenodd" d="M12 4C9.51472 4 7.5 6.01472 7.5 8.5V11.5C7.5 13.9853 9.51472 16 12 16C14.4853 16 16.5 13.9853 16.5 11.5V8.5C16.5 6.01472 14.4853 4 12 4ZM12 10.0199C12.6904 10.0199 13.25 9.46025 13.25 8.7699C13.25 8.07954 12.6904 7.5199 12 7.5199C11.3096 7.5199 10.75 8.07954 10.75 8.7699C10.75 9.46025 11.3096 10.0199 12 10.0199Z" />
          <path fill-rule="evenodd" clip-rule="evenodd" d="M19.2565 11.4532C19.2565 11.0114 18.8984 10.6532 18.4565 10.6532C18.0147 10.6532 17.6565 11.0114 17.6565 11.4532C17.6565 14.4705 15.2105 16.9166 12.1931 16.9166H11.7963C8.78476 16.9166 6.34341 14.4752 6.34341 11.4637C6.34341 11.0218 5.98524 10.6637 5.54341 10.6637C5.10158 10.6637 4.74341 11.0218 4.74341 11.4637C4.74341 15.158 7.58384 18.189 11.2 18.4917V19.4503C11.2 19.8921 11.5581 20.2503 12 20.2503C12.4418 20.2503 12.8 19.8921 12.8 19.4503V18.4909C16.4169 18.1831 19.2565 15.1498 19.2565 11.4532Z" />
        </svg>
        <svg v-else width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
          <path fill-rule="evenodd" clip-rule="evenodd" d="M3.80694 20.1909C3.51405 19.8981 3.51405 19.4232 3.80694 19.1303L19.1323 3.80906C19.4252 3.51616 19.9001 3.51616 20.1929 3.80906C20.4858 4.10195 20.4858 4.57682 20.1929 4.86972L4.8676 20.1909C4.57471 20.4838 4.09983 20.4838 3.80694 20.1909Z" />
          <path fill-rule="evenodd" clip-rule="evenodd" d="M8.48343 17.7627C9.30606 18.2658 10.2448 18.5977 11.25 18.7088V20.25C11.25 20.6642 11.5858 21 12 21C12.4142 21 12.75 20.6642 12.75 20.25V18.7088C16.125 18.3357 18.75 15.4744 18.75 12V11C18.75 10.5858 18.4142 10.25 18 10.25C17.5858 10.25 17.25 10.5858 17.25 11V12C17.25 14.8995 14.8995 17.25 12 17.25C11.1288 17.25 10.3071 17.0378 9.58393 16.6622L8.48343 17.7627ZM10.5264 15.7198C10.9824 15.9006 11.4796 16 12 16C14.2091 16 16 14.2091 16 12V10.2462L10.5264 15.7198ZM15.8484 5.90554L8.28023 13.4737C8.09939 13.0177 8 12.5204 8 12V7C8 4.79086 9.79086 3 12 3C13.8297 3 15.3724 4.22845 15.8484 5.90554ZM7.3378 14.4162L6.2373 15.5167C5.61097 14.4925 5.25 13.2884 5.25 12V11C5.25 10.5858 5.58579 10.25 6 10.25C6.41421 10.25 6.75 10.5858 6.75 11V12C6.75 12.8712 6.96223 13.6929 7.3378 14.4162Z" />
        </svg>
        <span>{{ isMuted ? '取消静音' : '静音' }}</span>
      </button>
      <button @click.stop="toggleVideo" :class="{ active: !isVideoEnabled }" class="control-btn">
        <svg v-if="isVideoEnabled" width="24" height="24" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
          <path fill-rule="evenodd" clip-rule="evenodd" d="M3.88889 5C2.84568 5 2 5.84568 2 6.88889V17.1111C2 18.1543 2.84568 19 3.88889 19H15.8611C16.9043 19 17.75 18.1543 17.75 17.1111V15.3089L21.0178 17.1244C21.4585 17.3692 22 17.0505 22 16.5464V7.46025C22 6.95616 21.4585 6.63753 21.0178 6.88233L17.75 8.69779V6.88889C17.75 5.84568 16.9043 5 15.8611 5H3.88889ZM5.5 10C6.32843 10 7 9.32843 7 8.5C7 7.67157 6.32843 7 5.5 7C4.67157 7 4 7.67157 4 8.5C4 9.32843 4.67157 10 5.5 10Z" />
        </svg>
        <svg v-else width="24" height="24" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
          <path fill-rule="evenodd" clip-rule="evenodd" d="M7.24619 19H14.3611C15.4043 19 16.25 18.1543 16.25 17.1111V15.3089L19.5178 17.1244C19.9585 17.3692 20.5 17.0505 20.5 16.5464V7.46025C20.5 6.95616 19.9585 6.63753 19.5178 6.88233L19.1714 7.0748L7.24619 19ZM15.9249 5.82909C15.5851 5.32872 15.0115 5 14.3611 5H5.38889C4.34568 5 3.5 5.84568 3.5 6.88889V17.1111C3.5 17.4409 3.58453 17.751 3.73312 18.0209L15.9249 5.82909Z" />
          <path fill-rule="evenodd" clip-rule="evenodd" d="M3.80694 20.1909C3.51405 19.8981 3.51405 19.4232 3.80694 19.1303L19.1323 3.80906C19.4252 3.51616 19.9001 3.51616 20.1929 3.80906C20.4858 4.10195 20.4858 4.57682 20.1929 4.86972L4.8676 20.1909C4.57471 20.4838 4.09983 20.4838 3.80694 20.1909Z" />
        </svg>
        <span>{{ isVideoEnabled ? '关闭摄像头' : '开启摄像头' }}</span>
      </button>
      <button @click.stop="endCall" class="control-btn end-call-btn">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
          <path d="M8.43445 12.6265C8.40888 12.6658 8.46336 13.037 8.45381 13.1428C8.43469 13.3543 8.44114 13.5264 8.40602 13.6715C8.24328 14.7412 7.53366 15.2879 5.71437 15.4497C4.58252 15.5543 3.85663 15.3068 3.4024 14.7319C3.08891 14.3045 2.98642 13.7342 3.01174 12.967C2.99573 12.9006 2.99239 12.4507 3.02751 12.3056C3.02369 10.4 7.03906 8.58585 11.9887 8.60976C16.8967 8.60665 20.9804 10.4191 21.0002 12.3909L20.9971 12.6688L20.994 12.9466C20.9911 13.9523 20.9178 14.5203 20.5023 14.9781C20.0867 15.4359 19.3642 15.6384 18.3857 15.5067C16.2946 15.2681 15.6485 14.6246 15.6064 13.1421C15.616 13.0363 15.6286 12.6527 15.5871 12.6257C15.5742 12.2815 14.196 11.9462 12.0345 11.9979C9.81551 11.9561 8.40554 12.2159 8.43445 12.6265Z" />
        </svg>
        <span>挂断</span>
      </button>
    </div>
    

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

/* Header 样式 */
.call-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 60px;
  padding: 0 16px;
  color: white;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.header-content {
  display: flex;
  align-items: center;
  gap: 12px;
}

.group-avatar {
  width: 40px;
  height: 40px;
  border-radius: 4px;
  object-fit: cover;
}

.header-info h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 500;
}

.call-duration {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.7);
}

.header-actions {
  display: flex;
  gap: 8px;
}

.icon-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.1);
  color: white;
  cursor: pointer;
  font-size: 14px;
  transition: background 0.2s;
}

.icon-btn svg {
  flex-shrink: 0;
}

.icon-btn:hover {
  background: rgba(255, 255, 255, 0.2);
}

/* 视频内容区域 */
.video-content {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  padding: 12px;
}

.empty-state {
  color: rgba(255, 255, 255, 0.5);
  font-size: 16px;
}

/* 左大右小固定布局 */
.left-right-layout {
  width: 100%;
  height: 100%;
  display: flex;
  gap: 12px;
}

/* 左侧主视频 */
.main-video-wrapper {
  flex: 1;
  height: 100%;
  min-width: 0;
}

.main-video-wrapper .participant-video {
  width: 100%;
  height: 100%;
}

/* 视频出现动画 */
.video-appearing {
  animation: videoAppear 0.3s ease-out;
}

@keyframes videoAppear {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.participant-video {
  position: relative;
  width: 100%;
  height: 100%;
  background: #000;
  border-radius: 8px;
  overflow: hidden;
}

.participant-video video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* 邀请中loading遮罩 */
.inviting-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  z-index: 2;
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.inviting-text {
  color: white;
  font-size: 14px;
  font-weight: 500;
}

.participant-info {
  position: absolute;
  bottom: 8px;
  left: 8px;
  color: white;
  background: rgba(0, 0, 0, 0.6);
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 4px;
  z-index: 2;
}

/* Hover 图标样式 */
.hover-icon {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 3;
  opacity: 0;
  transition: opacity 0.2s ease;
  background: rgba(0, 0, 0, 0.6);
  border-radius: 50%;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}

.video-wrapper:hover .hover-icon,
.main-video:hover .hover-icon {
  opacity: 1;
}

.main-video-hover-icon {
  top: 9px;
  right: 9px;
  width: 28px;
  height: 28px;
}

.muted-indicator {
  font-size: 12px;
}

/* 右侧纵向列表 */
.side-video-list {
  width: 160px;
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow-y: auto;
  overflow-x: hidden;
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.3) transparent;
}

.side-video-list::-webkit-scrollbar {
  width: 6px;
}

.side-video-list::-webkit-scrollbar-track {
  background: transparent;
}

.side-video-list::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.3);
  border-radius: 3px;
}

.side-video-list::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.5);
}

.side-video-item {
  width: 100%;
  aspect-ratio: 16 / 9;
  flex-shrink: 0;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
  position: relative;
}

.side-video-item:hover {
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.side-video-item .participant-video {
  border: 2px solid rgba(255, 255, 255, 0.2);
}

.side-video-item:hover .participant-video {
  border-color: rgba(255, 255, 255, 0.5);
}

/* 控制按钮 */
.call-controls {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 12px;
  padding: 16px;
  height: 60px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.control-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  border: none;
  border-radius: 50px;
  background: rgba(255, 255, 255, 0.2);
  color: white;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s;
  white-space: nowrap;
}

.control-btn svg {
  flex-shrink: 0;
}

.control-btn:hover {
  background: rgba(255, 255, 255, 0.3);
}

.control-btn.active {
  background: #ff4757;
}

.end-call-btn {
  background: #ff4757;
}

.end-call-btn:hover {
  background: #ff3838;
}



/* 响应式 */
@media (max-width: 768px) {
  .call-header {
    padding: 0 12px;
  }
  
  .header-info h3 {
    font-size: 14px;
  }
  
  .call-duration {
    font-size: 12px;
  }
  
  .icon-btn {
    padding: 6px 12px;
    font-size: 12px;
  }
  
  .control-btn {
    padding: 8px 16px;
    font-size: 12px;
  }
  
  .side-video-list {
    width: 120px;
  }
  
  .left-right-layout {
    gap: 8px;
  }
}
</style>