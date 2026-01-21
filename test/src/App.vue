<template>
  <div id="app">
    <h1>Easemob Chat CallKit Vue3 演示</h1>

    <!-- 使用Provider包裹应用 - 开启debug模式以测试logger -->
    <EasemobChatCallKitProvider :chat-client="chatClient" :init-config="{ inviteTimeout: 30000, debug: true }">
      <!-- 通话邀请通知 -->
      <InvitationNotification />
      
      <div class="demo-section">
        <h2>功能演示</h2>

        <!-- 登录表单 -->
        <div class="login-section">
          <h3>登录</h3>
          <div class="login-form">
            <input v-model="loginUserId" placeholder="输入用户ID" class="input-field" />
            <input v-model="loginPassword" type="password" placeholder="输入密码" class="input-field" />
            <div class="button-group">
              <button @click="handleLogin" class="btn login-btn">登录</button>
              <button @click="handleResetState" class="btn reset-btn">重置状态</button>
            </div>
          </div>
        </div>

        <!-- 单人通话演示 -->
        <div class="call-demo">
          <h3>单人通话</h3>
          <input v-model="targetUserId" placeholder="输入目标用户ID" class="input-field" />
          <div class="button-group">
            <button @click="startCall('audio')" class="btn audio-btn">
              语音通话
            </button>
            <button @click="startCall('video')" class="btn video-btn">
              视频通话
            </button>
          </div>

          <EasemobChatSingleCall v-if="showSingleCall" :target-user="targetUserId" :type="singleCallType"
            @call-started="handleSingleCallStart" @call-ended="handleSingleCallEnd" />
        </div>

        <!-- 群组通话演示 -->
        <div class="call-demo">
          <h3>群组通话</h3>
          <input v-model="groupId" placeholder="输入群组ID" class="input-field" />
          <input v-model="groupMembers" placeholder="输入成员ID（逗号分隔）" class="input-field" />
          <input v-model="groupName" placeholder="群组名称（可选）" class="input-field" />
          <input v-model="groupAvatar" placeholder="群组头像 URL（可选）" class="input-field" />
          <div class="button-group">
            <button @click="startMultiCall('audio')" class="btn audio-btn">
              群组语音
            </button>
            <button @click="startMultiCall('video')" class="btn video-btn">
              群组视频
            </button>
          </div>

          <EasemobChatMultiCall 
            v-if="showMultiCall" 
            :group-id="groupId" 
            :group-name="groupName"
            :group-avatar="groupAvatar"
            :participants="mockParticipants"
            :type="multiCallType" 
            :current-user-id="chatClient?.user"
            @call-started="handleMultiCallStart" 
            @call-ended="handleMultiCallEnd" 
          />
        </div>

        <div class="status-display" v-if="currentCallInfo">
          <p>{{ currentCallInfo }}</p>
          <button @click="handleEndCall" class="btn end-call-btn">
            结束通话
          </button>
        </div>
      </div>
    </EasemobChatCallKitProvider>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import SDK from 'easemob-websdk'
import { useCallStateStore } from '../../lib/store/callState'
import { CallService } from '../../lib/services/CallService'
import { HANGUP_REASON, CALL_STATUS, CALL_TYPE } from '../../lib/types/callstate.types'
import { useCallKit } from '../../lib/composables/useCallKit'
import InvitationNotification from '../../lib/components/InvitationNotification.vue'
import EasemobChatSingleCall from '../../lib/components/singleCall/EasemobChatSingleCall.vue'
import EasemobChatMultiCall from '../../lib/components/EasemobChatMultiCall.vue'
// 状态管理
const targetUserId = ref('')
const groupId = ref('')
const groupMembers = ref('') // 群组成员ID，逗号分隔
const groupName = ref('') // 群组名称
const groupAvatar = ref('') // 群组头像
const showSingleCall = ref(false)
const showMultiCall = ref(false)
const singleCallType = ref<'audio' | 'video'>('video')
const multiCallType = ref<'audio' | 'video'>('video')
const currentCallInfo = ref('')
// 登录相关状态
const loginUserId = ref('ppp')
const loginPassword = ref('1')

// 环信客户端实例
const chatClient = ref()

// 配置信息
const callConfig = {
  appKey: 'your_app_key',
  userId: 'current_user',
  debug: true
}

