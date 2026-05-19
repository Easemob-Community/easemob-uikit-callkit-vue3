# callkit-vue3 重构 TODO — 事件驱动化（让 core 真正发挥作用）

> **创建时间**：2026-05-19
> **优先级**：高（阶段 2 之前的"地基修整"）
> **背景**：本次"被叫弹窗一闪而过"bug 暴露出 UI 层绕过 core 事件、直接 watch 原始 status 的架构债。临时修复（用区间数组）治标不治本，需要把 UI 改为事件驱动，让 core 包的存在真正有意义。

---

## 一、当前架构债（必须修）

### 1. core 的事件层被架空
- `callkit-core` 暴露了 `incomingCall` / `callAccepted` / `callEnded` / `callCanceled` / `callRejected` 等语义化事件
- 但 `useCallKitCore.ts` 的 `handleCoreEvent` 收到事件后**只调用 `syncState()` 把 state 镜像到 reactive 对象**，事件本身被丢弃
- UI 层（`InvitationNotification` 等）全部走 `watch(coreCallState.status)`，事件总线（CallKitEventBus）等于空转

### 2. UI 耦合状态机内部细节
- UI 必须知道 8 个 CALL_STATUS 枚举里"哪些算等待用户操作"
- 状态机一旦新增/合并状态（如本次 RECEIVED_CONFIRM_RING），UI 立即出 bug
- 同样的反模式还污染了 `useAnswerCall.acceptCall` / `useCallKit.accept` 的"可点判断"

### 3. core 的复用价值打折
- 跨平台（React、小程序）复用时，新平台必须重新实现一套"状态 → UI 显隐"的派生逻辑
- core 的"事件驱动对外契约"未兑现

---

## 二、重构目标

> **瞬时动作 → core 事件驱动；持续态 → core 语义化谓词。UI 不再直接读原始 status 枚举。**

### 应有的消费模式

| UI 行为 | 当前做法（错） | 目标做法（对） |
|---|---|---|
| 来电弹窗显示 | `watch(status === ALERTING)` | `on('incomingCall', show)` |
| 来电弹窗隐藏 | `watch(status !== ALERTING)` | `on('callEnded' \| 'callCanceled' \| 'callAccepted' \| 'callRejected', hide)` |
| 接听按钮可点判断 | `status !== ALERTING return` | `core.canAccept()` |
| 拒接按钮可点判断 | 同上 | `core.canReject()` |
| 通话中 UI 显示 | `watch(status === IN_CALL)` | `core.isInActiveCall()` 或 `on('callConnected'/'callEnded')` |
| 通话计时显示 | reactive duration | 同左（持续态保持响应式即可）|

---

## 三、具体改动 TODO

### Task 1：core 包补齐语义化谓词
**文件**：`packages/callkit-core/src/core/CallKitCore.ts`

新增公开方法：
```ts
canAccept(): boolean        // ALERTING | RECEIVED_CONFIRM_RING
canReject(): boolean        // ALERTING | RECEIVED_CONFIRM_RING
canHangup(): boolean        // INVITING ~ IN_CALL（除 IDLE 外）
isWaitingCalleeAction(): boolean   // ALERTING | CONFIRM_RING | RECEIVED_CONFIRM_RING
isInActiveCall(): boolean   // ANSWER_CALL | CONFIRM_CALLEE | IN_CALL
isCalling(): boolean        // INVITING | CONFIRM_RING（主叫等待对方接听）
```

> 注意：这些谓词的实现要从 `SingleCallStateMachine` 内部取状态，不允许 UI 直接拿到 `CALL_STATUS` 枚举。

---

### Task 2：core 事件契约补齐
**文件**：`packages/callkit-core/src/events/CallKitEvents.ts` + 触发处

确认下列事件**完整且唯一可靠**：

- `incomingCall` — 收到 invite 后立即触发（被叫端弹窗的唯一显示信号）
- `callAccepted` — 双方进入通话（被叫弹窗隐藏 + 通话窗显示）
- `callRejected` — 被叫拒接（主叫端关闭呼叫窗）
- `callCanceled` — 主叫取消（被叫端弹窗隐藏）
- `callEnded` — 任意原因结束（兜底隐藏所有通话 UI）
- `callConnected` — RTC 双方真正联通（用于"接通"音效/计时启动）

> 检查每个事件是否在状态机内有**唯一且明确**的触发点；不能出现"靠 status 推导事件"的代码。

---

### Task 3：`useCallKitCore` 瘦身
**文件**：`packages/callkit-vue3/src/composables/useCallKitCore.ts`

