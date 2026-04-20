# Easemob Chat CallKit Vue3 — API 参考

本文档提供完整的 API 参考，涵盖所有组件、Composables、Store、类型和常量。

> 关于**安装和快速开始**，参见 [`README.md`](./README.md)。

---

## 📦 导出清单

```typescript
import {
  // 组件
  EasemobChatCallKitProvider,
  EasemobChatSingleCall,
  EasemobChatMultiCall,
  InvitationNotification,
  EasemobChatMiniWindow,
  GroupCallShell,

  // Composables
  useCallKit,
  useCallKitEvents,
  useRtcService,
  useJoinChannel,
  useParticipants,
  useDraggable,
  useCenteredDraggable,
  useCornerDraggable,

  // 日志
  LogLevel,

  // Store
  useCallStateStore,
  useRtcChannelStore,
  useGlobalCallStore,
  useSingleCallRtcStore,
  useCallTimerStore,

  // 服务 & 工具
  RtcService,
  DEFAULT_BACKGROUND_IMAGE,
  ICONS,
  getAssetUrl,

  // 常量
  CALL_STATUS,
  CALL_TYPE,
  HANGUP_REASON,
} from 'easemob-chat-callkit-vue3'
```

---

## 🧩 组件 API

### EasemobChatCallKitProvider

通话根上下文组件。**必须在应用顶层包裹一次**。

```vue
<EasemobChatCallKitProvider
  :chat-client="chatClient"
  :agora-app-id="agoraAppId"
  :init-config="initConfig"
>
  <slot />
</EasemobChatCallKitProvider>
```

#### Props

| Prop | 类型 | 必填 | 说明 |
|------|------|------|------|
| `chatClient` | `Chat.Connection` | ✅ | 环信 IM 实例。传入后 Provider 自动保存到 `chatClientStore`，并挂载消息监听器 |
| `agoraAppId` | `string` | ❌ | 声网 App ID。**已废弃**，实际从环信服务器动态获取，仅作向后兼容 |
| `initConfig` | `object` | ❌ | 全局配置，见下表 |

#### initConfig

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `debug` | `boolean` | `false` | 开启调试日志（等价于 `logLevel: LogLevel.VERBOSE`） |
| `logLevel` | `LogLevel` | `LogLevel.ERROR` | 日志输出级别。`0=ERROR, 1=WARN, 2=INFO, 3=DEBUG, 4=VERBOSE`。优先级高于 `debug` |
| `enableRingtone` | `boolean` | `true` | 开启呼叫铃声 |
| `draggable` | `boolean` | `true` | 通话窗口可拖拽 |
| `resizable` | `boolean` | `true` | 通话窗口可调整大小 |
| `inviteTimeout` | `number` | `30000` | 邀请超时时间（毫秒） |

---

### EasemobChatSingleCall

单人通话组件。自动根据 `callStateStore.status` 显示/隐藏。

```vue
<EasemobChatSingleCall
  :target-user="targetUserId"
  :type="'video'"
  :background-image="'/my-bg.png'"
  @call-started="onStart"
  @call-ended="onEnd"
  @call-canceled="onCancel"
/>
```

#### Props

| Prop | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `targetUser` | `string` | — | 目标用户 ID。不传时自动从 `callStateStore` 推断 |
| `type` | `'audio' \| 'video'` | — | 通话类型。不传时自动从 store 推断 |
| `backgroundImage` | `string` | CDN 默认图 | 自定义背景图 URL。离线场景可传本地路径如 `'/callkit-static-assets/images/callkit_bg.png'` |
| `enableRingtone` | `boolean` | `true` | 是否开启铃声 |

#### Events

| 事件 | 说明 |
|------|------|
| `@callStarted` | 通话界面开始显示 |
| `@callEnded` | 通话结束（状态变为 `IDLE`） |
| `@callCanceled` | 呼叫被取消 |

#### 显示规则

| 状态 | 是否显示 | 说明 |
|------|---------|------|
| `IDLE` | ❌ | 无通话 |
| `INVITING` | ✅ | 主叫等待中，显示 `CallWaiting` |
| `ALERTING` | ❌ | 被叫响铃中，由 `InvitationNotification` 接管 |
| `ANSWER_CALL` / `CONFIRM_CALLEE` | ✅ | 接听过渡态，显示 `CallStream` |
| `IN_CALL` | ✅ | 通话中，显示 `CallStream` |

