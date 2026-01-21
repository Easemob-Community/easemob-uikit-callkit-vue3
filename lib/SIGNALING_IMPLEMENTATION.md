# 一对一音视频呼叫信令逻辑完成说明

## 问题描述
呼叫后，对方点击接听并且收到信令为 `result: "accept"` 时，主叫方立即导致挂断。

## 根本原因
在 `useListenerManager.ts` 的 `handleAnswerCallMessage` 函数中，当收到 `result === "accept"` 的 answerCall 信令时：
- 只发送了 `confirmCallee` 信令
- **没有更新通话状态为 IN_CALL**
- **没有通知 UI 进入通话**
- 导致后续流程异常，通话被挂断

## 修改内容

### 1. 修复主叫方收到接受信令的处理逻辑

**文件**: `lib/composables/useListenerManager.ts`

在 `handleAnswerCallMessage` 函数的 else 分支（`result === "accept"` 的情况）中：

```typescript
// 对方接受通话
logger.info("收到对方接受，开始进入通话流程");

// 发送confirmCallee信令，通知对方已确认收到接受信息
const confirmCalleePayload = {
  callId: ext.callId,
  callerDevId: ext.callerDevId,
  result: "accept",
};
sendConfirmCalleeMessage(
  message.from as string,
  confirmCalleePayload
).catch(() => {
  // 错误已在useSignalManager内部记录
});

// 更新通话状态为 IN_CALL (对于一对一通话)
if (
  callStateStore.type !== CALL_TYPE.VIDEO_MULTI &&
  callStateStore.type !== CALL_TYPE.AUDIO_MULTI
) {
  logger.info("一对一通话，更新状态为 IN_CALL");
  callStateStore.setCallStatus(CALL_STATUS.IN_CALL);
}

// TODO: 这里需要加入 RTC 频道的逻辑
// 由于你提到 RTC 部分先不管，这里预留接口
// 实际应该调用类似: rtcService.joinChannel(callState.channel)
```

### 2. 完善 confirmCallee 信令的处理

**文件**: `lib/composables/useListenerManager.ts`

新增 `handleConfirmCalleeMessage` 函数，用于处理主叫方收到被叫方的 confirmCallee 确认信令：

- 检查通话状态是否为 IN_CALL，如果是则忽略
- 校验 callId 是否匹配
- 检查是否为其他设备的消息（多端登录）
- 处理拒绝或忙线的情况，调用挂断
- 处理接受的情况，更新状态为 CONFIRM_CALLEE

### 3. 实现 sendAnswerMessage 信令发送

**文件**: `lib/composables/useSignalManager.ts`

实现之前为空的 `sendAnswerMessage` 函数：

```typescript
const sendAnswerMessage = async (
  targetId: string,
  payload: any,
  result: CALLKIT_CMD_MSG_RESULT_TYPE = CALLKIT_CMD_MSG_RESULT_TYPE.ACCEPT
): Promise<Chat.SendMsgResult> => {
  // ...发送 answerCall 信令的逻辑
}
```

### 4. 新增被叫方应答通话的 composable

**文件**: `lib/composables/useAnswerCall.ts` (新建)

创建新的组合式 API，提供被叫方接受、拒绝通话的方法：

- `acceptCall()`: 被叫方接受通话
  - 发送 answerCall 信令（result: accept）
  - 更新状态为 ANSWER_CALL
  - 预留 RTC 加入频道的接口

- `rejectCall()`: 被叫方拒绝通话
  - 发送 answerCall 信令（result: refuse）
  - 重置通话状态

- `busyRejectCall()`: 被叫方忙碌拒绝通话
  - 发送 answerCall 信令（result: busy）
  - 重置通话状态

### 5. 导出新的 composable

**文件**: 
- `lib/index.ts`: 导出 `useAnswerCall`
- `lib/types.ts`: 导出 `UseAnswerCallReturn` 类型

## 一对一通话信令流程

### 主叫方流程
1. 发送 invite 文本消息
2. 收到被叫方的 alert 信令
3. 发送 confirmRing 信令
4. 收到被叫方的 answerCall 信令（result: accept/refuse/busy）
5. **如果 result 为 accept**：
   - 发送 confirmCallee 信令
   - **更新状态为 IN_CALL**
   - 加入 RTC 频道（TODO）
6. **如果 result 为 refuse/busy**：
   - 发送 confirmCallee 信令
   - 调用 handleRemoteRefuse() 挂断

### 被叫方流程
1. 收到 invite 文本消息
2. 发送 alert 信令
3. 收到主叫方的 confirmRing 信令
4. **用户点击接听**：调用 `useAnswerCall().acceptCall()`
   - 发送 answerCall 信令（result: accept）
   - 更新状态为 ANSWER_CALL
   - 加入 RTC 频道（TODO）
5. **用户点击拒绝**：调用 `useAnswerCall().rejectCall()`
   - 发送 answerCall 信令（result: refuse）
   - 重置状态为 IDLE

## 使用示例

```typescript
import { useAnswerCall } from 'easemob-chat-callkit-vue3'

// 在被叫方的接听界面组件中
const { acceptCall, rejectCall } = useAnswerCall()

// 点击接听按钮
const handleAccept = async () => {
  try {
    await acceptCall()
    // 接听成功，等待通话建立
  } catch (error) {
    console.error('接听失败:', error)
  }
}

// 点击拒绝按钮
const handleReject = async () => {
  try {
    await rejectCall()
    // 拒绝成功
  } catch (error) {
    console.error('拒绝失败:', error)
  }
}
```

## 待完成事项（标记为 TODO）

1. **RTC 频道加入逻辑**：
   - 主叫方收到 accept 后，需要加入 RTC 频道
   - 被叫方接受通话后，需要加入 RTC 频道
   - 目前代码中已预留接口注释

2. **多人通话信令逻辑**：
   - 当前仅完成一对一通话
   - 多人通话的信令处理逻辑需要进一步完善

3. **cancelCall 和 leaveCall 信令的处理**：
   - `handleSignalMessage` 中这两个 case 目前为空
   - 需要补充相应的处理逻辑

## 测试建议

1. 测试一对一语音/视频呼叫的完整流程
2. 测试被叫方接受通话，主叫方是否正确进入 IN_CALL 状态
3. 测试被叫方拒绝通话，主叫方是否正确挂断
4. 测试多端登录场景下的信令处理
5. 测试超时场景
