# CallKit Core 实施路线图

> **当前分支**: `feat/callkit-core-extract`  
> **最后更新**: 2026-05-06  
> **状态**: Phase 1 已完成 ✅

---

## 总览

将 `lib/` 下信令核心逻辑抽离为框架无关的 JavaScript 库，仅保留环信 IM SDK 作为信令通道，RTC 层完全抽象。

---

## Phase 0：基础搭建 ✅

**目标**: 新建 `packages/callkit-core/` 目录，复制零改动的文件，搭好打包和测试骨架。

- [x] 新建 `pnpm-workspace.yaml`
- [x] 新建 `packages/callkit-core/package.json`（`@easemob/callkit-core`）
- [x] 新建 `packages/callkit-core/tsconfig.json`
- [x] 新建 `packages/callkit-core/vite.config.ts`（ESM + CJS + dts）
- [x] 复制 `lib/types/callstate.types.ts` → `src/types/`
- [x] 复制 `lib/types/signal.types.ts` → `src/types/`
- [x] 复制 `lib/utils/callUtils.ts` → `src/utils/`
- [x] 新建简化版 `src/utils/logger.ts`（可注入接口，不依赖 dexie）
- [x] 复制改造 `src/events/EventBus.ts`（去掉 logger 硬依赖）
- [x] 复制改造 `src/signaling/SignalRouter.ts`（内嵌 CmdMsgBody 类型）
- [x] 新建骨架文件：`CallKitCore.ts`、`IMProvider.ts`、`RtcAdapter.ts`、`CallKitEvents.ts` 等

**验证点**:
- [x] `pnpm build` 零报错

---

## Phase 1：状态机提取 ✅

**目标**: 将 `callStateStore`（Pinia）+ `GroupCallStore` 中的状态流转逻辑提取为纯 JS 类。

- [x] `SingleCallStateMachine`：单聊二元状态机
  - [x] `initInvite()` — 主叫发起
  - [x] `initIncoming()` — 被叫收到邀请
  - [x] `receiveAlert()` — 收到 alert
  - [x] `receiveConfirmRing()` — 收到 confirmRing
  - [x] `receiveAnswer()` — accept/refuse/busy
  - [x] `receiveCancel()` — 收到 cancel
  - [x] `receiveLeave()` — 收到 leave
  - [x] `receiveConfirmCallee()` — 收到 confirmCallee
  - [x] `hangup()` — 本地挂断
  - [x] `timeout()` — 邀请超时
  - [x] `reset()` — 强制重置，保留 callerDevId / callerUserId
- [x] `GroupCallSession`：群聊会话 + 参与者管理
- [x] 安装 vitest，写 22 个单元测试
- [x] 测试覆盖：主叫全流程 / 被叫全流程 / 拒绝 / 忙线 / 取消 / 超时 / leave / reset

**验证点**:
- [x] `pnpm test` 22/22 通过
- [x] `pnpm build` 零报错

---

## Phase 2：Handler 重构（当前待开始）

**目标**: 把 `SingleCallSignalHandler` / `GroupCallSignalHandler` 从"控制器"退化为"处理器"，不再直接读写 Pinia，改为注入 `StateMachine` + `SignalSender`，返回 `DomainEvent[]`。

- [ ] 重构 `SingleCallSignalHandler`（~580 行 → 新核心库）
  - [ ] 删除 `useChatClientStore()` → 注入 `{ currentUserId, deviceId }`
  - [ ] 删除 `useCallStateStore()` → 注入 `SingleCallStateMachine`
  - [ ] 删除 `this.joinRtcChannel()` → 返回 `DomainEvent` 中的 `SHOULD_JOIN_RTC`
  - [ ] 删除 `new CallService()` → 返回 `DomainEvent` 中的 `CALL_ENDED`
  - [ ] 保留 callId / deviceId 校验逻辑（多端冲突处理）
  - [ ] 保留响应信令发送（confirmRing / confirmCallee）→ 注入 `SignalSender`
