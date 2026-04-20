---
name: easemob-callkit-integration
description: >
  Guide AI IDE to help users integrate the Easemob Chat CallKit Vue3 plugin correctly.
  Use this skill when a user wants to add audio/video call functionality to their Vue3 project.
  Covers: dependency installation, main.ts setup, Provider configuration, call initiation,
  and common integration errors.
---

# Easemob Chat CallKit Vue3 接入指南

## 前置条件

- Vue 3.x 项目
- 已集成环信 IM SDK (`easemob-websdk`) 并完成登录
- 已申请 Agora AppID

## Step 1: 安装依赖

```bash
# 必须安装（peer dependencies）
npm install agora-rtc-sdk-ng easemob-websdk

# 安装 callkit 本体
npm install easemob-chat-callkit-vue3
```

> **注意**：不需要安装 `pinia`。callkit 已将 pinia 打包在内部，通过 `app.use(EasemobChatCallKit)` 自动注入。

## Step 2: main.ts 注册插件

```ts
import { createApp } from 'vue'
import EasemobChatCallKit from 'easemob-chat-callkit-vue3'
import App from './App.vue'

// 必须导入样式
import 'easemob-chat-callkit-vue3/style.css'

const app = createApp(App)

// ⚠️ 必须调用 app.use()，否则 Pinia 未注入会导致 getActivePinia() 报错
app.use(EasemobChatCallKit)

app.mount('#app')
```

### ❌ 常见错误

| 错误 | 原因 | 修复 |
|------|------|------|
| `[🍍] getActivePinia() was called but there was no active Pinia` | 忘记 `app.use(EasemobChatCallKit)` | 补上 `app.use(EasemobChatCallKit)` |
| `Cannot find module 'pinia'` | 旧版本残留或试图手动安装 pinia | 移除 pinia 依赖，让 callkit 内部处理 |

## Step 3: App.vue 中使用 Provider

```vue
<template>
  <EasemobChatCallKitProvider
    :chat-client="chatClient"
    :agora-client="agoraClient"
    :init-config="{ inviteTimeout: 30000, logLevel: LogLevel.INFO }"
  >
    <!-- 通话邀请通知（被叫方弹窗） -->
    <InvitationNotification />

    <!-- 你的业务内容 -->
    <YourBusinessContent />

    <!-- 单人通话组件（autoShow，无需 v-if） -->
    <EasemobChatSingleCall
      :target-user="targetUserId"
      :type="singleCallType"
    />

    <!-- 群组通话组件（autoShow，无需 v-if） -->
    <EasemobChatMultiCall
      :group-id="groupId"
      :group-name="groupName"
      :group-avatar="groupAvatar"
      :type="multiCallType"
      :current-user-id="chatClient?.user"
    />
  </EasemobChatCallKitProvider>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import SDK from 'easemob-websdk'
import AgoraRTC from 'agora-rtc-sdk-ng'
import {
  LogLevel,
  useCallKit,
  EasemobChatCallKitProvider,
  InvitationNotification,
  EasemobChatSingleCall,
  EasemobChatMultiCall,
} from 'easemob-chat-callkit-vue3'

// 1. 创建 Agora 客户端（推荐外部传入，避免版本冲突）
const agoraClient = AgoraRTC.createClient({ mode: 'live', codec: 'h264' })

// 2. 初始化环信 IM 客户端
const chatClient = ref<any>()
onMounted(() => {
  const connection = new SDK.connection({
    appKey: 'your-app-key',
  })
  chatClient.value = connection
  // 然后调用 connection.open({ user, pwd }) 登录
})

// 3. 通话控制
const { call, groupCall, hangup } = useCallKit()

// 状态
const targetUserId = ref('')
const singleCallType = ref<'audio' | 'video'>('video')
const groupId = ref('')
const groupName = ref('')
const groupAvatar = ref('')
const multiCallType = ref<'audio' | 'video'>('video')

// 发起单人通话
async function startSingleCall(type: 'audio' | 'video') {
  await call({
    targetId: targetUserId.value,
    type,
    msg: '通话邀请',
    userInfo: {
      nickname: '我的昵称',
      avatarURL: 'https://example.com/avatar.png',
    },
  })
}

// 发起群组通话
async function startGroupCall(type: 'audio' | 'video') {
  await groupCall({
    groupId: groupId.value,
    members: ['user1', 'user2'],
    type,
    msg: '群组通话邀请',
    groupName: groupName.value || undefined,
    groupAvatar: groupAvatar.value || undefined,
    userInfo: {
      nickname: '我的昵称',
      avatarURL: 'https://example.com/avatar.png',
    },
  })
}
</script>
```

