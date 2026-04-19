# Easemob Chat CallKit Vue3 — 架构重构计划

> **状态**：阶段 1 已完成（群聊解耦 + GlobalCallStore 提取）
> **目标架构**：三层隔离模型（UI 层 / 状态层 / 服务层）
> **约束**：不可引入单聊回归；无自动化测试，全靠 test/src/App.vue 手动验证

---

## 一、目标架构图

```
┌─────────────────────────────────────────────┐
│                 UI 层（完全隔离）             │
│  ┌──────────────┐    ┌────────────────────┐ │
│  │ SingleCall   │    │ GroupCallShell     │ │
│  │ 单聊 UI 组件  │    │ 群聊 UI 组件        │ │
│  └──────┬───────┘    └──────────┬─────────┘ │
└─────────┼───────────────────────┼───────────┘
          │                       │
┌─────────▼───────────────────────▼───────────┐
│           应用/状态层（领域隔离）              │
│  ┌─────────────────┐  ┌───────────────────┐ │
│  │ SingleCallStore │  │ GroupCallStore    │ │
│  │ (callStateStore)│  │                   │ │
│  │ • status        │  │ • session         │ │
│  │ • calleeId      │  │ • participants    │ │
│  │ • callDuration  │  │ • callDuration    │ │
│  └────────┬────────┘  └─────────┬─────────┘ │
│           │                     │           │
│  ┌────────┴─────────────────────┴─────────┐ │
│  │      GlobalCallStore（跨域共享）         │ │
│  │  • userInfoMap（昵称/头像）              │ │
│  │  • isMinimized（窗口模式）               │ │
│  └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
                        │
          ┌─────────────┴──────────────┐
          │      领域服务层（共享能力）   │
          │  ┌────────────────────────┐ │
          │  │ SignalingService       │ │
          │  │ （发送/接收信令，无状态） │ │
          │  └────────────────────────┘ │
          │  ┌────────────────────────┐ │
          │  │ RtcChannelService      │ │
          │  │ （join/leave/track）   │ │
          │  │ 注意：无状态，纯原子操作  │ │
          │  └────────────────────────┘ │
          └─────────────────────────────┘
                        │
          ┌─────────────▼──────────────┐
          │      基础设施层（外部 SDK）  │
          │  • 环信 IM SDK             │
          │  • Agora RTC SDK           │
          └────────────────────────────┘
```

### 关键设计决策

| 层级 | 策略 | 理由 |
|---|---|---|
| UI 层 | 彻底隔离 | 单聊是"一对一窗口"，群聊是"多方网格+拖拽" |
| 状态层 | 领域隔离 + GlobalCallStore 共享 | 单聊是二元状态机，群聊是分布式参与者集合 |
| 服务层 | 共享 | sendInviteMessage、joinChannel、createAudioTrack 是通用能力 |
| 基础设施 | 共享 | IM 连接和 RTC 客户端各一个实例 |

---

## 二、已完成工作

### ✅ 阶段 0：群聊从旧架构迁出
- `EasemobChatMultiCall.vue` 重写为薄 wrapper（只渲染 `GroupCallShell`）
- 旧组件移入 `lib/deprecated/`
- `GroupCallStore` 成为群聊唯一事实源

### ✅ 阶段 1：状态层净地化
- 新建 `GlobalCallStore`（`userInfoMap` + `isMinimized`）
- `callStateStore` 删除共享字段，回归纯单聊域
- 全局替换引用（8 个文件）

---

## 三、剩余实施路线

### 阶段 2：信令路由拆分（useListenerManager → SignalRouter + Handlers）
**目标**：把 810 行 monolith 拆成注册式 Handler。

#### 2.1 新建文件
```
lib/signaling/
  ├── SignalRouter.ts              # 中央路由器
  ├── SingleCallSignalHandler.ts   # 单聊域处理器
  └── GroupCallSignalHandler.ts    # 群聊域处理器
```

#### 2.2 SignalRouter 设计
```ts
class SignalRouter {
  private handlers = new Map<string, SignalHandler[]>()
  register(action: string, matcher: (msg) => boolean, handler: SignalHandler)
  dispatch(message: CmdMsgBody)
}
```

#### 2.3 提取逻辑
- `SingleCallSignalHandler`：
  - `handleAlertSignalMessage`（单聊分支）
  - `handleConfirmRingSignalMessage`
  - `handleAnswerCallMessage`（单聊 accept/reject）
  - `handleCancelCallMessage`（单聊分支）
  - `handleLeaveCallMessage`（单聊分支）
  - `handleConfirmCalleeMessage`