---

### EasemobChatMultiCall

群组通话组件。自动根据群组通话状态显示/隐藏。

```vue
<EasemobChatMultiCall
  :group-id="groupId"
  :group-name="groupName"
  :group-avatar="groupAvatar"
  :type="'video'"
  :current-user-id="currentUserId"
  :auto-show="true"
  @call-started="onStart"
  @call-ended="onEnd"
  @add-participant="onAdd"
  @participant-timeout="onTimeout"
  @error="onError"
/>
```

#### Props

| Prop | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `groupId` | `string` | `''` | 群组 ID |
| `groupName` | `string` | `''` | 群组名称 |
| `groupAvatar` | `string` | `''` | 群组头像 URL |
| `type` | `'audio' \| 'video'` | `'video'` | 通话类型 |
| `currentUserId` | `string` | `''` | 当前用户 ID。不传时自动从 `chatClientStore` 获取 |
| `autoShow` | `boolean` | `true` | 是否根据通话状态自动显示/隐藏。设为 `false` 时可完全由外部 `v-if` 控制 |

#### Events

| 事件 | 参数 | 说明 |
|------|------|------|
| `@callStarted` | — | 通话开始 |
| `@callEnded` | — | 通话结束 |
| `@addParticipant` | — | 点击添加参与者按钮 |
| `@participantTimeout` | `userId: string` | 某参与者邀请超时 |
| `@error` | `error: Error` | 发生错误 |

---

### InvitationNotification

通话邀请通知组件。被叫方收到邀请时自动弹出接听/拒绝弹窗。

```vue
<InvitationNotification />
```

无需传入任何 Props，直接放置在 Provider 内部即可。

---

### EasemobChatMiniWindow

最小化通话窗口组件。通常由 `EasemobChatSingleCall` 内部自动使用，也可单独使用。

```vue
<EasemobChatMiniWindow
  @expand="onExpand"
  @close="onClose"
/>
```

#### Events

| 事件 | 说明 |
|------|------|
| `@expand` | 点击展开按钮 |
| `@close` | 点击关闭按钮 |

---

### GroupCallShell

群组通话壳组件，包含视频网格、控制栏、添加成员弹窗等。

```vue
<GroupCallShell
  :group-id="groupId"
  :group-name="groupName"
  :current-user-id="currentUserId"
  :current-nickname="nickname"
  :current-avatar-url="avatar"
  :rtc-service="rtcService"
  @hangup="onHangup"
  @add-participant="onAdd"
/>
```

#### Props

| Prop | 类型 | 必填 | 说明 |
|------|------|------|------|
| `groupId` | `string` | ✅ | 群组 ID |
| `groupName` | `string` | ❌ | 群组名称 |
| `currentUserId` | `string` | ✅ | 当前用户 ID |
| `currentNickname` | `string` | ❌ | 当前用户昵称 |
| `currentAvatarUrl` | `string` | ❌ | 当前用户头像 URL |
| `rtcService` | `RtcService \| null` | ❌ | RTC 服务实例 |

#### Events

| 事件 | 说明 |
|------|------|
| `@hangup` | 点击挂断按钮 |
| `@addParticipant` | 点击添加参与者按钮 |

#### Expose

通过 `ref` 可调用以下方法：

| 方法 | 参数 | 说明 |
|------|------|------|
| `startSession` | `{ sessionId, callType }` | 启动会话（幂等，重复调用安全） |
| `addRemoteParticipant` | `userId, nickname?, avatar?` | 添加远程参与者 |
| `markRemoteAccepted` | `userId` | 标记远程用户已接受 |
| `bindRtcService` | `RtcService` | 绑定 RTC 服务 |
| `unbindRtcService` | — | 解绑 RTC 服务 |
| `sendInvite` | `userIds, groupId, message` | 发送邀请 |

---

## 🔧 Composables API

### useCallKit()

**统一的通话控制入口**。一个 hook 覆盖发起、接听、挂断、拒绝全部动作。