## Step 4: 可选 — 监听通话事件

```ts
import { useCallKitEvents, CALL_STATUS, CALL_TYPE } from 'easemob-chat-callkit-vue3'

const {
  onIncomingCall,    // 收到通话邀请
  onCallStarted,     // 通话接通
  onCallEnded,       // 通话结束
  onCallCanceled,    // 通话被取消
  onCallRefused,     // 通话被拒绝
  onCallTimeout,     // 邀请超时
  onCallBusy,        // 对方忙线
  onStatusChanged,   // 通话状态变化
} = useCallKitEvents()

onIncomingCall((e) => {
  console.log('收到通话邀请:', e.callerUserId, e.type)
})

onCallEnded((e) => {
  console.log('通话结束，原因:', e.reason, '时长:', e.duration, 'ms')
})
```

## 关键配置项说明

### `EasemobChatCallKitProvider` Props

| Prop | 类型 | 必填 | 说明 |
|------|------|------|------|
| `chatClient` | `Chat.Connection` | ✅ | 环信 IM 客户端实例（需已登录） |
| `agoraClient` | `IAgoraRTCClient` | ❌ | Agora 客户端实例。推荐传入，不传则内部创建 |
| `agoraAppId` | `string` | ❌ | **已废弃**，appId 从环信服务器动态获取 |
| `initConfig` | `object` | ❌ | 配置项，见下表 |
| `getUserInfo` | `function` | ❌ | 自定义用户资料查询（传入则覆盖默认） |
| `getGroupInfo` | `function` | ❌ | 自定义群组资料查询 |

### `initConfig` 选项

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `debug` | `boolean` | `false` | 开启调试模式（verbose 日志） |
| `logLevel` | `LogLevel` | — | 日志级别：0=ERROR, 1=WARN, 2=INFO, 3=DEBUG, 4=VERBOSE |
| `enableRingtone` | `boolean` | `true` | 来电铃声 |
| `resizable` | `boolean` | `true` | 通话窗口可调整大小 |
| `draggable` | `boolean` | `true` | 通话窗口可拖动 |
| `inviteTimeout` | `number` | `30000` | 邀请超时时间（毫秒） |

## 常见接入错误速查

| 现象 | 原因 | 修复 |
|------|------|------|
| `getActivePinia() was called but there was no active Pinia` | 忘记 `app.use(EasemobChatCallKit)` | main.ts 中补上 |
| `Cannot find module 'pinia'` | 项目残留 pinia 依赖或旧版本 callkit | 卸载 pinia，更新 callkit |
| 通话组件不显示 | 没有使用 `useCallKit().call()` 或 `groupCall()` 发起 | 确认调用了 call 方法 |
| 被叫方收不到邀请 | `chatClient` 未登录或未传入 Provider | 确保 IM 已登录且 chatClient 传入 Provider |
| 视频黑屏 | Agora 未正确初始化或 token 过期 | 检查 agoraClient 传入、检查 token 有效期 |

## 版本兼容性

- Vue: `^3.0.0`
- Agora RTC SDK: `^4.14.0`
- Easemob WebSDK: `^4.12.0`

> **Pinia 版本无关**：callkit 内部已打包 pinia，用户项目无需关心 pinia 版本。
