/**
 * 连接状态管理 - ConnectionState
 * 
 * 职责：
 * 1. 管理chatClient的连接状态（连接中、已连接、断开、重连等）
 * 2. 提供响应式的连接状态供组件使用
 * 3. 处理连接异常和自动重连
 * 4. 暴露连接状态查询接口
 * 
 * 状态流转：
 * disconnected -> connecting -> connected -> disconnected
 *                    ↓
 *               reconnecting -> connected
 * 
 * 使用方式：
 * ```typescript
 * const connectionState = useConnectionState()
 * 
 * // 在组件中使用
 * const { isConnected, isConnecting, connectionError } = connectionState
 * 
 * // 监听状态变化
 * watch(() => connectionState.isConnected, (newVal) => {
 *   if (newVal) {
 *     // 连接成功，可以开始监听信令
 *   }
 * })
 * ```
 */

export interface ConnectionState {
  // TODO: 定义连接状态接口
}