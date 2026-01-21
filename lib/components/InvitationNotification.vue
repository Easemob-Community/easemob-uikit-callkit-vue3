<template>
  <Transition name="slide-down">
    <div v-if="visible" class="invitation-notification">
      <div class="invitation-content">
        <!-- 头像 -->
        <div class="invitation-avatar">
          <img v-if="callerAvatar" :src="callerAvatar" :alt="callerName" />
          <div v-else class="avatar-placeholder">
            {{ callerName?.[0]?.toUpperCase() || '?' }}
          </div>
          <div class="call-type-badge">
            <svg v-if="callType === 'video'" width="16" height="16" viewBox="0 0 24 24" fill="white">
              <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/>
            </svg>
            <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="white">
              <path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56-.35-.12-.74-.03-1.01.24l-1.57 1.97c-2.83-1.35-5.48-3.9-6.89-6.83l1.95-1.66c.27-.28.35-.67.24-1.02-.37-1.11-.56-2.3-.56-3.53 0-.54-.45-.99-.99-.99H4.19C3.65 3 3 3.24 3 3.99 3 13.28 10.73 21 20.01 21c.71 0 .99-.63.99-1.18v-3.45c0-.54-.45-.99-.99-.99z"/>
            </svg>
          </div>
        </div>

        <!-- 信息 -->
        <div class="invitation-info">
          <div class="caller-name">{{ callerName }}</div>
          <div class="call-description">{{ callDescription }}</div>
        </div>

        <!-- 操作按钮 -->
        <div class="invitation-actions">
          <button class="reject-btn" @click="handleReject" :disabled="processing">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
              <path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08c-.18-.17-.29-.42-.29-.7 0-.28.11-.53.29-.71C3.34 8.78 7.46 7 12 7s8.66 1.78 11.71 4.67c.18.18.29.43.29.71 0 .28-.11.53-.29.71l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.11-.7-.28-.79-.74-1.69-1.36-2.67-1.85-.33-.16-.56-.5-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z"/>
            </svg>
          </button>
          <button class="accept-btn" @click="handleAccept" :disabled="processing">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
              <path v-if="callType === 'video'" d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/>
              <path v-else d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56-.35-.12-.74-.03-1.01.24l-1.57 1.97c-2.83-1.35-5.48-3.9-6.89-6.83l1.95-1.66c.27-.28.35-.67.24-1.02-.37-1.11-.56-2.3-.56-3.53 0-.54-.45-.99-.99-.99H4.19C3.65 3 3 3.24 3 3.99 3 13.28 10.73 21 20.01 21c.71 0 .99-.63.99-1.18v-3.45c0-.54-.45-.99-.99-.99z"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useCallStateStore } from '../store/callState'
import { useChatClientStore } from '../store/chatClient'
import { useAnswerCall } from '../composables/useAnswerCall'
import { CALL_STATUS, CALL_TYPE } from '../types/callstate.types'
import { logger } from '../utils/logger'

const callStateStore = useCallStateStore()
const chatClientStore = useChatClientStore()
const { acceptCall, rejectCall } = useAnswerCall()

const visible = ref(false)
const processing = ref(false)

// 计算属性
const callerName = computed(() => {
  const callerUserId = callStateStore.getCallState.callerUserId
  if (callerUserId) {
    const userInfo = callStateStore.getUserInfo(callerUserId)
    return userInfo?.nickname || callerUserId
  }
  return '未知用户'
})

const callerAvatar = computed(() => {
  const callerUserId = callStateStore.getCallState.callerUserId
  if (callerUserId) {
    const userInfo = callStateStore.getUserInfo(callerUserId)
    return userInfo?.avatarURL || ''
  }
  return ''
})

const callType = computed(() => {
  const type = callStateStore.getCallState.type
  if (type === CALL_TYPE.VIDEO_1V1 || type === CALL_TYPE.VIDEO_MULTI) return 'video'
  if (type === CALL_TYPE.AUDIO_1V1 || type === CALL_TYPE.AUDIO_MULTI) return 'audio'
  return 'audio'
})

const isGroupCall = computed(() => {
  const type = callStateStore.getCallState.type
  return type === CALL_TYPE.VIDEO_MULTI || type === CALL_TYPE.AUDIO_MULTI
})

const callDescription = computed(() => {
  const base = callType.value === 'video' ? '视频通话' : '语音通话'
  if (isGroupCall.value) {
    const groupName = callStateStore.getCallState.groupName
    return `邀请您加入${groupName ? `「${groupName}」` : '群组'}${base}`
  }
  return `${base}邀请`
})

