# Group Call Refactor Skill

## 1. 目标与约束

### 核心目标
在 `easemob-chat-callkit-vue3` 中，用一个新的独立模块 `lib/modules/groupCall/` 彻底替换旧版多人通话实现，解决当前群组通话中**视频串位、邀请中状态不消失、开关摄像头后画面不恢复、uid 映射错乱**等结构性 bug。

### 硬性约束（不可违背）
1. **信令零改动**：`useSignalManager`、`CallService`、IM 消息体格式（`ext.action` / `ext.type` 等）**严禁修改**。必须与 React/Android/iOS 端保持 100% 互通。
2. **单聊零侵入**：`singleCall/` 目录、`EasemobChatSingleCall.vue`、`useAnswerCall`（单聊路径）不得改动。
3. **渐进替换**：旧组件 `EasemobChatMultiCall.vue` 保留，通过 `USE_NEW_GROUP_CALL` Feature Flag 切换。
4. **状态驱动 UI**：UI 层必须是 Store 的纯函数，禁止在组件内部做 `userId -> uid` 推断、禁止全局 `renderVideoStreams`。

---

## 2. 架构总览

```
lib/modules/groupCall/
├── index.ts                           # 对外导出
├── types.ts                           # Participant / ParticipantState / GroupCallSessionState
├── viewModel/
│   ├── GroupCallStore.ts              # Pinia Store：唯一事实源（SSOT）
│   └── useGroupCallViewModel.ts       # 组合式 API：编排 Store + Bridge + Signaling
├── media/
│   └── RtcMediaBridge.ts              # Agora 事件桥接：subscribe -> 写 track 进 Store
├── signaling/
│   └── GroupCallSignalingAdapter.ts   # 薄封装：只调用现有 CallService / useSignalManager
└── components/
    ├── GroupCallShell.vue             # 主容器：Header + Grid + Controls
    ├── VideoGrid.vue                  # 布局组件：纯函数，根据 participants 计算 grid
    └── ParticipantTile.vue            # 单格组件：自己管自己的 <video> 和 track.play()
```

### 2.1 与旧架构的关键差异

| 旧架构 | 新架构 |
|--------|--------|
| `useParticipants` + `rtcChannelStore` + `EasemobChatMultiCall.vue` 各自维护状态 | `GroupCallStore` 一个 Map 管所有参与者 |
| `pendingUserIds` 队列猜测 uid 映射 | `acceptedMembers` + 三层推断 + API 兜底 |
| 一个 `renderVideoStreams()` 遍历所有 video 并 play | 每个 `ParticipantTile` 独立 `watch(track)` 后 `play()` |
| `user-unpublished` 误 emit `userLeft` 导致用户被移除 | `user-unpublished` 只把 track 置 null，state 回退到 `joinedRtc` |
| 邀请新成员没有进入 pending 队列 | 新成员加入时直接写进 `acceptedMembers` 并推断映射 |

---

## 3. 状态机设计（单一事实源）

### 3.1 Participant 生命周期

```
invited ──► accepted ──► joinedRtc ──► publishing ──► left
   │            │            │             │            ▲
   │            │            │             └────────────┘ (user-unpublished 只回退到 joinedRtc)
   │            │            └────────────────────────────┘ (user-joined 触发)
   └────────────┘ (answerCall / timeout / refuse)
```

- **`invited`**：已发邀请，UI 显示 loading 遮罩
- **`accepted`**：收到 `answerCall`（accept），还在等待 RTC `user-joined`
- **`joinedRtc`**：`user-joined` 已触发，uid->userId 映射已建立
- **`publishing`**：至少发布了 audio 或 video 中的一种，UI 显示 video
- **`left`**：明确离开（`user-left`、收到 `leaveCall`、拒绝/超时），2秒后从列表移除

### 3.2 Store API 规范

