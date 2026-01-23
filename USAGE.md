# Easemob Chat CallKit Vue3 使用指南

`easemob-chat-callkit-vue3` 是基于 Vue 3 封装的音视频通话 UI 组件库，集成了环信 IM 信令与声网 RTC 能力。

## 📦 安装

首先，确保你的项目中已安装以下核心依赖：

```bash
pnpm add easemob-websdk agora-rtc-sdk-ng pinia
pnpm add easemob-chat-callkit-vue3
```

## 🚀 快速开始

### 1. 全局注册插件

在 `main.ts` 中引入样式并注册插件：

```typescript
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import EasemobChatCallKit from 'easemob-chat-callkit-vue3'
import 'easemob-chat-callkit-vue3/release/dist/easemob-chat-callkit-vue3.css'

const app = createApp(App)
app.use(createPinia())
app.use(EasemobChatCallKit)
app.mount('#app')
```

### 2. 配置 Provider

在应用的根组件（如 `App.vue`）中放置 `EasemobChatCallKitProvider`。它是所有通话组件的上下文管理器。

```vue
<template>
  <EasemobChatCallKitProvider 
    :chat-client="chatClient"
    :agora-app-id="'your_agora_app_id'"
    :init-config="{
      debug: true,
      enableRingtone: true
    }"
  >
    <router-view />
    <!-- 呼叫邀请弹窗 -->
    <InvitationNotification />
  </EasemobChatCallKitProvider>
</template>

<script setup>
import { EasemobChatCallKitProvider, InvitationNotification } from 'easemob-chat-callkit-vue3'
// chatClient 为 easemob-websdk 的 Connection 实例
</script>
```

## 🛠️ 核心功能用法

### 1. 发起通话 (API 方式)

推荐使用 `useCallKit` 组合式 API 来控制通话流程：

```vue
<script setup>
import { useCallKit } from 'easemob-chat-callkit-vue3'

const { startSingleCall, startGroupCall } = useCallKit()

// 发起单人通话
const handleSingleCall = async () => {
  await startSingleCall('userId_1', 'video', '我想和你视频通话')
}

// 发起群组通话
const handleGroupCall = async () => {
  await startGroupCall(
    'groupId_1', 
    ['userId_1', 'userId_2'], 
    'video', 
    '邀请加入群聊',
    '测试群组'
  )
}
</script>
```

### 2. 使用单人通话组件

如果你需要直接展示通话界面，可以使用 `EasemobChatSingleCall`：

```vue
<template>
  <EasemobChatSingleCall 
    target-user="friend_id"
    type="video"
    @call-ended="onCallEnd"
  />
</template>

<script setup>
import { EasemobChatSingleCall } from 'easemob-chat-callkit-vue3'

const onCallEnd = () => {
  console.log('通话已结束')
}
</script>
```

### 3. 使用多人通话组件

针对群组场景，可以使用 `EasemobChatMultiCall`：

```vue
<template>
  <EasemobChatMultiCall 
    :group-id="'groupId_1'"
    :participants="participants"
    :type="'video'"
    @call-ended="onCallEnd"
  />
</template>

<script setup>
import { EasemobChatMultiCall } from 'easemob-chat-callkit-vue3'

const participants = [
  { userId: 'userId_1', userName: '张三' },
  { userId: 'userId_2', userName: '李四' }
]

const onCallEnd = () => {
  console.log('群组通话已结束')
}
</script>
```

## 📋 API 参考

### ProviderConfig (EasemobChatCallKitProvider Props)
| 属性 | 类型 | 必填 | 描述 |
| :--- | :--- | :--- | :--- |
| chatClient | Connection | 是 | 环信 WebSDK 实例 |
| agoraAppId | string | 是 | 声网 App ID |
| initConfig | object | 否 | 通话配置（debug, enableRingtone 等） |

### useCallKit() 返回值
- `startSingleCall`: 发起 1v1 通话
- `startGroupCall`: 发起多人通话

### useEndCall() 返回值
- `hangup`: 挂断/取消通话

### useCallStateStore() (Pinia Store)
- `isInCall`: (Computed) 当前是否在通话中
- `CALL_STATUS`: 通话状态枚举
- `CALL_TYPE`: 通话类型枚举

### useAnswerCall() 
- `acceptCall`: 接受呼叫
- `rejectCall`: 拒绝呼叫