// 检查 ChatClient 是否已登录
const isChatClientReady = computed(() => {
  const client = chatClientStore.getChatClient
  // 检查 client 存在且已登录（通过检查 deviceId 是否存在来判断）
  return client && chatClientStore.getClientDeviceId
})

// 监听通话状态
watch(
  () => callStateStore.getCallStatus,
  (newStatus) => {
    // 只有在 ChatClient 已登录且状态为 ALERTING 时才显示弹窗
    if (newStatus === CALL_STATUS.ALERTING && isChatClientReady.value) {
      visible.value = true
      logger.info('InvitationNotification: 显示通话邀请弹窗')
    } else {
      visible.value = false
      if (newStatus === CALL_STATUS.ALERTING && !isChatClientReady.value) {
        logger.warn('InvitationNotification: 收到通话邀请但 ChatClient 未登录或未初始化，无法显示弹窗')
        console.warn('通话邀请被忽略: 请先登录环信账号')
      }
    }
  }
)

// 接听
const handleAccept = async () => {
  if (processing.value) return
  
  // 检查 ChatClient 是否已登录
  if (!isChatClientReady.value) {
    logger.error('InvitationNotification: ChatClient未登录或未初始化，无法接听通话')
    console.error('接听失败: 请先登录环信账号')
    visible.value = false
    return
  }
  
  processing.value = true
  try {
    await acceptCall()
    visible.value = false
  } catch (error) {
    logger.error('InvitationNotification: 接听失败:', error)
    console.error('接听失败:', error)
  } finally {
    processing.value = false
  }
}

// 拒绝
const handleReject = async () => {
  if (processing.value) return
  
  // 检查 ChatClient 是否已登录
  if (!isChatClientReady.value) {
    logger.error('InvitationNotification: ChatClient未登录或未初始化，无法拒绝通话')
    console.error('拒绝失败: 请先登录环信账号')
    visible.value = false
    return
  }
  
  processing.value = true
  try {
    await rejectCall()
    visible.value = false
  } catch (error) {
    logger.error('InvitationNotification: 拒绝失败:', error)
    console.error('拒绝失败:', error)
  } finally {
    processing.value = false
  }
}

// 初始化检查
onMounted(() => {
  if (callStateStore.getCallStatus === CALL_STATUS.ALERTING && isChatClientReady.value) {
    visible.value = true
    logger.info('InvitationNotification: 组件挂载时发现待处理的通话邀请')
  } else if (callStateStore.getCallStatus === CALL_STATUS.ALERTING && !isChatClientReady.value) {
    logger.warn('InvitationNotification: 组件挂载时有通话邀请，但用户未登录')
  }
})
</script>

<style scoped>
.invitation-notification {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 9999;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
  padding: 16px;
  min-width: 360px;
  max-width: 400px;
  backdrop-filter: blur(10px);
}

.invitation-content {
  display: flex;
  align-items: center;
  gap: 12px;
}

.invitation-avatar {
  position: relative;
  width: 56px;
  height: 56px;
  flex-shrink: 0;
}

.invitation-avatar img {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
  border: 3px solid rgba(255, 255, 255, 0.3);
}

.avatar-placeholder {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  font-weight: 600;
  color: white;
  border: 3px solid rgba(255, 255, 255, 0.3);
}

.call-type-badge {
  position: absolute;
  bottom: -2px;
  right: -2px;
  width: 28px;
  height: 28px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.invitation-info {
  flex: 1;
  min-width: 0;
  color: white;
}

.caller-name {
  font-size: 16px;
  font-weight: 600;
  line-height: 22px;
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.call-description {
  font-size: 14px;
  opacity: 0.9;
  line-height: 20px;
}

.invitation-actions {
  display: flex;
  gap: 12px;
  flex-shrink: 0;
}

.invitation-actions button {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.invitation-actions button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.reject-btn {
  background: #ef4444;
}

.reject-btn:hover:not(:disabled) {
  background: #dc2626;
  transform: scale(1.05);
}

.accept-btn {
  background: #10b981;
}

.accept-btn:hover:not(:disabled) {
  background: #059669;
  transform: scale(1.05);
}

/* 动画 */
.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.slide-down-enter-from {
  opacity: 0;
  transform: translateY(-20px);
}

.slide-down-leave-to {
  opacity: 0;
  transform: translateY(-20px);
}
</style>