```typescript
const {
  call,        // 发起单人通话
  groupCall,   // 发起群组通话
  hangup,      // 挂断/结束通话
  cancel,      // 取消通话邀请
  accept,      // 接听通话
  reject,      // 拒绝通话
  rejectBusy,  // 忙碌拒绝
} = useCallKit()
```

#### call(params)

发起单人通话。

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `params.targetId` | `string` | ✅ | 目标用户 ID |
| `params.type` | `'audio' \| 'video'` | ✅ | 通话类型 |
| `params.msg` | `string` | ❌ | 邀请消息。不传时默认：`"邀请您进行语音通话"` / `"邀请您进行视频通话"` |
| `params.userInfo` | `{ nickname?: string; avatarURL?: string }` | ❌ | 主叫方头像昵称。传入后优先写入 invite 消息扩展字段，被叫方可直接显示 |

```typescript
await call({ targetId: 'user123', type: 'video' })
await call({ targetId: 'user123', type: 'audio', msg: '快来语音聊天' })
await call({
  targetId: 'user123',
  type: 'video',
  userInfo: { nickname: '张三', avatarURL: 'https://example.com/avatar.png' }
})
```

#### groupCall(params)

发起群组通话。

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `params.groupId` | `string` | ✅ | 群组 ID |
| `params.members` | `string[]` | ✅ | 被邀请成员列表 |
| `params.type` | `'audio' \| 'video'` | ✅ | 通话类型 |
| `params.msg` | `string` | ❌ | 邀请消息 |
| `params.groupName` | `string` | ❌ | 群组名称 |
| `params.groupAvatar` | `string` | ❌ | 群组头像 URL |
| `params.userInfo` | `{ nickname?: string; avatarURL?: string }` | ❌ | 主叫方头像昵称 |

```typescript
await groupCall({
  groupId: 'group123',
  members: ['user1', 'user2', 'user3'],
  type: 'video',
  msg: '邀请加入视频会议'
})

await groupCall({
  groupId: 'group123',
  members: ['user1', 'user2'],
  type: 'video',
  groupName: '产品组',
  userInfo: { nickname: '张三', avatarURL: 'https://example.com/avatar.png' }
})
```

#### hangup(reason?)

挂断当前通话。

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `reason` | `HANGUP_REASON` | ❌ | 挂断原因，默认 `HANGUP_REASON.HANGUP` |

```typescript
await hangup()
await hangup(HANGUP_REASON.CANCEL)
```

#### cancel()

取消正在发起的呼叫（等同于 `hangup(HANGUP_REASON.CANCEL)`）。

```typescript
await cancel()
```

#### accept()

被叫方接听通话。内部会检查当前状态是否为 `ALERTING`，并发送 `answerCall` 信令。

```typescript
await accept()
```

#### reject()

被叫方拒绝通话。发送 `answerCall(refuse)` 信令并重置通话状态。

```typescript
await reject()
```

#### rejectBusy()

被叫方忙碌拒绝。发送 `answerCall(busy)` 信令并重置通话状态。

```typescript
await rejectBusy()
```

---

### useCallKitEvents()

**通话生命周期事件订阅**。用于监听通话全生命周期中的关键事件，如通话开始、结束、收到邀请、超时等。所有订阅方法都返回**解绑函数**，建议在 `onUnmounted` 中调用。

```typescript
const {
  // 通用 API
  on, once, off,
  // 语义化便捷方法
  onCallStarted,
  onCallEnded,
  onIncomingCall,
  onCallCanceled,
  onCallRefused,
  onCallTimeout,
  onCallBusy,
  onParticipantJoined,
  onParticipantLeft,
  onStatusChanged,
} = useCallKitEvents()
```

#### 使用示例

```typescript
import { useCallKitEvents, LogLevel } from 'easemob-chat-callkit-vue3'
import { onUnmounted } from 'vue'

const { onCallStarted, onCallEnded, onIncomingCall, onCallCanceled } = useCallKitEvents()

// 通话接通
const unbindStarted = onCallStarted((e) => {
  console.log('通话开始', e.callId, e.channel, 'isCaller:', e.isCaller)
})

// 通话结束（核心：可在此发送系统消息、记录通话时长）
const unbindEnded = onCallEnded((e) => {
  const durationSec = Math.round(e.duration / 1000)
  console.log('通话结束', '原因:', e.reason, '时长:', durationSec, '秒')
  // 示例：发送一条系统消息到聊天会话
  // sendSystemMessage(`通话结束，时长 ${durationSec} 秒`)
})

// 收到来电邀请
const unbindIncoming = onIncomingCall((e) => {
  console.log('收到来自', e.callerUserId, '的通话邀请')
})

// 通话被取消
const unbindCanceled = onCallCanceled((e) => {
  console.log(e.isRemote ? '对方取消了通话' : '本地取消了通话')
})

// 组件卸载时解绑，防止内存泄漏
onUnmounted(() => {
  unbindStarted()
  unbindEnded()
  unbindIncoming()
  unbindCanceled()
})
```

