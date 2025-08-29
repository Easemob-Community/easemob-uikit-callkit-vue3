# Easemob Chat CallKit Vue3 使用指南

## 🚀 **推荐的引入方式**

### 方式1：组合式API（最推荐）
```typescript
// main.ts - 无需全局安装
import { createApp } from 'vue'
import App from './App.vue'

createApp(App).mount('#app')
```

```vue
<!-- App.vue -->
<template>
  <EasemobChatCallKitProvider 
    :init-config="{ appKey: 'your_app_key' }"
    :enable-ringtone="true"
  >
    <YourApp />
  </EasemobChatCallKitProvider>
</template>

<script setup>
import { useCallKit, useCallKitProvider } from 'easemob-chat-callkit-vue3'

// 直接使用组合式API
const { startCall, endCall, startChat } = useCallKit()
const { appKey } = useCallKitProvider()
</script>
```

### 方式2：按需引入组件
## 使用指南

### 组件架构

本插件采用分层架构设计：

- **EasemobChatCallKitProvider**: 配置提供者，负责全局配置和上下文管理
- **EasemobChatSingleCall**: 单人一对一音视频通话组件
- **EasemobChatMultiCall**: 群组多人音视频通话组件

### 组件引入

#### 方式一：按需引入组件（推荐）
```vue
<script setup>
import { 
  EasemobChatCallKitProvider, 
  EasemobChatSingleCall,
  EasemobChatMultiCall 
} from 'easemob-chat-callkit-vue3'
</script>

<!-- 单人一对一通话 -->
<template>
  <EasemobChatCallKitProvider :config="config">
    <EasemobChatSingleCall 
      :target-user="friendId" 
      :type="'audio'" 
      @call-started="handleCallStart"
      @call-ended="handleCallEnd"
    />
  </EasemobChatCallKitProvider>
</template>

<!-- 群组多人通话 -->
<template>
  <EasemobChatCallKitProvider :config="config">
    <EasemobChatMultiCall 
      :group-id="groupId"
      :participants="participants"
      :type="'video'"
      @call-started="handleCallStart"
      @call-ended="handleCallEnd"
    />
  </EasemobChatCallKitProvider>
</template>
```

#### 方式二：组合式API（推荐）
```vue
<script setup>
import { useCallKit, useCallKitProvider } from 'easemob-chat-callkit-vue3'

const { config } = useCallKitProvider()
const { startCall, endCall } = useCallKit()

config.value = {
  appKey: 'your_app_key',
  userId: 'user123',
  accessToken: 'your_access_token'
}
</script>
```

#### 方式三：全局注册（可选）
```js
import { createApp } from 'vue'
import EasemobChatCallKitVue3 from 'easemob-chat-callkit-vue3'

const app = createApp(App)
app.use(EasemobChatCallKitVue3)
```

### API 参考

#### EasemobChatCallKitProvider Props
```typescript
interface ProviderConfig {
  appKey: string          // 环信应用key
  userId?: string       // 用户ID
  accessToken?: string  // 访问令牌
  debug?: boolean       // 调试模式
}
```

#### EasemobChatSingleCall Props
```typescript
interface SingleCallProps {
  targetUser: string    // 目标用户ID
  type: 'audio' | 'video'  // 通话类型
  enableRingtone?: boolean  // 启用铃声
}
```

#### EasemobChatMultiCall Props
```typescript
interface MultiCallProps {
  groupId: string      // 群组ID
  participants: Participant[]  // 参与者列表
  type: 'audio' | 'video'  // 通话类型
  maxParticipants?: number  // 最大参与者数
}
```

### 基本用法示例

#### 单人通话
```vue
<template>
  <div>
    <EasemobChatCallKitProvider :config="callConfig">
      <button @click="startCall('friend123', 'video')">视频通话</button>
      <button @click="startCall('friend123', 'audio')">语音通话</button>
      
      <EasemobChatSingleCall
        v-if="showCall"
        :target-user="targetUser"
        :type="callType"
        @call-ended="handleCallEnd"
      />
    </EasemobChatCallKitProvider>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { EasemobChatCallKitProvider, EasemobChatSingleCall } from 'easemob-chat-callkit-vue3'

const callConfig = ref({
  appKey: 'your_app_key',
  userId: 'current_user',
  debug: true
})

const showCall = ref(false)
const targetUser = ref('')
const callType = ref('video')

const startCall = (userId, type) => {
  targetUser.value = userId
  callType.value = type
  showCall.value = true
}

const handleCallEnd = () => {
  showCall.value = false
}
</script>
```

#### 群组通话
```vue
<template>
  <div>
    <EasemobChatCallKitProvider :config="callConfig">
      <button @click="startGroupCall">开始群组通话</button>
      
      <EasemobChatMultiCall
        v-if="showGroupCall"
        :group-id="groupId"
        :participants="groupMembers"
        :type="'video'"
        @call-ended="handleGroupCallEnd"
      />
    </EasemobChatCallKitProvider>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { EasemobChatCallKitProvider, EasemobChatMultiCall } from 'easemob-chat-callkit-vue3'

const callConfig = ref({
  appKey: 'your_app_key',
  userId: 'current_user'
})

const showGroupCall = ref(false)
const groupId = ref('group123')
const groupMembers = ref([
  { userId: 'user1', userName: '张三' },
  { userId: 'user2', userName: '李四' },
  { userId: 'user3', userName: '王五' }
])

const startGroupCall = () => {
  showGroupCall.value = true
}

const handleGroupCallEnd = () => {
  showGroupCall.value = false
}
</script>
```

### 方式3：全局注册（传统方式）
```typescript
// main.ts
import { createApp } from 'vue'
import App from './App.vue'
import EasemobChatCallKit from 'easemob-chat-callkit-vue3'

const app = createApp(App)
app.use(EasemobChatCallKit)
app.mount('#app')
```

## 📋 **API 参考**

### useCallKit()
```typescript
const {
  isInCall,     // 是否正在通话
  callType,     // 通话类型: 'audio' | 'video'
  targetUser,   // 目标用户ID
  startCall,    // 开始通话
  endCall,      // 结束通话
  startChat,    // 开始聊天
  callKitInstance // 原始实例
} = useCallKit()
```

### useCallKitProvider()
```typescript
const {
  appKey,       // 应用密钥
  userId,       // 用户ID
  debug,        // 调试模式
  enableRingtone, // 是否启用铃声
  resizable,    // 是否可调整大小
  draggable,    // 是否可拖拽
  validateConfig // 验证配置
} = useCallKitProvider()
```

## 🎯 **使用示例**

### 基本通话功能
```vue
<template>
  <div>
    <input v-model="userId" placeholder="输入用户ID" />
    <button @click="makeAudioCall">语音通话</button>
    <button @click="makeVideoCall">视频通话</button>
    <button @click="endCurrentCall" :disabled="!isInCall">结束通话</button>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useCallKit } from 'easemob-chat-callkit-vue3'

const userId = ref('')
const { startCall, endCall, isInCall } = useCallKit()

const makeAudioCall = () => {
  if (userId.value) {
    startCall(userId.value, 'audio')
  }
}

const makeVideoCall = () => {
  if (userId.value) {
    startCall(userId.value, 'video')
  }
}

const endCurrentCall = () => {
  endCall()
}
</script>
```

## 🎉 **优势**

1. **零配置引入** - 无需复杂的全局配置
2. **组合式API** - 符合Vue3最佳实践
3. **按需引入** - 只引入需要的功能
4. **类型安全** - 完整的TypeScript支持
5. **Provider模式** - 类似React的优雅集成方式