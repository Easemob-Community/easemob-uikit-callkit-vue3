/**
 * Signal 模块 - 最简易组合示例
 * 展示signal模块的使用方式，不包含具体逻辑
 */

// 导出核心管理器
export { SignalManager } from './SignalManager';

// 导出处理器
export { CallHandler } from './handlers/CallHandler';
export { MessageHandler } from './handlers/MessageHandler';
export { PresenceHandler } from './handlers/PresenceHandler';

// 导出类型定义
export * from '../../types/signal.types';

// 使用示例：
/*
import { SignalManager, CallHandler, MessageHandler } from '@lib/core/signal';

// 1. 创建信号管理器
const signalManager = new SignalManager();

// 2. 创建处理器
const callHandler = new CallHandler(signalManager);
const messageHandler = new MessageHandler(signalManager);

// 3. 使用处理器
// 发送通话邀请
callHandler.sendCallInvite('targetUser', CallType.SINGLE_VIDEO, {
  channelName: 'channel-123',
  callId: 'call-001',
  inviteMsgContent: '邀请您视频通话'
});

// 监听通话事件
callHandler.on('call:invite', (data) => {
  console.log('收到通话邀请:', data);
});

// 发送消息
messageHandler.sendTextMessage('targetUser', 'Hello World');

// 4. 清理资源
// callHandler.destroy();
// messageHandler.destroy();
*/