// 动态生成群组参与者列表
const mockParticipants = computed(() => {
  const callStateStore = useCallStateStore()
  const state = callStateStore.getCallState
  const participants: any[] = []
  
  // 添加当前用户（被叫方）
  if (state.calleeUserId && chatClient.value?.user) {
    participants.push({
      userId: chatClient.value.user,
      userName: callStateStore.getUserInfo(chatClient.value.user)?.nickname || chatClient.value.user,
      avatar: callStateStore.getUserInfo(chatClient.value.user)?.avatarURL,
      isMuted: false
    })
  }
  
  // 添加主叫方
  if (state.callerUserId) {
    participants.push({
      userId: state.callerUserId,
      userName: callStateStore.getUserInfo(state.callerUserId)?.nickname || state.callerUserId,
      avatar: callStateStore.getUserInfo(state.callerUserId)?.avatarURL,
      isMuted: false
    })
  }
  
  // 添加其他被邀请成员
  if (state.invitedMembers && state.invitedMembers.length > 0) {
    state.invitedMembers.forEach(userId => {
      // 避免重复添加
      if (userId !== chatClient.value?.user && userId !== state.callerUserId) {
        participants.push({
          userId,
          userName: callStateStore.getUserInfo(userId)?.nickname || userId,
          avatar: callStateStore.getUserInfo(userId)?.avatarURL,
          isMuted: false
        })
      }
    })
  }
  
  return participants
})

// 初始化环信客户端
onMounted(() => {
  // 创建环信连接实例
  //关闭IM日志输出
  SDK.logger.disableAll()
  const connection = new SDK.connection({
    appKey: 'easemob-demo#support',
    isFixedDeviceId: false
  })

  chatClient.value = connection
  // 演示模式下，默认不自动登录，等待用户输入凭证
})

// 监听通话状态变化，自动显示群组通话界面
const callStateStore = useCallStateStore()
watch(
  () => callStateStore.getCallStatus,
  (newStatus) => {
    // 当状态变为 IN_CALL 时
    if (newStatus === CALL_STATUS.IN_CALL) {
      const callType = callStateStore.getCallState.type
      
      // 判断是否为群组通话
      if (callType === CALL_TYPE.VIDEO_MULTI || callType === CALL_TYPE.AUDIO_MULTI) {
        console.log('检测到群组通话已接通，显示群组通话界面')
        showMultiCall.value = true
        showSingleCall.value = false
        
        // 更新群组信息
        groupId.value = callStateStore.getCallState.groupId || ''
        groupName.value = callStateStore.getCallState.groupName || ''
        groupAvatar.value = callStateStore.getCallState.groupAvatar || ''
        
        const callTypeText = callType === CALL_TYPE.AUDIO_MULTI ? '语音' : '视频'
        currentCallInfo.value = `群组${callTypeText}通话: ${groupName.value || groupId.value}`
      }
      // 判断是否为单人通话
      else if (callType === CALL_TYPE.VIDEO_1V1 || callType === CALL_TYPE.AUDIO_1V1) {
        console.log('检测到单人通话已接通，显示单人通话界面')
        showSingleCall.value = true
        showMultiCall.value = false
        
        const callTypeText = callType === CALL_TYPE.AUDIO_1V1 ? '语音' : '视频'
        currentCallInfo.value = `单人${callTypeText}通话: ${callStateStore.getCallState.calleeUserId}`
      }
    }
    // 当状态变为 IDLE 时，隐藏所有通话界面
    else if (newStatus === CALL_STATUS.IDLE) {
      console.log('通话状态变为IDLE，隐藏通话界面')
      showSingleCall.value = false
      showMultiCall.value = false
      currentCallInfo.value = ''
    }
  }
)

// 方法
const { startSingleCall, startGroupCall } = useCallKit()
const startCall = async (type: 'audio' | 'video') => {
  if (!targetUserId.value) {
    alert('请输入目标用户ID')
    return
  }
  if (!chatClient.value) {
    alert('环信客户端未初始化')
    return
  }
  
  singleCallType.value = type
  showMultiCall.value = false
  currentCallInfo.value = `单人${type === 'audio' ? '语音' : '视频'}通话: ${targetUserId.value}`
  
  // 先发送通话邀请信令，初始化状态
  const inviteMessage = type === 'audio' ? '邀请您进行语音通话' : '邀请您进行视频通话'
  await startSingleCall(targetUserId.value, type, inviteMessage)
  
  // 状态初始化完成后再显示组件
  showSingleCall.value = true
}

