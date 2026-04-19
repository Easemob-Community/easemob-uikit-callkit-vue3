# Easemob Chat CallKit Vue3 使用指南

本文档面向**最终集成者**，介绍如何在 Vue 3 项目中使用 `easemob-chat-callkit-vue3` 的音视频通话能力。

> 关于**引入方式**的选择（npm 包 vs 源码 alias），参见 [`README.md`](./README.md)。

---

## 📋 前置条件

- Vue 3 项目
- 已安装并初始化 **Pinia**（CallKit 依赖 Pinia 做状态管理）
- 已安装 **环信 IM SDK**（`easemob-websdk`）并完成了登录
- 已安装 **声网 RTC SDK**（`agora-rtc-sdk-ng`）

```bash
pnpm add vue pinia easemob-websdk agora-rtc-sdk-ng
```

---

## 🏗️ 核心概念

### Provider — 通话上下文

`EasemobChatCallKitProvider` 是所有通话组件的**根上下文**。它负责：
- 接收环信 `chatClient` 实例
- 初始化 RTC 服务
- 挂载 IM 消息监听（信令监听）
- 管理全局配置（debug、铃声、超时等）

**必须在应用顶层包裹一次**，且内部放置通话相关组件。

```vue
<EasemobChatCallKitProvider :chat-client="chatClient" :init-config="initConfig">
  <!-- 你的应用内容 -->
  <InvitationNotification />
  <EasemobChatSingleCall />
</EasemobChatCallKitProvider>
```

### 自动显示/隐藏（推荐）

`EasemobChatSingleCall` 和 `EasemobChatMultiCall` 内部已经根据通话状态自动管理显示/隐藏：

- `EasemobChatSingleCall`：当 `callStateStore.status !== IDLE` 时自动显示
- `EasemobChatMultiCall`：`autoShow` 默认为 `true`，自动根据群聊通话状态显示

**你不再需要写 `v-if="showCall"`**，直接将组件放在 Provider 内部即可。

---

## 🚀 快速开始

### Step 1：全局注册 Pinia + 引入样式

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

### Step 2：在根组件中放置 Provider 和通话组件

```vue
<template>
  <EasemobChatCallKitProvider :chat-client="chatClient">
    <router-view />
    <InvitationNotification />
    <EasemobChatSingleCall />
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

// 你的环信 IM 实例
const chatClient = /* easemob-websdk Connection */
const groupId = /* 群组 ID */
</script>
```

### Step 3：在业务组件中发起通话

```vue
<template>
  <div>
    <input v-model="targetUserId" placeholder="输入用户ID" />
    <button @click="startAudioCall">语音通话</button>
    <button @click="startVideoCall">视频通话</button>
    <button @click="endCall">结束</button>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useCallKit, useEndCall } from 'easemob-chat-callkit-vue3'

const targetUserId = ref('')
const { startSingleCall } = useCallKit()
const { hangup } = useEndCall()

const startAudioCall = async () => {
  await startSingleCall(targetUserId.value, 'audio')
}

const startVideoCall = async () => {
  await startSingleCall(targetUserId.value, 'video')
}

const endCall = async () => {
  await hangup()
}
</script>
```

---

## 📦 组件 API

### EasemobChatCallKitProvider

| Prop | 类型 | 必填 | 说明 |
|------|------|------|------|
| `chatClient` | `Chat.Connection` | ✅ | 环信 IM 实例 |
| `agoraAppId` | `string` | ❌ | 声网 App ID（已废弃，实际从环信服务器动态获取） |
| `initConfig` | `object` | ❌ | 全局配置 |

#### initConfig

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `debug` | `boolean` | `false` | 开启调试日志 |
| `enableRingtone` | `boolean` | `true` | 开启呼叫铃声 |
| `draggable` | `boolean` | `true` | 通话窗口可拖拽 |
| `resizable` | `boolean` | `true` | 通话窗口可调整大小 |
| `inviteTimeout` | `number` | `30000` | 邀请超时时间（毫秒） |

### EasemobChatSingleCall

