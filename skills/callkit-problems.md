---
name: callkit-problems
description: >
  记录 Easemob Chat CallKit Vue3 编写过程中遇到的典型问题及根因分析。
  供后续评估整体 CallKit 设计方案/架构时参考。
---

# CallKit 编写过程中遇到的问题

## 问题 1：resourceId 固定导致离线消息重投，过期 invite 引起重复弹窗

### 现象

同一用户在不同设备/浏览器登录（resourceId 固定为 `webim_web_xxxx`），重新登录后 IM 服务端会把该用户在其他设备上已收到的离线消息重新投递一遍。过期的通话邀请（invite）文本消息会触发 `InvitationNotification` 弹窗，随后大量过期的 cancelCall / confirmCallee / leaveCall cmd 信令涌入。

### 日志特征

```
收到文本消息，发送方: pfh
开始处理通话邀请，发送方: pfh
[邀请处理] 当前通话状态: 0, 目标状态IDLE: 0
通话状态已更新至ALERTING
InvitationNotification: 显示通话邀请弹窗

// 随后大量过期信令，callId 均不匹配当前通话
cancelCall信令消息通话callId与当前通话callId不一致，不做处理
confirmCallee信令消息通话callId与当前通话callId不一致，不做处理
leaveCall信令消息通话callId与当前通话callId不一致，不做处理
```

### 根因分析

`handleInvitationMessage`（invite 文本消息处理入口）的校验过于薄弱，只检查了：
1. 是否是自己发的消息
2. 当前通话状态是否为 IDLE

**缺失校验**：
- **单聊 calleeDevId 匹配**：invite 消息 `ext.calleeDevId` 是目标设备的 resourceId，但代码完全没校验
- **消息时效性**：没有判断消息发送时间与当前时间的差值
- **群聊 invitedMembers 匹配**：虽然 Vue3 版本做了，但 React 版本也没做

### 修复方案（Vue3 已实施）

**防线一：单聊 calleeDevId 校验**

```ts
if (!isGroupCall && ext?.calleeDevId) {
  const currentDeviceId = chatClientStore.getClientDeviceId
  if (currentDeviceId && ext.calleeDevId !== currentDeviceId) {
    // 忽略：这条 invite 是发给另一个设备的
    return
  }
}
```

**防线二：消息时间戳过期判断**

```ts
// invite 文本消息：超过 inviteTimeout + 10s 忽略
if (message.time && isMessageExpired(message.time, inviteTimeout + 10000)) {
  return
}

// cmd 信令消息：超过 60 秒忽略
if (message.time && isMessageExpired(message.time, 60000)) {
  return
}
```

### React 版本对比

**React 版本（callkit/services/CallService.ts）存在完全相同的漏洞**：
- `handleInvitationMessage` 完全没有 `calleeDevId` 校验
- `handleInvitationMessage` 完全没有时间戳过期判断
- `handleInvitationMessage` 完全没有 `message.to` 或 `invitedMembers` 校验

React 版本只在 `handleConfirmRingMessage`（第2453行）和 `handleConfirmCalleeMessage`（第2633行）中做了 `calleeDevId !== clientResource` 的校验，但这些都是**收到 cmd 信令后**的处理，不是 invite 文本消息的入口过滤。

### 后续评估建议

- 统一 CallKit（React/Vue/iOS/Android）的 invite 入口校验标准
- 信令协议层面是否需要在服务端做 resourceId 路由优化，避免固定 resourceId 导致的消息重投
- 评估是否需要服务端支持 "设备级离线消息过滤"（只投递给当前在线设备的 resourceId）