const startMultiCall = async (type: 'audio' | 'video') => {
  if (!groupId.value) {
    alert('请输入群组ID')
    return
  }
  if (groupMembers.value.length === 0) {
    alert('请输入至少一个群组成员ID')
    return
  }
  if (!chatClient.value) {
    alert('环信客户端未初始化')
    return
  }
  
  multiCallType.value = type
  showMultiCall.value = true
  showSingleCall.value = false
  currentCallInfo.value = `群组${type === 'audio' ? '语音' : '视频'}通话: ${groupId.value}`
  
  // 解析群组成员ID（逗号分隔）
  const members = groupMembers.value.split(',').map((id) => id.trim()).filter((id) => id.length > 0)
  
  // 发送群组通话邀请信令
  const inviteMessage = type === 'audio' ? '邀请您加入群组语音通话' : '邀请您加入群组视频通话'
  try {
    await startGroupCall(
      groupId.value,
      members,
      type,
      inviteMessage,
      groupName.value || undefined,
      groupAvatar.value || undefined
    )
    console.log('群组通话邀请已发送')
  } catch (error) {
    console.error('发起群组通话失败:', error)
    alert('发起群组通话失败')
    showMultiCall.value = false
    currentCallInfo.value = ''
  }
}

const handleSingleCallStart = () => {
  console.log('单人通话已显示界面')
}

const handleSingleCallEnd = () => {
  console.log('单人通话结束')
  showSingleCall.value = false
  currentCallInfo.value = ''
}

const handleMultiCallStart = () => {
  console.log('群组通话开始')
}

const handleMultiCallEnd = () => {
  console.log('群组通话结束')
  showMultiCall.value = false
  currentCallInfo.value = ''
}

// 登录处理函数
const handleLogin = () => {
  if (!loginUserId.value || !loginPassword.value) {
    alert('请输入用户ID和密码')
    return
  }

  if (!chatClient.value) {
    alert('环信客户端未初始化')
    return
  }

  // 使用用户输入的凭证进行登录
  chatClient.value.open({
    user: loginUserId.value,
    pwd: loginPassword.value
  }).then(() => {
    console.log('登录成功')
    alert('登录成功')
  }).catch((error: any) => {
    console.error('登录失败:', error)
    alert(`登录失败: ${error.message || '未知错误'}`)
  })
}

// 重置通话状态
const handleResetState = () => {
  const callStateStore = useCallStateStore()
  callStateStore.resetCallState()
  showSingleCall.value = false
  showMultiCall.value = false
  currentCallInfo.value = ''
  console.log('通话状态已重置')
  alert('通话状态已重置')
}

// 结束通话处理函数
const handleEndCall = () => {
  console.log('用户主动结束通话')
  const callService = new CallService()
  callService.hangup(HANGUP_REASON.HANGUP)
    .then(() => {
      console.log('通话已结束')
      showSingleCall.value = false
      showMultiCall.value = false
      currentCallInfo.value = ''
      alert('通话已结束')
    })
    .catch((error) => {
      console.error('结束通话失败:', error)
      alert('结束通话失败')
    })
}
</script>

<style scoped>
#app {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
  font-family: Arial, sans-serif;
}

.demo-section {
  margin: 20px 0;
  padding: 20px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  background-color: #f9f9f9;
}

.call-demo {
  margin: 20px 0;
  padding: 15px;
  border: 1px solid #ddd;
  border-radius: 8px;
}

.call-demo h3 {
  margin-top: 0;
  color: #333;
}

.controls {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.input-field {
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  width: 200px;
}

.button-group {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.3s;
}

.audio-btn {
  background-color: #007bff;
  color: white;
}

.video-btn {
  background-color: #28a745;
  color: white;
}

.btn:hover:not(:disabled) {
  opacity: 0.8;
}

.login-section {
  margin: 20px 0;
  padding: 15px;
  border: 1px solid #ddd;
  border-radius: 8px;
  background-color: #f0f0f0;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-width: 300px;
}

.login-btn {
  background-color: #6c757d;
  color: white;
}

.reset-btn {
  background-color: #ffc107;
  color: #333;
}

.status-display {
  margin-top: 15px;
  padding: 10px;
  background-color: #e3f2fd;
  border-radius: 4px;
  color: #1976d2;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.end-call-btn {
  background-color: #dc3545;
  color: white;
  padding: 8px 16px;
  align-self: flex-start;
}
</style>