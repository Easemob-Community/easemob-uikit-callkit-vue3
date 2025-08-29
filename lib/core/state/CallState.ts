/**
 * 通话状态管理 - CallState
 * 
 * 职责：
 * 1. 管理当前通话的所有状态信息
 * 2. 提供响应式的通话状态供UI组件使用
 * 3. 处理通话状态的一致性验证
 * 4. 支持多人通话的状态同步
 * 
 * 状态类型：
 * - idle: 空闲状态
 * - inviting: 邀请中
 * - ringing: 响铃中
 * - connecting: 连接中
 * - connected: 通话中
 * - ended: 已结束
 * 
 * 使用方式：
 * ```typescript
 * const callState = useCallState()
 * 
 * // 获取当前通话信息
 * const { currentCall, callType, participants, callDuration } = callState
 * 
 * // 监听通话状态变化
 * callState.onStateChange((newState, oldState) => {
 *   console.log(`通话状态从 ${oldState} 变为 ${newState}`)
 * })
 * ```
 */

export interface CallState {
  // TODO: 定义通话状态接口
}