```ts
// GroupCallStore.ts 必须暴露的接口
interface GroupCallStore {
  // state
  session: GroupCallSessionState | null
  participants: Map<string, Participant>
  uidToUserIdMap: Map<string, string>
  acceptedMembers: Set<string>

  // getters (computed)
  participantList: Participant[]       // 排序后数组，UI 直接消费
  localParticipant: Participant | undefined
  activeParticipants: Participant[]    // 过滤掉 left
  publishingParticipants: Participant[]

  // actions
  initSession(payload: GroupCallSessionState): void
  destroySession(): void
  addParticipant(participant: Omit<Participant, 'invitedAt'>): void
  removeParticipant(userId: string): void
  setParticipantState(userId: string, state: ParticipantState): void
  markAccepted(userId: string): void
  setUidMapping(uid: string, userId: string): void
  resolveUid(uid: string): UidResolution
  setVideoTrack(userId: string, track: IRemoteVideoTrack | null): void
  setAudioTrack(userId: string, track: IRemoteAudioTrack | null): void
  setLocalStream(userId: string, stream: MediaStream | null): void
  setMuteState(userId: string, isMuted: boolean): void
  setCameraState(userId: string, isCameraOn: boolean): void
  setSpeakingState(userId: string, isSpeaking: boolean): void
}
```

---

## 4. uid -> userId 映射策略（核心）

### 禁止
- **禁止使用 `pendingUserIds` 队列猜测**（旧架构 `RtcChannelStore.popPendingUserId`）
- **禁止按加入顺序假设映射关系**
- **禁止在 UI 组件里推断 uid**

### 推荐的三层推断

| 层级 | 名称 | 触发时机 | 逻辑 |
|------|------|---------|------|
| L1 | certain | `user-joined` / `user-published` | `uidToUserIdMap` 中已有映射，直接复用 |
| L2 | inferred | `user-joined` 且无 L1 | 检查 `acceptedMembers`，若**只有一个未映射**的 userId，则安全推断为此人 |
| L3 | API 兜底 | L1/L2 都失败 | 调用 `chatClient.getUserIdByRTCUIds([uid])`（如果 SDK 支持）获取确定映射 |

### 临时占位机制
若三层推断都失败，创建 `userId = '__pending_${uid}'` 的临时 Participant，state 为 `joinedRtc`。后续一旦 L3 返回真实 userId，执行**原子迁移**：
1. 用临时 Participant 的数据创建真实 userId 的 Participant
2. 更新 `uidToUserIdMap`
3. 删除临时 Participant

---

## 5. UI 层规范

### 5.1 纯函数原则
- `VideoGrid.vue` 只能接收 `participants: Participant[]`，计算 css grid，不得访问任何 store 或 rtc client。
- `ParticipantTile.vue` 只能接收 `participant: Participant`，内部自己持有 `<video ref="videoEl">`。

### 5.2 ParticipantTile 的 track 绑定

```ts
watch(
  () => [
    props.participant.videoTrack?.getTrackId?.(),
    props.participant.localStream?.id,
  ],
  () => {
    const el = videoEl.value
    if (!el) return

    if (props.participant.isLocal && props.participant.localStream) {
      el.srcObject = props.participant.localStream
      el.play().catch(() => {})
      return
    }

    const track = props.participant.videoTrack
    if (track) {
      track.play(el)
    } else {
      el.srcObject = null
    }
  },
  { immediate: true }
)
```

### 5.3 禁止的写法
- ❌ 全局 `renderVideoStreams()` 遍历所有 video refs
- ❌ `getRemoteVideoTrack(userId)` 找不到时 fallback 到"第一个有 videoTrack 的远程用户"
- ❌ 在 template 里用函数式 ref `el => videoRefs.push(el)`

---

## 6. 信令与入口集成规范

### 6.1 允许修改的旧文件（仅限条件分支）
以下文件可以添加 `if (USE_NEW_GROUP_CALL) { ... }` 分支，但**不得改动原有逻辑**：
- `lib/components/multiCall/EasemobChatMultiCall.vue`（渲染分支）
- `lib/composables/useCallKit.ts`（`startGroupCall` 初始化分支）
- `lib/composables/useListenerManager.ts`（邀请/接听/离开事件的分支）

### 6.2 useCallKit.ts 的集成点
在 `startGroupCall` 发送邀请、设置 `callState` 之后、`joinChannel()` 之前，初始化 `GroupCallStore`：
- `initSession`
- `addParticipant(localUser, state='joinedRtc')`
- `addParticipant(member, state='invited')` for each member

### 6.3 useListenerManager.ts 的集成点
1. **收到群组邀请 (`handleInvitationMessage`)**：
   - 在 `callStateStore.updateCallState` 之后，初始化 `GroupCallStore`
   - 填充 localUser（state=`invited`）、callerUserId（state=`joinedRtc`）、其他 invitedMembers（state=`invited`）

