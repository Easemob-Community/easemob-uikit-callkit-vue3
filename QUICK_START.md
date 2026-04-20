# 快速开始

本文档帮助你在 **5 分钟内** 跑通 CallKit 的单人通话和群组通话。

> 完整 API 参考参见 [USAGE.md](./USAGE.md)。

---

## 前置条件

- Vue 3 项目
- 已安装并初始化 **Pinia**
- 已安装 **环信 IM SDK**（`easemob-websdk`）并完成登录
- 已安装 **声网 RTC SDK**（`agora-rtc-sdk-ng`）

```bash
pnpm add vue pinia easemob-websdk agora-rtc-sdk-ng
```

---

## 安装

```bash
# 从 npm 安装（发布后）
pnpm add easemob-chat-callkit-vue3

# 或从本地 tgz 文件安装
pnpm add ./easemob-chat-callkit-vue3-1.0.0.tgz
```

---

## Step 1：注册 Pinia + 引入样式

```typescript
// main.ts
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import 'easemob-chat-callkit-vue3/style.css'

const app = createApp(App)
app.use(createPinia())
app.mount('#app')
```

---

## Step 2：在根组件放置 Provider 和通话组件

```vue
<template>
  <EasemobChatCallKitProvider :chat-client="chatClient">
    <!-- 你的应用内容 -->
    <router-view />

    <!-- 通话邀请通知（被叫时自动弹出） -->
    <InvitationNotification />

    <!-- 单人通话组件（自动显示/隐藏） -->
    <EasemobChatSingleCall />

    <!-- 群组通话组件（自动显示/隐藏） -->
    <EasemobChatMultiCall :group-id="groupId" />
  </EasemobChatCallKitProvider>
</template>

<script setup>
import {
  EasemobChatCallKitProvider,
  InvitationNotification,
  EasemobChatSingleCall,
  EasemobChatMultiCall,
} from 'easemob-chat-callkit-vue3'

// 你的环信 IM Connection 实例
const chatClient = /* easemob-websdk Connection */
const groupId = /* 群组 ID */
</script>
```

---

## Step 3：发起/结束通话

```vue
<template>
  <div>
    <input v-model="targetUserId" placeholder="输入用户ID" />
    <button @click="startAudio">语音通话</button>
    <button @click="startVideo">视频通话</button>
    <button @click="endCall">结束通话</button>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useCallKit } from 'easemob-chat-callkit-vue3'

const targetUserId = ref('')
const { call, groupCall, hangup } = useCallKit()

// ─── 单人通话 ───
const startAudio = async () => {
  await call({ targetId: targetUserId.value, type: 'audio' })
}

const startVideo = async () => {
  await call({ targetId: targetUserId.value, type: 'video' })
}

// 带自定义昵称头像（被叫方弹窗会直接显示）
const startVideoWithProfile = async () => {
  await call({
    targetId: targetUserId.value,
    type: 'video',
    userInfo: {
      nickname: '张三',
      avatarURL: 'https://example.com/avatar.png'
    }
  })
}

// ─── 群组通话 ───
const startGroupCall = async () => {
  await groupCall({
    groupId: 'group001',
    members: ['user1', 'user2'],
    type: 'video',
    groupName: '产品组',
    userInfo: {
      nickname: '张三',
      avatarURL: 'https://example.com/avatar.png'
    }
  })
}

const endCall = async () => {
  await hangup()
}
</script>
```

> ✅ 就这么简单。`EasemobChatSingleCall` 会根据通话状态自动显示/隐藏，不需要写 `v-if`。

---

## 下一步

- **事件监听**：通话结束后发送系统消息、记录时长 → 参见 [USAGE.md#usecallkitevents](./USAGE.md#usecallkitevents)
- **进阶配置**：日志级别、自定义背景图、离线静态资源 → 参见 [USAGE.md#进阶用法](./USAGE.md#进阶用法)
- **类型导出**：`CallParams`、`GroupCallParams`、`HANGUP_REASON` 等 → 参见 [USAGE.md#类型与常量](./USAGE.md#类型与常量)