单人通话组件。内部自动根据 `callStateStore.status` 显示/隐藏。

| Prop | 类型 | 必填 | 说明 |
|------|------|------|------|
| `targetUser` | `string` | ❌ | 目标用户 ID（主叫方传入）。不传时自动从 `callStateStore` 推断 |
| `type` | `'audio' \| 'video'` | ❌ | 通话类型。不传时自动从 store 推断 |
| `backgroundImage` | `string` | ❌ | 自定义背景图 URL |
| `enableRingtone` | `boolean` | ❌ | 是否开启铃声 |

| 事件 | 说明 |
|------|------|
| `@callStarted` | 通话界面开始显示 |
| `@callEnded` | 通话结束（状态变为 IDLE） |
| `@callCanceled` | 呼叫被取消 |

### EasemobChatMultiCall

群组通话组件。

| Prop | 类型 | 必填 | 说明 |
|------|------|------|------|
| `groupId` | `string` | ✅ | 群组 ID |
| `groupName` | `string` | ❌ | 群组名称 |
| `groupAvatar` | `string` | ❌ | 群组头像 URL |
| `type` | `'audio' \| 'video'` | ❌ | 通话类型，默认 `'video'` |
| `currentUserId` | `string` | ❌ | 当前用户 ID |
| `autoShow` | `boolean` | ❌ | 是否自动显示/隐藏，默认 `true` |

| 事件 | 说明 |
|------|------|
| `@callStarted` | 通话开始 |
| `@callEnded` | 通话结束 |
| `@addParticipant` | 点击添加参与者按钮 |
| `@participantTimeout` | 某参与者邀请超时 |
| `@error` | 发生错误 |

### InvitationNotification

呼叫邀请通知组件。当被叫方收到通话邀请时自动弹出。

无需传入任何 Props，直接放置在 Provider 内部即可。

---

## 🔧 Composables API

### useCallKit()

发起通话的核心 API。

```typescript
const { startSingleCall, startGroupCall } = useCallKit()
```

#### startSingleCall(targetId, type, msg?)

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `targetId` | `string` | ✅ | 目标用户 ID |
| `type` | `'audio' \| 'video'` | ✅ | 通话类型 |
| `msg` | `string` | ❌ | 邀请消息内容。不传时自动生成默认文案 |

```typescript
// 最简调用
await startSingleCall('user123', 'video')

// 自定义邀请消息
await startSingleCall('user123', 'audio', '快来语音聊天')
```

#### startGroupCall(groupId, members, type, msg?, groupName?, groupAvatar?)

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `groupId` | `string` | ✅ | 群组 ID |
| `members` | `string[]` | ✅ | 被邀请成员列表 |
| `type` | `'audio' \| 'video'` | ✅ | 通话类型 |
| `msg` | `string` | ❌ | 邀请消息内容。不传时自动生成默认文案 |
| `groupName` | `string` | ❌ | 群组名称 |
| `groupAvatar` | `string` | ❌ | 群组头像 URL |

```typescript
await startGroupCall(
  'group123',
  ['user1', 'user2', 'user3'],
  'video',
  '邀请加入视频会议'
)
```

### useEndCall()

结束通话的 API。

```typescript
const { hangup, hangupCall, cancelCall, canHangup, canCancel } = useEndCall()
```

| 方法 | 说明 | 示例 |
|------|------|------|
| `hangup(reason?)` | 挂断当前通话。`reason` 可选，默认普通挂断 | `await hangup()` |
| `hangupCall()` | 普通挂断（等同于无参 `hangup`） | `await hangupCall()` |
| `cancelCall()` | 取消正在发起的呼叫 | `await cancelCall()` |
| `canHangup()` | 判断当前是否可以挂断 | `if (canHangup()) { ... }` |
| `canCancel()` | 判断当前是否可以取消呼叫 | `if (canCancel()) { ... }` |

### useAnswerCall()

被叫方应答通话的 API。

```typescript
const { acceptCall, rejectCall, busyRejectCall } = useAnswerCall()
```

