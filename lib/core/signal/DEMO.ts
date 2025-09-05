/**
 * Signal 模块演示文件
 * 展示最直观的使用方式
 */

// 1. 导入所有模块（使用实际版本）
import { SignalManager } from './SignalManager';
import { CallHandler } from './handlers/CallHandler';
import { MessageHandler } from './handlers/MessageHandler';

// 2. 创建核心实例
const signalManager = new SignalManager();
const callHandler = new CallHandler(signalManager);
const messageHandler = new MessageHandler(signalManager);

// 3. 完整使用流程演示

// ===== 场景1：一对一视频通话 =====
async function demoVideoCall() {
  console.log('=== 开始视频通话演示 ===');
  
  // 步骤1：用户A发起视频通话
  await callHandler.sendCallInvite('userB', 1, {
    channelName: 'private-room-001',
    callId: 'call-001',
    inviteMsgContent: '来视频聊天吧！'
  });
  
  // 步骤2：用户B收到邀请并接听
  await callHandler.sendCallAnswer('userA', 'call-001', 1, 'device-B');
  
  // 步骤3：通话中用户A切换到语音
  await callHandler.sendVideoToVoice('userB', 'call-001');
  
  // 步骤4：用户A挂断通话
  await callHandler.sendCallEnd('userB', 'call-001', 'user_hangup');
  
  console.log('=== 视频通话演示完成 ===');
}

// ===== 场景2：群组消息 =====
async function demoGroupMessaging() {
  console.log('=== 开始群组消息演示 ===');
  
  // 发送文本消息
  await messageHandler.sendTextMessage('group-001', '大家好！');
  
  // 发送图片消息
  await messageHandler.sendImageMessage('group-001', {
    url: 'https://example.com/cat.jpg',
    width: 800,
    height: 600
  });
  
  console.log('=== 群组消息演示完成 ===');
}

// ===== 场景3：事件监听 =====
function setupEventListeners() {
  console.log('=== 设置事件监听 ===');
  
  // 监听通话事件
  callHandler.on('call:invite', (data: any) => {
    console.log('📞 收到通话邀请:', data);
    // 实际应用中：弹出接听界面
  });
  
  callHandler.on('call:connected', (data: any) => {
    console.log('✅ 通话已连接:', data);
    // 实际应用中：显示通话界面
  });
  
  callHandler.on('call:end', (data: any) => {
    console.log('☎️ 通话结束:', data);
    // 实际应用中：关闭通话界面
  });
  
  // 监听消息事件
  messageHandler.on('message:received', (data: any) => {
    console.log('💬 收到新消息:', data);
    // 实际应用中：更新消息列表
  });
}

// ===== 场景4：状态查询 =====
function demoStateQuery() {
  console.log('=== 状态查询演示 ===');
  
  // 查询当前通话
  const currentCall = callHandler.getActiveCall('call-001');
  console.log('当前通话:', currentCall);
  
  // 查询所有活跃通话
  const allCalls = callHandler.getAllActiveCalls();
  console.log('活跃通话列表:', allCalls);
  
  // 查询待处理邀请
  const pendingInvite = callHandler.getPendingInvite('call-001');
  console.log('待处理邀请:', pendingInvite);
}

// 5. 完整演示流程
async function runDemo() {
  console.log('🚀 开始 Signal 模块演示...\n');
  
  // 设置事件监听
  setupEventListeners();
  
  // 运行演示场景
  await demoVideoCall();
  console.log('');
  
  await demoGroupMessaging();
  console.log('');
  
  demoStateQuery();
  
  console.log('\n✅ Signal 模块演示完成！');
}

// 6. 清理函数（实际应用中使用）
function cleanup() {
  callHandler.destroy();
  messageHandler.destroy();
  signalManager.destroy();
  console.log('🧹 资源已清理');
}

// 7. 导出给外部使用
export {
  signalManager,
  callHandler,
  messageHandler,
  runDemo,
  cleanup
};

// 8. 如果直接运行此文件
if (import.meta.main) {
  runDemo();
}