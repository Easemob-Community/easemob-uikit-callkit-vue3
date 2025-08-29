/**
 * 信令相关类型定义 - Signal Types
 * 
 * 职责：
 * 1. 定义所有信令相关的TypeScript类型
 * 2. 提供类型安全的信令数据结构
 * 3. 支持类型推导和IDE智能提示
 * 4. 保持前后端信令格式的一致性
 * 
 * 类型分类：
 * - 基础信令类型：定义信令的基本结构
 * - 通话信令类型：通话相关的信令数据
 * - 消息信令类型：消息相关的信令数据
 * - 状态信令类型：状态同步相关的信令数据
 * 
 * 使用方式：
 * ```typescript
 * import type { CallSignal, MessageSignal, SignalType } from '@easemob/chat-callkit'
 * 
 * // 定义通话邀请信令
 * const inviteSignal: CallSignal = {
 *   type: 'call:invite',
 *   data: {
 *     callerId: 'user123',
 *     callType: 'video',
 *     targetId: 'user456'
 *   }
 * }
 * ```
 */

// TODO: 定义信令相关的TypeScript类型