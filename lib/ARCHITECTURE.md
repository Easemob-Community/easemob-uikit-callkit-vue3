# 通话组件架构设计

本文档描述了通话组件的架构设计、文件结构和使用方式，帮助开发者理解和使用这套组件系统。

## 1. 架构概述

通话组件采用了清晰的分层架构，主要包括以下几层：

- **类型定义层**：提供纯类型接口定义，位于 `core/state/` 和 `types/` 目录
- **服务层**：实现业务逻辑，位于 `services/` 目录
- **组合式API层**：连接服务层和UI组件，提供响应式状态管理，位于 `composables/` 目录
- **组件层**：提供可复用的UI组件，位于 `components/` 目录

![架构图](https://placeholder-for-architecture-diagram.com)

## 2. 核心文件结构

### 2.1 类型定义

- **`store/types.ts`**：定义通话状态相关的类型接口，包括通话状态、参与者信息等
- **`types.ts`**：定义核心的类型接口，如CallKit实例、配置等
- **`types/signal.types.ts`**：定义信令相关的类型

### 2.2 服务层

- **`services/CallService.ts`**：封装通话相关的业务逻辑，协调各个子系统
- **`services/ChatService.ts`**：封装聊天相关的业务逻辑
- **`services/RtcService.ts`**：封装实时通信相关的业务逻辑

### 2.3 组合式API层

- **`composables/useCallState.ts`**：响应式通话状态管理
- **`composables/useCallService.ts`**：通话服务的组合式API封装
- **`composables/useListenerManager.ts`**：监听器管理和全局状态更新
- **`composables/useSignalManager.ts`**：信令发送管理
- **`composables/useCallKit.ts`**：CallKit实例的访问和操作
- **`composables/useChatService.ts`**：聊天服务的组合式API封装
- **`composables/useRtcService.ts`**：实时通信服务的组合式API封装

## 3. 响应式状态管理

响应式状态管理是本架构的核心部分，采用了"接口定义+响应式实现"的分离模式：

1. **纯类型定义**：在 `store/types.ts` 中定义纯接口
2. **响应式实现**：在 `store/callState.ts` 中使用Pinia创建响应式状态
3. **状态访问**：通过组合式API提供类型安全的状态访问和更新

### 3.1 CallState 接口

`CallState` 接口定义了通话的完整状态结构，包括：

- 基础状态：通话状态、是否在通话中、通话类型
- 当前通话信息：通话ID、参与者、开始时间等
- 来电信息：来电者ID、通话类型等
- 通话设置：音频、视频、扬声器等状态

### 3.2 useCallState 组合式API

`useCallState` 提供了响应式的状态管理功能，包括：

- 状态创建和访问
- 状态更新方法
- 状态重置功能
- 状态变化监听
- 辅助方法（如生成通话ID、计算通话时长等）

## 4. 服务层与组合式API的关系

服务层和组合式API层之间采用了明确的职责分离：

- **服务层**：专注于业务逻辑实现，不直接操作UI状态
- **组合式API层**：连接服务层和UI组件，管理响应式状态

### 4.1 CallService 与 useCallService

- `CallService`：实现通话的核心业务逻辑，如发起通话、接受通话、结束通话等
- `useCallService`：封装 `CallService`，提供响应式状态和组合式API接口

### 4.2 监听器管理

- `useListenerManager`：负责全局监听器的注册和管理，以及状态的同步更新

## 5. 使用示例

### 5.1 通话状态管理

```typescript
import { useCallState } from '@easemob/chat-callkit'

const { callState, updateCallState, onStateChange } = useCallState()

// 监听状态变化
onStateChange((newState, oldState) => {
  console.log('通话状态变化:', newState)
})

// 更新状态
updateCallState({
  status: 'connected',
  isInCall: true
})
```

### 5.2 通话操作

```typescript
import { useCallService } from '@easemob/chat-callkit'

// 假设已经创建了callService实例
const { startCall, acceptCall, endCall, currentCall, isInCall } = useCallService(callService)

// 发起通话
const handleStartCall = async (targetId: string, type: 'audio' | 'video') => {
  try {
    await startCall(targetId, type)
  } catch (error) {
    console.error('发起通话失败:', error)
  }
}

// 监听通话状态
watch(isInCall, (newIsInCall) => {
  console.log('是否在通话中:', newIsInCall)
})

// 获取当前通话信息
const callInfo = currentCall.value
if (callInfo) {
  console.log('当前通话参与者数量:', callInfo.participants.length)
}
```

### 5.3 监听器管理

```typescript
import { useListenerManager } from '@easemob/chat-callkit'

// 假设已经创建了signalManager实例
const { onCallInvite, addPendingInvite, pendingInvites } = useListenerManager(signalManager)

// 监听来电邀请
onCallInvite((invite) => {
  console.log('收到来电邀请:', invite)
  // 可以在这里显示来电界面
})

// 监听文本消息
onTextMessage((message) => {
  console.log('收到文本消息:', message)
})
```

## 6. 架构优点

1. **类型安全**：完整的TypeScript类型定义，提供良好的开发体验
2. **响应式状态**：使用Vue 3的响应式系统，状态变化自动反映到UI
3. **职责分离**：明确的分层架构，各组件职责清晰
4. **可扩展性**：易于添加新功能和修改现有功能
5. **测试友好**：纯类型定义和业务逻辑分离，便于单元测试

## 7. 扩展指南

### 7.1 添加新的状态字段

1. 在 `store/types.ts` 中的对应接口添加字段
2. 在 `composables/useCallState.ts` 中的初始状态添加默认值
3. 更新相关的状态更新方法

### 7.2 添加新的服务方法

1. 在服务类中添加新的方法实现业务逻辑
2. 在对应的组合式API中添加封装方法
3. 更新返回类型接口

### 7.3 添加新的监听器类型

1. 在 `useListenerManager.ts` 中添加新的监听器类型和方法
2. 更新 `ListenerManagerReturn` 接口
3. 在初始化方法中添加相应的监听器注册逻辑

## 8. 注意事项

1. **状态一致性**：避免直接修改响应式状态，使用提供的更新方法
2. **资源清理**：组件卸载时注意清理监听器，避免内存泄漏
3. **错误处理**：调用异步方法时注意处理可能的错误
4. **类型检查**：使用TypeScript的类型系统确保类型安全