#### 事件列表

| 便捷方法 | 事件名 | 触发时机 | Payload 关键字段 |
|----------|--------|----------|-----------------|
| `onStatusChanged` | `statusChanged` | 每次通话状态变化 | `from`, `to`, `callInfo` |
| `onIncomingCall` | `incomingCall` | 收到通话邀请（文本消息） | `callerUserId`, `callerDevId`, `type` |
| `onCallStarted` | `callStarted` | 双方/多方接通进入 `IN_CALL` | `isCaller`, `callId`, `channel`, `type` |
| `onCallEnded` | `callEnded` | 通话结束，状态重置为 `IDLE` | `reason`, `duration`（毫秒） |
| `onCallCanceled` | `callCanceled` | 通话被取消 | `isRemote` |
| `onCallRefused` | `callRefused` | 通话被拒绝 | `isRemote` |
| `onCallTimeout` | `callTimeout` | 通话邀请超时 | — |
| `onCallBusy` | `callBusy` | 对方忙线 | — |
| `onParticipantJoined` | `participantJoined` | 群通话成员接受并加入 | `userId` |
| `onParticipantLeft` | `participantLeft` | 群通话成员离开 | `userId`, `reason` |

#### 通用 API

如果需要更灵活的控制，可直接使用 `on` / `once` / `off`：

```typescript
const { on, once, off } = useCallKitEvents()

// 持续监听
const unbind = on('callEnded', (e) => { ... })

// 只监听一次
once('callStarted', (e) => { ... })

// 手动解绑
off('callEnded', handler)
```

> **注意**：`callEnded` 事件在 `CallService.resetState()` 中触发，此时通话状态还未完全重置为 `IDLE`，但 `duration` 已经计算完成。`reason` 字段为 `HANGUP_REASON` 枚举值。

---

### useRtcService()

获取并管理 RTC 服务实例。

```typescript
const { rtcService, isReady, init, destroy } = useRtcService()
```

> 通常由 `EasemobChatCallKitProvider` 内部自动初始化，不需要手动调用。

---

### useJoinChannel()

加入/离开 RTC 频道。

```typescript
const { joinChannel, leaveChannel } = useJoinChannel()
```

---

### useParticipants(currentUserId?)

**已废弃**。旧架构的参与者列表生成器。群组通话请使用 `GroupCallStore` 的 `participantList`。

```typescript
const { participants } = useParticipants()
```

---

### useDraggable(options)

拖拽定位 composable。用于实现通话窗口的拖拽居中/角落定位。

```typescript
const {
  elementRef,
  isDragging,
  hasDragged,
  style,
  startDrag,
} = useDraggable({
  centered: true,   // 初始居中
  width: 360,
  height: 640,
  boundary: true,   // 限制在视口内
  boundaryPadding: 20,
})
```

#### 便捷别名

```typescript
// 居中 + 边界
const { elementRef, style, startDrag } = useCenteredDraggable({ width, height })

// 角落定位
const { elementRef, style, startDrag } = useCornerDraggable({
  corner: 'bottom-right',
  offsetX: 20,
  offsetY: 20,
})
```

---

## 📊 Store API

CallKit 内部使用 Pinia 管理状态。以下 Store 已暴露在库入口中，供高级场景使用。

### useCallStateStore

核心通话状态 store。管理呼叫状态、通话双方信息、超时计时器等。

```typescript
const store = useCallStateStore()
```

#### State