- `GroupCallSignalHandler`：
  - `handleInvitationMessage` 中 GroupCallStore 初始化
  - `handleAnswerCallMessage` 中群聊 accept/reject
  - `handleCancelCallMessage` 中群聊容错
  - `handleLeaveCallMessage` 中群聊成员移除

#### 2.4 useListenerManager 退化
- 只负责挂载 IM 监听
- 收到消息后交给 `SignalRouter.dispatch()`

**预估**：1-1.5 天，风险中等
**验证点**：
- [ ] 单聊：主叫发起 → 被叫收到邀请 → 被叫接受 → 双方进入通话 → 一方挂断
- [ ] 群聊：主叫发起 → 被叫收到邀请 → 被叫接受 → 主叫看到被叫加入 → 被叫挂断 → 通话继续

---

### 阶段 3：RTC 服务去状态化
**目标**：`RtcService` 变成纯 SDK 封装，不读写任何 Store。

#### 3.1 RtcService 改造
- 移除 `useRtcChannelStore()` import
- 所有状态写回改为**回调传出**：
  ```ts
  class RtcService {
    constructor(config: {
      onLocalStreamChange?: (stream: MediaStream | null) => void
      onUserRtcJoined?: (uid: string, userId?: string) => void
      onUserRtcLeft?: (uid: string, userId?: string) => void
      onUserPublished?: (uid: string, mediaType: 'audio' | 'video') => void
    })
  }
  ```

#### 3.2 回调消费方
- **单聊侧**：新建 `SingleCallRtcAdapter`，消费回调并写回 `callStateStore`
- **群聊侧**：`RtcMediaBridge` 直接消费回调，写回 `GroupCallStore`

#### 3.3 useJoinChannel → RtcJoinService
- 改为无状态类：
  ```ts
  class RtcJoinService {
    async joinChannel(params): Promise<{ tracks: ILocalTrack[] }>
  }
  ```
- 调用方（`SingleCallStore` / `GroupCallViewModel`）自行管理 `isJoining` 状态

**预估**：1-1.5 天，风险高
**验证点**：
- [ ] 单聊：视频通话双方都能看到对方画面
- [ ] 群聊：本地视频 + 远程视频都能正常渲染
- [ ] 静音/摄像头切换功能正常

---

### 阶段 4：rtcChannelStore 拆解与领域化
**目标**：彻底消除全局 RTC 状态池。

#### 4.1 状态迁移
| 当前字段 | 迁移目标 |
|---|---|
| `callDuration` | 单聊：`callStateStore` 自管计时器；群聊：`GroupCallStore` 已有 |
| `localStream` | 单聊域自建 `localStream` ref |
| `audioEnabled` / `videoEnabled` | 单聊域自建 |
| `joinedRtcUsers` | 单聊域自建 Set |
| `pendingUserIds` | 单聊域自建 Set |
| `leftUsers` | 单聊域自建 Set |
| `remoteStreams` | 单聊域自建 Record |
| `channels` / `activeChannelId` / `isConnected` | 如业务不需要多频道共存，直接删除 |

#### 4.2 RtcMediaBridge 清理
- 删除所有 `rtcChannelStore.getUserIdByUid()` 回读兼容代码
- 只依赖 `GroupCallStore.uidToUserIdMap`

**预估**：1 天，风险中等
**验证点**：
- [ ] 单聊通话时长计时器正常
- [ ] 群聊通话时长计时器正常
- [ ] 单聊挂断后重新发起通话正常
- [ ] 群聊挂断后重新发起通话正常

---

## 四、提交规范

每次阶段完成后必须：
1. `npx vue-tsc --noEmit --skipLibCheck` 零报错
2. `test/src/App.vue` 手动验证该阶段涉及的通话场景
3. commit message 格式：`refactor(arch): [阶段名] — [简要说明]`
4. **未经用户确认不执行 `git push`**

---

## 五、禁止事项

1. **不要修改单聊 UI 组件的外部 props / emits 接口**（保持向后兼容）
2. **不要删除 `lib/deprecated/` 目录**（保留 git history 以外的备份）
3. **不要修改 `types/callstate.types.ts` 中的 CALL_STATUS / CALL_TYPE 枚举值**（与 iOS/Android SDK 兼容）
4. **不要一次性跨多个阶段实施**（必须逐阶段验证）