- 删除/缩减 `syncState()` 全字段镜像（只保留 UI 真正需要绑定的派生量：`callDuration`、`isMinimized`、`localUserRole`）
- `handleCoreEvent` **不再用于回写 reactive state**，改为透传给外部订阅者
- 暴露 `onCallEvent(type, handler)` 给上层 composable / 组件直接订阅

---

### Task 4：`InvitationNotification` 改事件驱动
**文件**：`packages/callkit-vue3/src/components/InvitationNotification.vue`

- 删除 `watch(coreCallState.status)`
- 改为：
  ```
  onCallEvent('incomingCall', payload => { current.value = payload; visible.value = true })
  onCallEvent('callAccepted' | 'callRejected' | 'callCanceled' | 'callEnded', () => visible.value = false)
  ```
- `onMounted` 时通过 `core.isWaitingCalleeAction()` 做兜底（页面刷新/路由切换场景）

---

### Task 5：接听/拒接调用谓词化
**文件**：
- `packages/callkit-vue3/src/composables/useAnswerCall.ts`
- `packages/callkit-vue3/src/composables/useCallKit.ts`

把 `if (coreCallState.status !== CALL_STATUS.ALERTING) return` 全部替换为：
```ts
if (!core.canAccept()) { logger.warn('not acceptable'); return }
```
UI 层不再 import `CALL_STATUS`。

---

### Task 6：全局走查（grep 兜底）
重构完成后跑：
```
grep -rn "CALL_STATUS\." packages/callkit-vue3/src
grep -rn "coreCallState\.status\s*===" packages/callkit-vue3/src
grep -rn "watch.*coreCallState\.status" packages/callkit-vue3/src
```
**目标**：除了少量 debug 日志，业务代码不允许直接出现以上模式。

---

### Task 7：通话窗（SingleCall / GroupCall）同样改造
- `EasemobChatSingleCall` 的显隐改为 `on('callAccepted', show) + on('callEnded', hide)`
- 计时器启动改为 `on('callConnected')` 触发
- 全屏/小窗切换不变（属于持续态，继续 reactive 绑定）

---

## 四、验证清单（手动）

每完成一个 Task 都要在 `test/src/views/FullTest.vue` 跑一次：

- [ ] 单聊主叫 → 被叫弹窗显示并稳定（不闪）
- [ ] 单聊被叫接听 → 弹窗即刻消失，通话窗出现
- [ ] 单聊被叫拒接 → 双方都正确收尾
- [ ] 单聊主叫超时取消 → 被叫弹窗消失
- [ ] 单聊主叫主动取消 → 被叫弹窗消失
- [ ] 单聊握手中点接听（status=4 时）→ 不再被静默拦截
- [ ] iOS 主叫 → Web 被叫 → 弹窗稳定显示且能成功接听
- [ ] 群聊邀请弹窗在多人 invite 场景下正常显示/隐藏
- [ ] `npx vue-tsc --noEmit --skipLibCheck` 零报错

---

## 五、风险与禁区

1. **不改 CALL_STATUS 枚举值**（与 iOS/Android SDK 兼容，AGENTS.md 已声明）
2. **不改 SingleCall / MultiCall 组件的对外 props/emits 接口**（向后兼容）
3. **谓词方法只读，不允许在 UI 调用时反向修改状态**
4. **本次重构不并入"阶段 2 信令路由拆分"**，单独完成、单独 commit
5. commit message：`refactor(arch): callkit-vue3 改为事件驱动，下沉状态判定到 core 谓词`

---

## 六、临时修复回滚说明

本次"一闪而过" bug 的临时修复（区间数组判断）保留即可，重构 Task 4 / Task 5 完成后会被新逻辑替换，**不需要单独回滚**。

涉及的临时修复文件：
- `packages/callkit-vue3/src/components/InvitationNotification.vue`
- `packages/callkit-vue3/src/composables/useAnswerCall.ts`
- `packages/callkit-vue3/src/composables/useCallKit.ts`

---

## 七、为什么值得做

| 维度 | 改造前 | 改造后 |
|---|---|---|
| core 的意义 | 被架空（只是状态容器） | 兑现"事件驱动 + 平台无关" |
| 状态机改动影响面 | UI 全要改 | UI 零感知 |
| 跨端复用成本 | 高（每端重写显隐逻辑）| 低（订阅事件即可）|
| 类似"一闪而过" bug 复发概率 | 高 | 极低（事件是动作信号，不会瞬变）|

> 下次再加握手中间态、或换 SDK，UI 完全不用改 —— 这才是 core 包应该提供的隔离能力。