| 字段 | 类型 | 说明 |
|------|------|------|
| `status` | `CALL_STATUS` | 当前通话状态 |
| `callId` | `string` | 通话唯一 ID |
| `channel` | `string` | RTC 频道名 |
| `token` | `string` | RTC Token |
| `type` | `CALL_TYPE` | 通话类型 |
| `callerDevId` | `string` | 主叫方设备 ID |
| `calleeDevId` | `string` | 被叫方设备 ID |
| `callerUserId` | `string` | 主叫方用户 ID |
| `calleeUserId` | `string` | 被叫方用户 ID |
| `inviteMessageId` | `string` | 邀请消息 ID |
| `duration` | `string` | 通话时长 |
| `inviteTimeout` | `number` | 邀请超时时间（毫秒） |
| `inviteTimeoutTimer` | `number \| null` | 超时定时器 ID |

#### Getters

| Getter | 返回类型 | 说明 |
|--------|---------|------|
| `getCallStatus` | `CALL_STATUS` | 当前状态 |
| `getCallState` | `CallState` | 完整状态对象 |
| `getInviteTimeoutTimer` | `number \| null` | 超时定时器 ID |
| `isInviting` | `boolean` | 是否处于 `INVITING` |
| `isInCall` | `boolean` | 是否不是 `IDLE` |

#### Actions

| Action | 参数 | 说明 |
|--------|------|------|
| `initCallState(chatClient)` | `Chat.Connection` | 用 chatClient 初始化 callerDevId / callerUserId / token |
| `initInviteInfo(inviteInfo)` | `{ type, calleeUserId }` | 初始化邀请信息，状态变为 `INVITING` |
| `setCallStatus(status)` | `CALL_STATUS` | 设置通话状态 |
| `updateCallState(partial)` | `Partial<CallState>` | 批量更新状态字段 |
| `resetCallState()` | — | 重置所有状态为默认值 |
| `clearTimeoutTimer()` | — | 清除超时定时器 |
| `startTimeoutTimer(callback?)` | `() => void` | 启动超时定时器 |

---

### useRtcChannelStore

RTC 频道状态 store。管理 RTC 连接、本地/远程媒体流、频道列表等。

```typescript
const store = useRtcChannelStore()
```

#### State

| 字段 | 类型 | 说明 |
|------|------|------|
| `channels` | `Record<string, RtcChannelInfo>` | 频道列表 |
| `activeChannelId` | `string \| null` | 当前活跃频道 ID |
| `isConnected` | `boolean` | 是否已连接 RTC |
| `localStream` | `MediaStream \| null` | 本地媒体流 |
| `remoteStreams` | `Record<string, MediaStream>` | 远程用户媒体流映射 |
| `audioEnabled` | `boolean` | 音频是否开启 |
| `videoEnabled` | `boolean` | 视频是否开启 |
| `agoraAppId` | `string \| null` | Agora App ID |

#### Getters

| Getter | 返回类型 | 说明 |
|--------|---------|------|
| `activeChannel` | `RtcChannelInfo \| null` | 当前活跃频道 |
| `activeChannelParticipantCount` | `number` | 当前频道参与者数量 |
| `channelIds` | `string[]` | 所有频道 ID 列表 |

#### Actions

| Action | 参数 | 说明 |
|--------|------|------|
| `getRtcService()` | — | 获取 `RtcService` 实例（模块级变量） |
| `initializeRtcService(appId)` | `string` | 初始化 RTC 服务 |
| `destroyRtcService()` | — | 销毁 RTC 服务 |
| `createChannel(channelId, callId, isGroup?)` | `string, string, boolean` | 创建频道记录 |
| `setActiveChannel(channelId)` | `string \| null` | 设置活跃频道 |
| `joinChannel(channelId, userId)` | `string, string` | 记录用户加入频道 |
| `leaveChannel(channelId, userId)` | `string, string` | 记录用户离开频道 |
| `setLocalStream(stream)` | `MediaStream \| null` | 设置本地流 |
| `addRemoteStream(userId, stream)` | `string, MediaStream` | 添加远程流 |
| `removeRemoteStream(userId)` | `string` | 移除远程流 |
| `setAudioEnabled(enabled)` | `boolean` | 设置音频开关 |
| `setVideoEnabled(enabled)` | `boolean` | 设置视频开关 |
| `reset()` | — | 重置所有 RTC 状态 |

---

### useGlobalCallStore

跨通话域的共享状态。管理用户资料映射、窗口最小化状态等。

