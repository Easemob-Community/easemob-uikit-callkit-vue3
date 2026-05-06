# CallKitCore 提取路线图

> **分支**: `feat/callkit-core-extract`
> **目标**: 将 `lib/` 中的通话信令逻辑提取为框架无关的 `@easemob/callkit-core` 核心库
> **策略**: 双轨并行（新旧链路共存，`?core=1` 切换验证）

---

## 已完成阶段

### ✅ Phase 0: 脚手架搭建
- [x] pnpm workspace 配置 (`packages/*` + `test`)
- [x] `packages/callkit-core/` 目录结构与基础构建配置
- [x] `vite-plugin-dts` 类型生成
- [x] vitest 测试框架 + `@vitest/coverage-v8`
- [x] 零依赖文件迁移（`types/`, `utils/`, `signaling/MessageBuilder`）

### ✅ Phase 1: 状态机实现
- [x] `SingleCallStateMachine`（纯 JS 状态机，8 种状态，11 个转换方法）
- [x] `GroupCallSession`（Map-based 参与者管理）
- [x] 22 个状态机单元测试（全部通过）

### ✅ Phase 2: Handler 重构
- [x] `SingleCallSignalHandler` (~340 行) — 纯处理器，返回 `DomainEvent[]`
- [x] `GroupCallSignalHandler` (~250 行) — 同上
- [x] 移除 Pinia 依赖，注入 `StateMachine`/`Session` + `SignalSender`
- [x] 28 个 Handler 单元测试（全部通过）

### ✅ Phase 3: Core 组装
- [x] `CallKitCore` 端到端编排：
  - `inviteCall()` → token → `initInvite()` → `SignalSender`
  - `answerCall()` → accept/refuse/busy 分支
  - `hangup()` → cancelCall (INVITING) / leaveCall (IN_CALL)
  - `inviteGroupCall()` → `GroupCallSession` + invite text
- [x] `IMListener` — 薄 wrapper，回调驱动
- [x] `SignalRouter` — 注册式消息路由
- [x] 12 种 `CallKitEvent` → `DomainEvent` 映射
- [x] `CallKitCore.test.ts` 14 个集成测试（全部通过）
- [x] **构建零报错，测试 64/64 通过**

### ✅ Phase 4: Vue3 适配层（双轨并行）
- [x] `lib/composables/useCallKitCore.ts` — 新建文件，零修改现有 `lib/`
- [x] Core 事件 → Pinia Store 同步映射（`callStateStore` / `groupCallStore` / `globalCallStore`）
- [x] Core 事件 → `callKitEventBus` 转发（保持 UI 组件兼容性）
- [x] `shouldJoinRtc` → `useJoinChannel().joinChannel()` 桥接
- [x] `useListenerManager` 旧监听器自动卸载（避免重复处理）
- [x] `lib/index.ts` 导出 `useCallKitCore`
- [x] `test/App.vue` 双轨切换开关（`?core=1` 激活 Core 链路）
- [x] `vue-tsc --noEmit --skipLibCheck` 零报错

---

## 剩余工作

### Phase 5: RTC 适配层（待实施）
**目标**: Core 的 `RtcAdapter` 接口正式接入 Agora SDK

- [ ] 实现 `RtcAdapter` 接口（基于现有 `RtcService`）
- [ ] `CallKitCore` 构造函数传入 `rtcAdapter`
- [ ] Core 发出 `shouldPublishTracks` / `shouldLeaveRtc` 事件的处理
- [ ] 单聊：`localAudioChanged` / `localVideoChanged` → `callStateStore` / `singleCallRtcStore`
- [ ] 群聊：`RtcMediaBridge` 消费 Core 事件（替代现有 `useListenerManager` 的群聊分支）

### Phase 6: 旧链路废弃与迁移
**目标**: 验证 Core 链路完全替代旧链路后，移除旧代码

- [ ] `test/App.vue` 默认启用 Core 链路（移除 `?core=1` 开关）
- [ ] 删除 `lib/composables/useCallKit.ts`（旧链路）
- [ ] 删除 `lib/composables/useListenerManager.ts`（旧 monolith）
- [ ] 删除 `lib/deprecated/` 中已迁移的旧组件
- [ ] `lib/signaling/` 中的旧 Handler（Pinia 依赖版本）迁移确认后删除
- [ ] 回归测试：单聊/群聊完整通话流程

### Phase 7: 发布与文档
- [ ] `packages/callkit-core` 独立版本发布（v0.1.0 → v1.0.0）
- [ ] 更新 `README.md` 和 `USAGE.md`
- [ ] 发布 `easemob-chat-callkit-vue3` 新版本（依赖 `@easemob/callkit-core`）

---

## 验证清单

每次阶段完成后执行：
1. `npx vue-tsc --noEmit --skipLibCheck` 零报错 ✅
2. `cd packages/callkit-core && npx vitest run` 全部通过 ✅
3. `test/src/App.vue` 手动验证目标场景
4. commit message: `refactor(core): [阶段名] — [简要说明]`