2. **收到 answerCall (`handleAnswerCallMessage`)**：
   - `result === 'accept'` 时，调用 `groupCallStore.markAccepted(message.from)`

3. **收到 leaveCall (`handleLeaveCallMessage`)**：
   - 群组通话场景下，调用 `groupCallStore.setParticipantState(userId, 'left')`，2 秒后 `removeParticipant`

---

## 7. Feature Flag

开关文件：`lib/config/featureFlags.ts`

```ts
export const USE_NEW_GROUP_CALL = false
```

- **开发/测试阶段**：设为 `true`，在测试环境验证
- **生产发布**：稳定后设为 `true`，并删除旧代码
- **回滚**：随时改回 `false`，立即恢复旧组件

---

## 8. 待完成清单（Checklist）

### P1 核心状态与媒体（已完成）
- [x] `types.ts` 定义
- [x] `GroupCallStore.ts` 实现
- [x] `RtcMediaBridge.ts` 骨架
- [x] `useGroupCallViewModel.ts` 编排

### P2 信令适配（已完成骨架）
- [x] `GroupCallSignalingAdapter.ts` 创建
- [x] `useCallKit.ts` 集成
- [x] `useListenerManager.ts` 集成

### P3 最简 UI（已完成骨架）
- [x] `GroupCallShell.vue`
- [x] `VideoGrid.vue`
- [x] `ParticipantTile.vue`

### P4 入口分流（已完成）
- [x] `EasemobChatMultiCall.vue` 条件渲染
- [x] `lib/index.ts` 导出
- [x] Feature Flag 创建

### P5 联调与补齐（未完成）
- [ ] `RtcMediaBridge.fetchUserIdByUid()` 接入真实 SDK 接口
- [ ] 本地视频流绑定：`joinChannel` 后 `localStream` 如何传入 Store
- [ ] 中途邀请新成员的 UI 弹窗（接入 `EasemobChatGroupMemberList.vue`）
- [ ] `GroupCallShell` 的 Controls 对接 `RtcService.toggleAudio/toggleVideo`
- [ ] 真机测试：3 人加入、开关摄像头、中途拉人、主/被叫挂断
- [ ] 网格布局优化（参考 React 版 `MultiPartyLayoutStrategy`）
- [ ] 移动端适配
- [ ] 旧代码清理（`useParticipants.ts`、`lib/components/multiCall/`）

---

## 9. 常见陷阱（必读）

### 陷阱 1：在 UI 组件里访问 `rtcService.getClient().remoteUsers`
**后果**：UI 与 Agora 状态耦合，无法测试，容易产生竞态。  
**正确做法**：只读 `GroupCallStore` 里的 `participants`。

### 陷阱 2：`user-unpublished` 时把用户状态改成 `left`
**后果**：对方关闭摄像头后重新打开，列表里已经没有这个人，画面永远无法恢复。  
**正确做法**：只把 `videoTrack` 设为 null，state 保持 `joinedRtc` 或 `publishing`。

### 陷阱 3：用数组 `videoRefs.push(el)` 管理 video 元素
**后果**：Vue 重渲染时旧元素不清理，导致 video refs 无限增长、串位、卡顿。  
**正确做法**：用 `Map<string, HTMLVideoElement>`，ref callback 在 `el === null` 时 `delete`。

### 陷阱 4：新增 IM 消息字段来传 uid
**后果**：其他端（React Native / iOS / Android）无法识别，导致互通失败。  
**正确做法**：只能复用现有 `ext` 字段，或通过 `getUserIdByRTCUIds` API 获取映射。

---

## 10. 参考文档

- React 版多人布局：`/Users/neohuang/Desktop/WorkCommonUse/UIKIT/easemob-uikit-react/module/callkit/layouts/MultiPartyLayout.tsx`
- React 版 CallKit 主组件：`/Users/neohuang/Desktop/WorkCommonUse/UIKIT/easemob-uikit-react/module/callkit/CallKit.tsx`
- 现有 Vue3 信令层：`lib/composables/useSignalManager.ts`
- 现有 Vue3 RtcService：`lib/services/RtcService.ts`