- [ ] 重构 `GroupCallSignalHandler`（~384 行 → 新核心库）
  - [ ] 同上模式：注入 `GroupCallSession` + `SignalSender`
  - [ ] `handleInviteTextMessage()` 初始化群聊 session
- [ ] 组装 `CallKitCore`
  - [ ] `inviteCall()` → stateMachine.initInvite() + MessageBuilder + SignalSender
  - [ ] `answerCall()` → SignalSender + 等待 confirmCallee / 直接响应
  - [ ] `hangup()` → 根据状态决定 send cancel 还是 send leave
  - [ ] 事件聚合：`Handler` 返回 `DomainEvent[]` → Core 去重/排序 → `onEvent()`
- [ ] 双轨对比测试
  - [ ] 在 `test/` 中写一个"纯 HTML + JS" 测试页，验证单聊/群聊全流程

**工作量预估**: 2-3 天  
**风险**: 中高 — Handler 逻辑复杂（多端设备冲突、callId 校验、状态顺序校验），需逐行对照现有代码验证

**验证点**:
- [ ] `pnpm test` 新增 Handler 测试通过
- [ ] `test/src/App.vue` 手动验证单聊：主叫发起 → 被叫收到邀请 → 被叫接受 → 双方进入通话 → 一方挂断
- [ ] `test/src/App.vue` 手动验证群聊：主叫发起 → 被叫收到邀请 → 被叫接受 → 主叫看到被叫加入 → 被叫挂断 → 通话继续

---

## Phase 3：Vue3 适配层

**目标**: 修改现有 `lib/composables/useCallKit.ts`，内部实例化 `CallKitCore`，订阅事件同步到 Pinia Store，保持现有 UI 组件无感知。

- [ ] 修改 `lib/composables/useCallKit.ts`
  - [ ] 内部 `new CallKitCore({ imClient, onEvent })`
  - [ ] `onEvent` 中：事件 → 同步到 `callStateStore` / `groupCallStore`
  - [ ] `shouldJoinRtc` 事件中调用现有 `useJoinChannel().joinChannel()`
- [ ] 验证现有 UI 组件无需改动
- [ ] `npx vue-tsc --noEmit --skipLibCheck` 零报错

**验证点**:
- [ ] `test/src/App.vue` 手动验证单聊 + 群聊全流程
- [ ] 现有 Vue3 CallKit 的 npm 打包 (`pnpm build:lib`) 正常

---

## Phase 4：UniApp Demo（可选，后续迭代）

**目标**: 验证核心库在 UniApp 场景下的可用性。

- [ ] 新建 `examples/uniapp-callkit/` 示例项目
- [ ] 集成 `@easemob/callkit-core` + `easemob-websdk`（uniapp 版）+ `agora-rtc-sdk-ng`（小程序版）
- [ ] 实现 `AgoraRtcAdapter`
- [ ] 手动验证：UniApp 打包到 H5 / 小程序 / App

---

## Phase 5：发布

**目标**: 发布 `@easemob/callkit-core` npm 包。

- [ ] 补充 README.md（安装、快速开始、API 文档）
- [ ] 补充 CHANGELOG.md
- [ ] `pnpm build && pnpm pack`
- [ ] 发布 `@easemob/callkit-core@0.1.0`

---

## 关键设计决策备忘

| 决策 | 说明 |
|---|---|
| **状态机不直接发消息** | `SingleCallStateMachine` 只管理状态和返回 `DomainEvent`，发送信令由 `SignalSender` 负责 |
| **callId 校验在 Handler** | 状态机假设 Handler 已做 callId 匹配校验，状态机只做状态流转 |
| **reset 保留 caller 身份** | 与现有 `callStateStore.resetCallState()` 行为一致，保留 `callerDevId` / `callerUserId` |
| **HANGUP_REASON 无 REMOTE_HANGUP** | 远程挂断统一用 `HANGUP_REASON.HANGUP`，与现有 CallService 行为一致 |
| **noUnusedLocals 关闭** | 骨架文件中有大量 TODO 方法，暂时关闭 TS 严格检查，待 Phase 2 完成后可重新开启 |