```typescript
const store = useGlobalCallStore()
```

#### State

| 字段 | 类型 | 说明 |
|------|------|------|
| `userInfoMap` | `Map<string, { nickname?, avatarURL? }>` | 用户资料映射 |
| `isMinimized` | `boolean` | 通话窗口是否最小化 |

#### Actions

| Action | 参数 | 说明 |
|--------|------|------|
| `setUserInfo(userId, userInfo)` | `string, { nickname?, avatarURL? }` | 设置用户资料 |
| `setMinimized(value)` | `boolean` | 设置最小化状态 |

#### Getters

| Getter | 返回类型 | 说明 |
|--------|---------|------|
| `getUserInfo(userId)` | `{ nickname?, avatarURL? }` | 获取用户资料 |
| `getIsMinimized` | `boolean` | 是否最小化 |

---

### useSingleCallRtcStore

单聊 RTC 用户状态管理。负责一对一通话中的 RTC 用户映射和生命周期。

> 群聊场景使用 `GroupCallStore`，不使用本 store。

```typescript
const store = useSingleCallRtcStore()
```

#### State

| 字段 | 类型 | 说明 |
|------|------|------|
| `uidToUserIdMap` | `Map<string, string>` | Agora UID → userId 映射 |
| `joinedRtcUsers` | `Set<string>` | 已加入 RTC 的用户集合 |
| `pendingUserIds` | `Set<string>` | 待加入 RTC 的用户集合 |
| `leftUsers` | `Set<string>` | 已明确离开的用户集合 |

#### Actions

| Action | 参数 | 说明 |
|--------|------|------|
| `setUidToUserIdMapping(uid, userId)` | `string, string` | 添加 UID 映射 |
| `getUserIdByUid(uid)` | `string` | 根据 UID 获取 userId |
| `markUserJoinedRtc(userId)` | `string` | 标记用户已加入 RTC |
| `markUserLeftRtc(userId)` | `string` | 标记用户已离开 RTC |
| `isUserInRtc(userId)` | `string` | 检查用户是否在 RTC 中 |
| `hasUserLeft(userId)` | `string` | 检查用户是否已明确离开 |
| `clearLeftUsers()` | — | 清空离开列表 |
| `addPendingUserId(userId)` | `string` | 添加待加入用户 |
| `removePendingUserId(userId)` | `string` | 移除待加入用户 |
| `popPendingUserId()` | — | 取出第一个待加入用户 |
| `reset()` | — | 重置所有状态 |

---

### useCallTimerStore

通话计时器。管理一对一通话的时长计时和格式化显示。

```typescript
const store = useCallTimerStore()
```

#### State

| 字段 | 类型 | 说明 |
|------|------|------|
| `callDuration` | `number` | 通话时长（秒） |
| `callStartTime` | `number` | 计时开始时间戳 |

#### Getters

| Getter | 返回类型 | 说明 |
|--------|---------|------|
| `formattedCallDuration` | `string` | 格式化时长，如 `"05:32"` 或 `"01:05:32"` |

#### Actions

| Action | 说明 |
|--------|------|
| `startCallTimer()` | 开始计时 |
| `stopCallTimer()` | 停止计时并清零 |
| `reset()` | 重置（同 `stopCallTimer`） |

---

### useChatClientStore

环信客户端实例管理。由 `EasemobChatCallKitProvider` 自动设置。

```typescript
const store = useChatClientStore()
```

#### State

| 字段 | 类型 | 说明 |
|------|------|------|
| `client` | `Chat.Connection \| null` | 环信 IM 实例 |

#### Actions

| Action | 参数 | 说明 |
|--------|------|------|
| `setClient(client)` | `Chat.Connection` | 设置实例，同时初始化 `callStateStore` |

#### Getters

| Getter | 返回类型 | 说明 |
|--------|---------|------|
| `getChatClient` | `Chat.Connection \| null` | 获取实例 |
| `getClientDeviceId` | `string \| undefined` | 获取设备 ID |

---

## 🔢 类型与常量

### CALL_STATUS

