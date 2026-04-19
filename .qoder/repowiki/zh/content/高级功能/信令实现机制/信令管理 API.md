# 信令管理 API

<cite>
**本文档引用的文件**
- [useSignalManager.ts](file://lib/composables/useSignalManager.ts)
- [useAnswerCall.ts](file://lib/composables/useAnswerCall.ts)
- [ChatService.ts](file://lib/services/ChatService.ts)
- [CallService.ts](file://callkit/services/CallService.ts)
- [callState.ts](file://lib/store/callState.ts)
- [callstate.types.ts](file://lib/types/callstate.types.ts)
- [signal.types.ts](file://lib/types/signal.types.ts)
- [index.ts](file://lib/index.ts)
- [SIGNALING_IMPLEMENTATION.md](file://lib/SIGNALING_IMPLEMENTATION.md)
</cite>

## 更新摘要
**变更内容**
- 扩展了信号类型定义，新增 invitedMembers 字段支持群组通话中的参与者跟踪
- 更新了 ChatService 中的邀请消息格式，增加被邀请成员列表支持
- 增强了群组通话的信令处理能力，支持动态参与者管理和状态跟踪
- 完善了群组通话的邀请消息扩展字段，提供更完整的参与者信息

## 目录
1. [简介](#简介)
2. [项目结构](#项目结构)
3. [核心组件](#核心组件)
4. [架构概览](#架构概览)
5. [详细组件分析](#详细组件分析)
6. [依赖关系分析](#依赖关系分析)
7. [性能考虑](#性能考虑)
8. [故障排除指南](#故障排除指南)
9. [结论](#结论)

## 简介

信令管理 API 是环信聊天和音视频通话功能的核心模块，提供了完整的信令发送和接收组合式 API。本文档详细介绍 useSignalManager 和 useAnswerCall 组合式 API 的完整接口说明，包括每个函数的参数、返回值和使用场景。

该 API 架构基于 Vue3 组合式函数设计，采用分层架构模式，将信令管理、状态管理和服务层清晰分离。系统支持一对一和多人音视频通话，提供完整的信令流程处理，包括邀请、响铃、接听、拒绝、忙碌拒绝和挂断等操作。

**更新** 新增对群组通话中参与者跟踪的支持，通过 invitedMembers 字段实现动态参与者管理和状态跟踪。

## 项目结构

```mermaid
graph TB
subgraph "lib/composables"
SM[useSignalManager.ts]
AC[useAnswerCall.ts]
CS[useCallService.ts]
JC[useJoinChannel.ts]
RC[useRtcService.ts]
end
subgraph "lib/services"
CHS[ChatService.ts]
CLS[CallService.ts]
RTS[RtcService.ts]
end
subgraph "lib/store"
CST[callState.ts]
RCS[rtcChannel.ts]
end
subgraph "lib/types"
CT[callstate.types.ts]
ST[signal.types.ts]
end
SM --> CHS
AC --> SM
AC --> CST
CLS --> SM
CLS --> CST
CLS --> RCS
CHS --> CT
CHS --> ST
CST --> CT
```

**图表来源**
- [useSignalManager.ts](file://lib/composables/useSignalManager.ts#L1-L354)
- [useAnswerCall.ts](file://lib/composables/useAnswerCall.ts#L1-L168)
- [ChatService.ts](file://lib/services/ChatService.ts#L1-L249)
- [CallService.ts](file://callkit/services/CallService.ts#L1-L298)

**章节来源**
- [index.ts](file://lib/index.ts#L1-L58)

## 核心组件

### useSignalManager 组合式 API

useSignalManager 是信令管理的核心组合式函数，提供统一的信令发送接口。它封装了所有通话相关的信令发送逻辑，包括邀请、响铃、接听、拒绝、忙碌拒绝和挂断等操作。

#### 主要功能

1. **邀请消息发送** - 支持一对一和群组通话邀请，包含被邀请成员列表
2. **通话状态信令** - 处理 alert、confirmRing、answerCall 等状态信令
3. **通话控制信令** - 处理 cancelCall、leaveCall 等控制信令
4. **错误处理和日志记录** - 提供完整的错误处理和调试信息

#### 核心接口

| 函数名 | 参数 | 返回值 | 描述 |
|--------|------|--------|------|
| sendInviteMessage | targetId: string \| string[], chatType: Chat.ChatType, message: string, groupId?: string | Promise<Chat.SendMsgResult> | 发送通话邀请消息，支持群组通话的被邀请成员列表 |
| sendAnswerMessage | targetId: string, payload: any, result?: CALLKIT_CMD_MSG_RESULT_TYPE | Promise<Chat.SendMsgResult> | 发送通话应答信令 |
| sendCancelMessage | to: string, chatType: "singleChat" \| "groupChat", receiverList?: string[] | Promise<Chat.SendMsgResult> | 发送取消通话信令 |
| sendLeaveMessage | to: string, chatType: "singleChat" \| "groupChat", receiverList?: string[] | Promise<Chat.SendMsgResult> | 发送离开通话信令 |
| sendBusyAnswerMessage | targetId: string, payload: any | Promise<Chat.SendMsgResult> | 发送忙碌拒绝信令 |
| sendAlertMessage | targetId: string | Promise<Chat.SendMsgResult> | 发送响铃信令 |
| sendConfirmRingMessage | targetId: string, payload: any | Promise<Chat.SendMsgResult> | 发送确认响铃信令 |
| sendConfirmCalleeMessage | targetId: string, payload: any | Promise<Chat.SendMsgResult> | 发送确认被叫方状态信令 |

**更新** 新增对群组通话的支持，sendInviteMessage 函数现在支持发送给多个目标用户，并自动包含被邀请成员列表。

**章节来源**
- [useSignalManager.ts](file://lib/composables/useSignalManager.ts#L7-L42)

### useAnswerCall 组合式 API

useAnswerCall 是被叫方应答通话的专用组合式函数，提供接受、拒绝和忙碌拒绝通话的方法。它基于 useSignalManager 实现，专门处理被叫方的通话应答逻辑。

#### 核心功能

1. **接受通话** - 发送 answerCall 信令（result: accept）
2. **拒绝通话** - 发送 answerCall 信令（result: refuse）
3. **忙碌拒绝** - 发送 answerCall 信令（result: busy）
4. **状态管理** - 自动管理通话状态转换
5. **超时处理** - 处理邀请超时逻辑

#### 主要接口

| 函数名 | 参数 | 返回值 | 描述 |
|--------|------|--------|------|
| acceptCall | 无 | Promise<void> | 被叫方接受通话 |
| rejectCall | 无 | Promise<void> | 被叫方拒绝通话 |
| busyRejectCall | 无 | Promise<void> | 被叫方忙碌拒绝通话 |

**章节来源**
- [useAnswerCall.ts](file://lib/composables/useAnswerCall.ts#L7-L14)

## 架构概览

```mermaid
sequenceDiagram
participant Caller as 主叫方
participant SM as 信令管理器
participant Chat as 聊天服务
participant Callee as 被叫方
participant State as 状态管理
Caller->>SM : 发送邀请消息含被邀请成员列表
SM->>Chat : 发送文本消息包含invitedMembers
Chat-->>Caller : 邀请消息ID
Chat-->>Callee : 收到邀请消息包含被邀请成员列表
Callee->>SM : 发送alert信令
SM->>Chat : 发送alert信令
Chat-->>Caller : alert信令
Caller->>SM : 发送confirmRing信令
SM->>Chat : 发送confirmRing信令
Chat-->>Callee : confirmRing信令
Callee->>SM : 发送answerCall信令
SM->>Chat : 发送answerCall信令
Chat-->>Caller : answerCall信令
alt 接受通话
Caller->>SM : 发送confirmCallee信令
SM->>Chat : 发送confirmCallee信令
SM->>State : 更新状态为IN_CALL，移除已接受成员
else 拒绝或忙碌
Caller->>SM : 发送confirmCallee信令
SM->>Chat : 发送confirmCallee信令
SM->>State : 重置通话状态
end
```

**更新** 新增对被邀请成员列表的处理流程，包括邀请消息发送时的成员列表传递和通话确认后的成员状态更新。

**图表来源**
- [useSignalManager.ts](file://lib/composables/useSignalManager.ts#L104-L139)
- [useAnswerCall.ts](file://lib/composables/useAnswerCall.ts#L28-L76)

## 详细组件分析

### 信令管理器类图

```mermaid
classDiagram
class UseSignalManagerReturn {
+sendInviteMessage(targetId, chatType, message, groupId) Promise
+sendAnswerMessage(targetId, payload, result) Promise
+sendCancelMessage(to, chatType, receiverList) Promise
+sendLeaveMessage(to, chatType, receiverList) Promise
+sendBusyAnswerMessage(targetId, payload) Promise
+sendAlertMessage(targetId) Promise
+sendConfirmRingMessage(targetId, payload) Promise
+sendConfirmCalleeMessage(targetId, payload) Promise
}
class ChatService {
-private chatClient : Chat.Connection
-private callStateStore : CallStateStore
+sendTextMessage(targetId, chatType, message, groupId) Promise
+sendSignalMessage(targetId, action, chatType, ext, isDirect, result, receiverList) Promise
-buildInviteMessageExt() InviteSignalingExt
-buildSignalingMessageExt(action, ext, result) SignalingExt
}
class CallService {
-private callStateStore : CallStateStore
-private chatClientStore : ChatClientStore
-private rtcChannelStore : RtcChannelStore
+hangup(reason) Promise
+cancelCall() Promise
+handleRemoteCancel() Promise
+handleRemoteRefuse() Promise
+handleAbnormalEnd() Promise
-executeHangupStrategy(reason) Promise
-handleNormalHangupStrategy(reason) Promise
-handleCancelStrategy() Promise
-cleanupMediaResources() Promise
-cleanupConnection() Promise
-resetState(reason) void
}
UseSignalManagerReturn --> ChatService : 使用
CallService --> UseSignalManagerReturn : 调用
CallService --> ChatService : 间接使用
```

**更新** ChatService 现在包含对 invitedMembers 字段的处理逻辑，支持群组通话中的参与者跟踪。

**图表来源**
- [useSignalManager.ts](file://lib/composables/useSignalManager.ts#L7-L42)
- [ChatService.ts](file://lib/services/ChatService.ts#L17-L24)
- [CallService.ts](file://callkit/services/CallService.ts#L9-L298)

### 通话状态管理

```mermaid
stateDiagram-v2
[*] --> IDLE : 初始化
IDLE --> INVITING : 发送邀请
INVITING --> ALERTING : 收到alert
ALERTING --> CONFIRM_RING : 发送confirmRing
CONFIRM_RING --> ANSWER_CALL : 收到answerCall(accept)
ALERTING --> ANSWER_CALL : 收到answerCall(refuse/busy)
ANSWER_CALL --> CONFIRM_CALLEE : 发送confirmCallee
CONFIRM_CALLEE --> IN_CALL : 被叫方接受
IN_CALL --> [*] : 挂断
ANSWER_CALL --> [*] : 重置状态
INVITING --> [*] : 超时
ALERTING --> [*] : 超时
```

**更新** 群组通话场景下，状态转换会涉及被邀请成员列表的动态更新和参与者状态管理。

**图表来源**
- [callstate.types.ts](file://lib/types/callstate.types.ts#L13-L22)
- [callState.ts](file://lib/store/callState.ts#L114-L131)

### 信令发送流程

```mermaid
flowchart TD
Start([开始信令发送]) --> ValidateInput["验证输入参数"]
ValidateInput --> CheckClient["检查ChatClient初始化"]
CheckClient --> ClientValid{"客户端有效?"}
ClientValid --> |否| ThrowError["抛出错误"]
ClientValid --> |是| CreateService["创建ChatService实例"]
CreateService --> BuildMessage["构建消息内容<br/>包含被邀请成员列表"]
BuildMessage --> SendMsg["发送消息"]
SendMsg --> LogSuccess["记录成功日志"]
SendMsg --> LogError["记录错误日志"]
LogSuccess --> ReturnResult["返回结果"]
LogError --> ThrowError
ThrowError --> End([结束])
ReturnResult --> End
```

**更新** 新增对被邀请成员列表的处理步骤，在构建消息内容时自动包含 invitedMembers 字段。

**图表来源**
- [useSignalManager.ts](file://lib/composables/useSignalManager.ts#L57-L102)
- [ChatService.ts](file://lib/services/ChatService.ts#L144-L187)

**章节来源**
- [useSignalManager.ts](file://lib/composables/useSignalManager.ts#L50-L353)
- [useAnswerCall.ts](file://lib/composables/useAnswerCall.ts#L20-L167)

## 依赖关系分析

```mermaid
graph LR
subgraph "外部依赖"
SDK[Easemob IM SDK]
Pinia[Pinia状态管理]
Vue[Vue3组合式API]
end
subgraph "内部模块"
SM[useSignalManager]
AC[useAnswerCall]
CS[ChatService]
CLS[CallService]
CST[callState]
CT[callstate.types]
ST[signal.types]
end
SDK --> CS
Pinia --> CST
Vue --> SM
Vue --> AC
SM --> CS
AC --> SM
CLS --> SM
CST --> CT
CS --> CT
CS --> ST
```

**更新** 新增 signal.types 依赖关系，ChatService 现在依赖 signal.types 来处理扩展的信令类型定义。

**图表来源**
- [useSignalManager.ts](file://lib/composables/useSignalManager.ts#L1-L5)
- [useAnswerCall.ts](file://lib/composables/useAnswerCall.ts#L1-L5)
- [ChatService.ts](file://lib/services/ChatService.ts#L1-L16)
- [callState.ts](file://lib/store/callState.ts#L1-L6)
- [signal.types.ts](file://lib/types/signal.types.ts#L1-L198)

### 核心依赖关系

1. **ChatService 依赖关系**
   - 依赖 Chat SDK 进行消息发送
   - 依赖 Pinia store 获取通话状态
   - 依赖 callstate.types 定义信令格式
   - **新增** 依赖 signal.types 处理扩展的信令类型，包括 invitedMembers 字段

2. **useSignalManager 依赖关系**
   - 依赖 ChatService 处理具体消息发送
   - 依赖 Pinia store 管理客户端状态
   - 依赖 logger 进行调试输出

3. **CallService 依赖关系**
   - 依赖 useSignalManager 发送控制信令
   - 依赖多个 store 进行状态管理
   - 依赖 RTC 服务进行媒体处理

**章节来源**
- [ChatService.ts](file://lib/services/ChatService.ts#L17-L249)
- [callState.ts](file://lib/store/callState.ts#L1-L263)
- [signal.types.ts](file://lib/types/signal.types.ts#L1-L198)

## 性能考虑

### 信令发送优化

1. **异步处理** - 所有信令发送都是异步操作，避免阻塞主线程
2. **错误缓存** - 使用 try-catch 包装，防止错误传播影响整体系统
3. **日志分级** - 不同级别的日志使用不同的记录级别，减少不必要的日志输出

### 内存管理

1. **状态清理** - 通话结束后自动清理状态和定时器
2. **定时器管理** - 邀请超时后自动清理定时器，防止内存泄漏
3. **资源释放** - 挂断时自动释放媒体资源和连接

### 并发控制

1. **状态检查** - 发送信令前检查当前通话状态，避免无效操作
2. **重复调用防护** - 防止同一操作的重复调用
3. **超时机制** - 提供邀请超时机制，避免长时间等待

**更新** 新增对群组通话场景的性能考虑，包括被邀请成员列表的内存管理和动态更新优化。

## 故障排除指南

### 常见错误及解决方案

#### ChatClient 未初始化
**问题描述**: 尝试发送信令时发现 ChatClient 未初始化
**解决方案**: 
- 确保在 Provider 组件中正确初始化 ChatClient
- 检查用户登录状态
- 验证 appKey、userId、accessToken 配置

#### 通话状态异常
**问题描述**: 通话状态无法正常转换或出现状态冲突
**解决方案**:
- 检查状态转换逻辑
- 确认信令处理顺序
- 验证多端登录场景下的状态同步

#### 信令发送失败
**问题描述**: 信令发送过程中出现网络错误或服务器错误
**解决方案**:
- 检查网络连接状态
- 验证用户权限和Token有效性
- 查看服务器返回的具体错误信息

#### 超时处理问题
**问题描述**: 邀请超时后界面未正确关闭或状态未重置
**解决方案**:
- 检查超时定时器设置
- 验证超时回调函数执行
- 确认多人通话场景下的特殊处理逻辑

#### 群组通话参与者跟踪问题
**问题描述**: 被邀请成员列表显示不正确或状态更新异常
**解决方案**:
- 检查 invitedMembers 字段的数据结构
- 验证成员列表的去重逻辑
- 确认通话状态转换时的成员状态更新

### 调试建议

1. **启用调试模式**: 设置 debug: true 获取详细日志
2. **监控状态变化**: 使用浏览器开发者工具监控 Pinia store 状态
3. **网络请求追踪**: 检查信令消息的发送和接收情况
4. **错误堆栈分析**: 查看完整的错误堆栈信息定位问题
5. **群组通话调试**: 特别关注被邀请成员列表的传递和更新过程

**章节来源**
- [useSignalManager.ts](file://lib/composables/useSignalManager.ts#L57-L64)
- [callState.ts](file://lib/store/callState.ts#L115-L131)

## 结论

信令管理 API 提供了完整、可靠的音视频通话信令处理能力。通过 useSignalManager 和 useAnswerCall 组合式 API，开发者可以轻松实现复杂的通话场景，包括一对一和多人通话、各种通话状态转换和错误处理。

**更新** 新版本增强了对群组通话的支持，通过 invitedMembers 字段实现了完整的参与者跟踪和管理功能。这一改进使得群组通话的用户体验更加完善，支持动态参与者管理和实时状态同步。

该 API 的设计遵循了 Vue3 最佳实践，采用组合式函数模式，具有良好的可维护性和扩展性。同时，完善的错误处理机制和状态管理确保了系统的稳定性和可靠性。

建议在实际项目中：
1. 仔细阅读并理解信令流程
2. 正确处理各种异常情况
3. 合理使用超时和重试机制
4. 做好性能优化和内存管理
5. 充分利用调试工具进行问题排查
6. **新增** 在群组通话场景下特别注意被邀请成员列表的管理和状态同步

通过合理使用这些 API，可以快速构建高质量的音视频通话应用，特别是支持多人参与的复杂通话场景。