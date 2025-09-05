# Signal 模块快速上手

## 📋 模块结构

```
signal/
├── SignalManager.ts      # 信令管理器
├── handlers/
│   ├── CallHandler.ts     # 通话处理器
│   ├── MessageHandler.ts  # 消息处理器
│   └── PresenceHandler.ts # 在线状态处理器
├── index.ts              # 统一导出
├── DEMO.ts               # 完整演示
└── USAGE_EXAMPLE.ts      # 使用示例
```

## 🚀 5分钟上手

### 1. 创建实例
```typescript
import { SignalManager, CallHandler, MessageHandler } from './index';

const signalManager = new SignalManager();
const callHandler = new CallHandler(signalManager);
const messageHandler = new MessageHandler(signalManager);
```

### 2. 基本操作

#### 📞 通话操作
```typescript
// 发起通话
await callHandler.sendCallInvite('user123', 1, {  // 1 = 视频通话
  channelName: 'room-001',
  callId: 'call-001',
  inviteMsgContent: '来视频聊天吧！'
});

// 接听通话
await callHandler.sendCallAnswer('user123', 'call-001', 1, 'device-001');  // 1 = 接受

// 挂断通话
await callHandler.sendCallEnd('user123', 'call-001', 'user_hangup');
```

#### 💬 消息操作
```typescript
// 发送文本消息
await messageHandler.sendTextMessage('user123', '你好！');

// 发送图片消息
await messageHandler.sendImageMessage('user123', {
  url: 'https://example.com/image.jpg',
  width: 800,
  height: 600
});
```

### 3. 事件监听
```typescript
// 监听通话事件
callHandler.on('call:invite', (data: any) => {
  console.log('收到通话邀请:', data);
});

callHandler.on('call:connected', (data: any) => {
  console.log('通话已连接:', data);
});

// 监听消息事件
messageHandler.on('message:received', (data: any) => {
  console.log('收到新消息:', data);
});
```

### 4. 状态查询
```typescript
// 获取当前通话
const currentCall = callHandler.getActiveCall('call-001');

// 获取所有活跃通话
const allCalls = callHandler.getAllActiveCalls();

// 获取待处理邀请
const pendingInvite = callHandler.getPendingInvite('call-001');
```

## 🎯 完整演示

运行演示文件查看完整流程：
```typescript
import { runDemo } from './DEMO';

runDemo(); // 自动演示所有功能
```

## 📊 使用场景

| 场景 | 使用方法 |
|------|----------|
| 一对一视频通话 | `callHandler.sendCallInvite()` |
| 语音通话 | `callHandler.sendCallInvite(..., 2)` |
| 群组消息 | `messageHandler.sendTextMessage('group-001', '消息')` |
| 文件传输 | `messageHandler.sendFileMessage()` |

## 🧹 资源清理

```typescript
// 组件卸载时清理
useEffect(() => {
  return () => {
    callHandler.destroy();
    messageHandler.destroy();
    signalManager.destroy();
  };
}, []);
```