```typescript
import { CALL_STATUS } from 'easemob-chat-callkit-vue3'

CALL_STATUS.IDLE              // 0  空闲
CALL_STATUS.INVITING          // 1  主叫邀请中
CALL_STATUS.ALERTING          // 2  被叫响铃中
CALL_STATUS.CONFIRM_RING      // 3  响铃确认
CALL_STATUS.RECEIVED_CONFIRM_RING // 4  收到响铃确认
CALL_STATUS.ANSWER_CALL       // 5  已应答（发送 answerCall 后）
CALL_STATUS.CONFIRM_CALLEE    // 6  被叫确认
CALL_STATUS.IN_CALL           // 7  通话中
```

### CALL_TYPE

```typescript
import { CALL_TYPE } from 'easemob-chat-callkit-vue3'

CALL_TYPE.AUDIO_1V1   // 0  一对一语音
CALL_TYPE.VIDEO_1V1   // 1  一对一视频
CALL_TYPE.VIDEO_MULTI // 2  多人视频
CALL_TYPE.AUDIO_MULTI // 3  多人语音
```

### HANGUP_REASON

```typescript
import { HANGUP_REASON } from 'easemob-chat-callkit-vue3'

HANGUP_REASON.HANGUP               // 正常挂断
HANGUP_REASON.CANCEL               // 取消呼叫
HANGUP_REASON.REMOTE_CANCEL        // 对方取消
HANGUP_REASON.REFUSE               // 拒绝
HANGUP_REASON.REMOTE_REFUSE        // 对方拒绝
HANGUP_REASON.BUSY                 // 忙碌
HANGUP_REASON.NO_RESPONSE          // 无响应（超时）
HANGUP_REASON.REMOTE_NO_RESPONSE   // 对方无响应
HANGUP_REASON.HANDLE_ON_OTHER_DEVICE // 在其他设备处理
HANGUP_REASON.ABNORMAL_END         // 异常结束
```

---

## 🎨 进阶用法

### 自定义背景图

```vue
<EasemobChatSingleCall :background-image="'/my-bg.png'" />
```

### 离线静态资源

默认图标和背景图从 CDN 加载。如需离线使用：

1. 将 `lib/callkit-static-assets/` 复制到你项目的 `public/` 目录下
2. 使用本地路径：

```typescript
import { getAssetUrl, DEFAULT_BACKGROUND_IMAGE } from 'easemob-chat-callkit-vue3'

const localBg = getAssetUrl(
  '/callkit-static-assets/images/callkit_bg.png',
  DEFAULT_BACKGROUND_IMAGE
)
```

### 设置用户资料（头像/昵称）

```typescript
import { useGlobalCallStore } from 'easemob-chat-callkit-vue3'

const globalStore = useGlobalCallStore()
globalStore.setUserInfo('user123', {
  nickname: '张三',
  avatarURL: 'https://example.com/avatar.png'
})
```

### 日志级别配置

CallKit 内置了 5 级日志系统，可通过 `initConfig.logLevel` 精确控制输出级别：

```typescript
import { LogLevel } from 'easemob-chat-callkit-vue3'

// 只输出错误
const initConfig = { logLevel: LogLevel.ERROR }

// 输出错误 + 警告
const initConfig = { logLevel: LogLevel.WARN }

// 输出到 INFO（推荐生产环境）
const initConfig = { logLevel: LogLevel.INFO }

// 输出完整调试信息（开发环境）
const initConfig = { logLevel: LogLevel.DEBUG }

// 或等价于 { debug: true }
const initConfig = { logLevel: LogLevel.VERBOSE }
```

| 级别 | 值 | 输出内容 |
|------|-----|---------|
| `ERROR` | 0 | 错误日志 |
| `WARN` | 1 | 警告 + 错误 |
| `INFO` | 2 | 信息 + 警告 + 错误 |
| `DEBUG` | 3 | 调试 + 信息 + 警告 + 错误 |
| `VERBOSE` | 4 | 全部（包括详细信令日志） |

> `logLevel` 优先级高于 `debug`。若同时设置，`logLevel` 生效。

---

### 调试信令

在 Provider 的 `initConfig` 中开启 `debug: true` 或 `logLevel: LogLevel.VERBOSE`：

```vue
<EasemobChatCallKitProvider
  :chat-client="chatClient"
  :init-config="{ logLevel: LogLevel.DEBUG }"
>
```

开启后浏览器控制台会输出完整的信令收发日志，格式为：