| 方法 | 说明 |
|------|------|
| `acceptCall()` | 接受呼叫 |
| `rejectCall()` | 拒绝呼叫 |
| `busyRejectCall()` | 忙碌拒绝 |

> 通常由 `InvitationNotification` 组件内部自动调用，你不需要手动使用。

---

## 📊 Store API（进阶）

CallKit 内部使用 Pinia 管理状态。以下 Store 已暴露在库入口中，供高级场景使用：

```typescript
import {
  useCallStateStore,
  useRtcChannelStore,
  useGlobalCallStore,
  useSingleCallRtcStore,
  useCallTimerStore,
} from 'easemob-chat-callkit-vue3'
```

| Store | 用途 |
|-------|------|
| `useCallStateStore` | 通话状态（status、callId、channel、type 等） |
| `useRtcChannelStore` | RTC 频道状态（连接状态、本地/远程流、设备开关） |
| `useGlobalCallStore` | 跨域共享状态（userInfoMap、isMinimized） |
| `useSingleCallRtcStore` | 单聊 RTC 用户映射（uidToUserIdMap、joinedRtcUsers） |
| `useCallTimerStore` | 通话计时器（callDuration、formattedCallDuration） |

### 状态枚举

```typescript
import { CALL_STATUS, CALL_TYPE, HANGUP_REASON } from 'easemob-chat-callkit-vue3'

// CALL_STATUS: IDLE | INVITING | ALERTING | IN_CALL | ANSWER_CALL
// CALL_TYPE: AUDIO_1V1 | VIDEO_1V1 | AUDIO_MULTI | VIDEO_MULTI
// HANGUP_REASON: HANGUP | CANCEL | REMOTE_CANCEL | REMOTE_REFUSE | BUSY | ...
```

---

## 🎨 自定义配置

### 自定义背景图

```vue
<EasemobChatSingleCall 
  :background-image="'/my-bg.png'"
/>
```

### 自定义静态资源（离线环境）

默认情况下图标和背景图从 CDN 加载。如需离线使用：

1. 将 `lib/callkit-static-assets/` 目录复制到你的项目的 `public/` 目录下
2. 配置资源路径：

```typescript
import { getAssetUrl, DEFAULT_BACKGROUND_IMAGE } from 'easemob-chat-callkit-vue3'

// 使用本地路径
const localBg = getAssetUrl('/callkit-static-assets/images/callkit_bg.png', DEFAULT_BACKGROUND_IMAGE)
```

---

## ❓ 常见问题

### Q1：组件为什么不显示？

确保：
1. 已注册 Pinia（`app.use(createPinia())`）
2. `EasemobChatCallKitProvider` 已正确传入 `chatClient`
3. 组件已放置在 Provider 内部
4. 已调用 `startSingleCall` / `startGroupCall` 发起通话

### Q2：如何调试信令？

在 Provider 的 `initConfig` 中开启 `debug: true`：

```vue
<EasemobChatCallKitProvider 
  :chat-client="chatClient"
  :init-config="{ debug: true }"
>
```

开启后会在浏览器控制台输出详细的信令收发日志。

### Q3：Vite 热更新后通话状态丢失？

这是 Vite HMR 的已知行为。开发时建议：
- 使用源码模式（`pnpm run test:source`）
- 或在发起通话后避免修改正在使用的组件文件

### Q4：非 Vite 项目如何使用源码模式？

源码模式依赖 Vite 的 `resolve.alias` 能力。如果你使用 Webpack，需要在 `webpack.config.js` 中配置对应的 `resolve.alias`：

```javascript
module.exports = {
  resolve: {
    alias: {
      'easemob-chat-callkit-vue3': path.resolve(__dirname, '../easemob-chat-callkit-vue3/lib/index.ts'),
      'easemob-chat-callkit-vue3/style.css': path.resolve(__dirname, '../easemob-chat-callkit-vue3/lib/style.css'),
    }
  }
}
```

> ⚠️ Webpack 处理 `.ts` 和 `.vue` 文件需要额外配置 `ts-loader` 和 `vue-loader`。
