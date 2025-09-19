<template>
  <div id="app">
    <h1>Easemob Chat CallKit Vue3 演示</h1>

    <!-- 使用Provider包裹应用 -->
    <EasemobChatCallKitProvider :chat-client="chatClient">
      <div class="demo-section">
        <h2>功能演示</h2>

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
const targetUserId = ref('user123')
const groupId = ref('group123')
const showSingleCall = ref(false)
const showMultiCall = ref(false)
const singleCallType = ref<'audio' | 'video'>('video')
const multiCallType = ref<'audio' | 'video'>('video')
const currentCallInfo = ref('')

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
  const connection = new SDK.connection({
    appKey: 'easemob-demo#support',
  })
  console.log('useCallKit', useCallKit);
  // 模拟登录（实际使用时需要真实凭证）
  connection.open({
    user: 'ppp',
    pwd: '1'
  }).then(() => {
    console.log('环信客户端连接成功')
    chatClient.value = connection
  }).catch((error: any) => {
    console.error('环信客户端连接失败:', error)
    // 为了演示，即使没有真实连接也赋值一个模拟对象
    chatClient.value = connection
  })
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
  currentCallInfo.value = `单人${type === 'audio' ? '语音' : '视频'}通话: ${targetUserId.value}`

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
  // console.log('单人通话开始')
  startCall('audio')
  startSingleCall('pfh', 'audio', 'jjajajjajjaj')
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

.status-display {
  margin-top: 15px;
  padding: 10px;
  background-color: #e3f2fd;
  border-radius: 4px;
  color: #1976d2;
}
</style>