```
[Vue3 CallKit] [2026-04-19T10:16:13.846Z] [INFO] ...
```

---

## 📡 事件类型参考

### CallKitEventType

```typescript
import type { CallKitEventType } from 'easemob-chat-callkit-vue3'

type CallKitEventType =
  | 'statusChanged'      // 通话状态变化
  | 'incomingCall'       // 收到来电邀请
  | 'callStarted'        // 通话接通
  | 'callEnded'          // 通话结束
  | 'callCanceled'       // 通话取消
  | 'callRefused'        // 通话拒绝
  | 'callTimeout'        // 邀请超时
  | 'callBusy'           // 对方忙线
  | 'participantJoined'  // 群通话成员加入
  | 'participantLeft'    // 群通话成员离开
```

### 事件 Payload 结构

| 事件 | Payload 接口 | 关键字段 |
|------|-------------|---------|
| `statusChanged` | `StatusChangedEvent` | `from`, `to`, `callId`, `channel`, `type`, `callerUserId` |
| `incomingCall` | `IncomingCallEvent` | `callerUserId`, `callerDevId`, `calleeUserId`, `groupId`, `groupName`, `invitedMembers` |
| `callStarted` | `CallStartedEvent` | `isCaller`, `callId`, `channel`, `type`, `callerUserId`, `calleeUserId`, `groupId` |
| `callEnded` | `CallEndedEvent` | `reason`, `duration`（毫秒）, `callId`, `channel`, `type` |
| `callCanceled` | `CallCanceledEvent` | `isRemote`, `callId`, `channel`, `type` |
| `callRefused` | `CallRefusedEvent` | `isRemote`, `callId`, `channel`, `type` |
| `callTimeout` | `CallTimeoutEvent` | `callId`, `channel`, `type`, `callerUserId`, `calleeUserId` |
| `callBusy` | `CallBusyEvent` | `callId`, `channel`, `type`, `callerUserId`, `calleeUserId` |
| `participantJoined` | `ParticipantJoinedEvent` | `userId`, `callId`, `channel`, `groupId` |
| `participantLeft` | `ParticipantLeftEvent` | `userId`, `callId`, `channel`, `groupId`, `reason` |

### 使用场景：通话结束后发送系统消息

```typescript
const { onCallEnded } = useCallKitEvents()

onCallEnded((e) => {
  const durationSec = Math.round(e.duration / 1000)
  const minutes = Math.floor(durationSec / 60)
  const seconds = durationSec % 60
  const durationText = `${minutes}分${seconds}秒`

  const text = e.reason === HANGUP_REASON.HANGUP
    ? `通话结束，时长 ${durationText}`
    : e.reason === HANGUP_REASON.CANCEL
    ? '通话已取消'
    : e.reason === HANGUP_REASON.REFUSE
    ? '通话被拒绝'
    : e.reason === HANGUP_REASON.BUSY
    ? '对方忙线'
    : e.reason === HANGUP_REASON.NO_RESPONSE
    ? '对方无响应'
    : '通话结束'

  // 调用你自己的 IM 消息发送接口
  // chatClient.sendTextMessage({ ... })
})
```

---

## ❓ 常见问题

### Q1：组件为什么不显示？

1. 已调用 `app.use(EasemobChatCallKit)` 注册插件
2. `EasemobChatCallKitProvider` 已正确传入 `chatClient`
3. 组件已放置在 Provider 内部
4. 已调用 `call()` / `groupCall()` 发起通话

### Q2：被叫方收到邀请但没有弹窗？

检查 `InvitationNotification` 是否已放置在 Provider 内部：

```vue
<EasemobChatCallKitProvider :chat-client="chatClient">
  <InvitationNotification />  <!-- 必须有 -->
</EasemobChatCallKitProvider>
```

### Q3：Vite 热更新后通话状态丢失？

Vite HMR 会重置 Pinia state。开发时建议：
- 使用源码模式（`pnpm run test:source`）
- 发起通话后避免修改正在使用的组件文件

### Q4：如何在非 Vite 项目使用源码模式？

源码模式依赖构建工具的 `resolve.alias` 能力。Webpack 用户需在 `webpack.config.js` 中配置对应 alias，并确保已配置 `ts-loader` 和 `vue-loader`。
