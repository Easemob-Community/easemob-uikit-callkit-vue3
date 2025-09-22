import { computed, ref, type WatchStopHandle } from 'vue'
import { useCallStateStore } from '../store/callState'
import type { CallState as CallStateType, CallStatus, CurrentCallInfo } from '../store/types'

/**
 * 通话状态组合式API - useCallState
 * 
 * 职责：
 * 1. 提供Pinia store的组合式API封装
 * 2. 提供类型安全的通话状态访问接口
 * 3. 简化状态更新操作
 * 4. 提供状态变化监听功能
 * 
 * 使用方式：
 * ```typescript
 * const { 
 *   callState, 
 *   updateCallState, 
 *   resetCallState, 
 *   onStateChange 
 * } = useCallState()
 * 
 * // 监听状态变化
 * onStateChange((newState, oldState) => {
 *   console.log('通话状态变化:', newState)
 * })
 * 
 * // 更新状态
 * updateCallState({
 *   status: 'connected',
 *   isInCall: true
 * })
 * ```
 */

export interface UseCallStateReturn {
  // 响应式的通话状态
  callState: CallStateType
  
  // 状态更新方法
  updateCallState: (partialState: Partial<CallStateType>) => void
  updateCurrentCall: (partialCall: Partial<CurrentCallInfo>) => void
  setCallStatus: (status: CallStatus) => void
  
  // 状态重置方法
  resetCallState: () => void
  resetCurrentCall: () => void
  resetIncomingCall: () => void
  
  // 监听方法
  onStateChange: (callback: (newState: CallStateType, oldState: CallStateType) => void) => WatchStopHandle
  
  // 辅助方法
  generateCallId: () => string
  calculateCallDuration: () => number
}

// 通话状态组合式API - 封装Pinia store
export function useCallState(): UseCallStateReturn {
  // 获取Pinia store实例
  const store = useCallStateStore()

  // 直接返回store的方法和状态，保持API一致性
  return {
    callState: store, // 返回整个store实例，包含所有状态和方法
    updateCallState: store.updateCallState.bind(store),
    updateCurrentCall: store.updateCurrentCall.bind(store),
    setCallStatus: store.setCallStatus.bind(store),
    resetCallState: store.resetCallState.bind(store),
    resetCurrentCall: store.resetCurrentCall.bind(store),
    resetIncomingCall: store.resetIncomingCall.bind(store),
    onStateChange: (callback: (newState: CallStateType, oldState: CallStateType) => void): WatchStopHandle => {
      // 使用ref来保存旧状态
      const oldStateRef = ref<CallStateType>({ ...store.$state })
      
      // 使用store的$subscribe方法监听状态变化
      return store.$subscribe((_mutation, state) => {
        // 调用回调函数，传入新状态和旧状态
        callback(state, oldStateRef.value)
        // 更新旧状态引用
        oldStateRef.value = { ...state }
      })
    },
    generateCallId: store.generateCallId.bind(store),
    calculateCallDuration: () => store.callDuration
  }
}