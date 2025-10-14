<template>
  <div id="app">
    <h1>Easemob Chat CallKit Vue3 演示</h1>

    <!-- 使用Provider包裹应用 - 开启debug模式以测试logger -->
    <EasemobChatCallKitProvider :chat-client="chatClient" :init-config="{ inviteTimeout: 30000, debug: true }">
      <div class="demo-section">
        <h2>功能演示</h2>

        <!-- 登录表单 -->
        <div class="login-section">
          <h3>登录</h3>
          <div class="login-form">
            <input v-model="loginUserId" placeholder="输入用户ID" class="input-field" />
            <input v-model="loginPassword" type="password" placeholder="输入密码" class="input-field" />
            <button @click="handleLogin" class="btn login-btn">登录</button>
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
          <div class="button-group">
            <button @click="startMultiCall('audio')" class="btn audio-btn">
              群组语音
            </button>
            <button @click="startMultiCall('video')" class="btn video-btn">
              群组视频
            </button>
          </div>

          <EasemobChatMultiCall v-if="showMultiCall" :group-id="groupId" :participants="mockParticipants"
            :type="multiCallType" @call-started="handleMultiCallStart" @call-ended="handleMultiCallEnd" />
        </div>

        <div class="status-display" v-if="currentCallInfo">
          <p>{{ currentCallInfo }}</p>
        </div>
      </div>
    </EasemobChatCallKitProvider>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import SDK from 'easemob-websdk'
import { useCallKit } from 'easemob-chat-callkit-vue3'
// 状态管理
const targetUserId = ref('')
const groupId = ref('')
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

// 模拟群组参与者
const mockParticipants = [
  { userId: 'user1', userName: '张三' },
  { userId: 'user2', userName: '李四' },
  { userId: 'user3', userName: '王五' },
  { userId: 'user4', userName: '赵六' }
]

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

// 方法
const { startSingleCall } = useCallKit()
const startCall = (type: 'audio' | 'video') => {
  if (!targetUserId.value) {
    alert('请输入目标用户ID')
    return
  }
  if (!chatClient.value) {
    alert('环信客户端未初始化')
    return
  }
  singleCallType.value = type
  showSingleCall.value = true
  showMultiCall.value = false
  currentCallInfo.value = `单人${type === 'audio' ? '语音' : '视频'}通话: ${targetUserId.value}`;

}

const startMultiCall = (type: 'audio' | 'video') => {
  if (!groupId.value) {
    alert('请输入群组ID')
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
}

const handleSingleCallStart = () => {
  console.log('单人通话开始')
  startCall(singleCallType.value)
  startSingleCall(targetUserId.value, singleCallType.value)
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

.status-display {
  margin-top: 15px;
  padding: 10px;
  background-color: #e3f2fd;
  border-radius: 4px;
  color: #1976d2;
}
</style>