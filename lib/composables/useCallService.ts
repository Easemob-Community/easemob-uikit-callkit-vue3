/**
 * 通话服务组合式API - useCallService
 * 
 * 职责：
 * 1. 提供组合式API访问CallService
 * 2. 管理通话相关状态的生命周期
 * 3. 提供类型安全的通话操作接口
 * 4. 自动处理通话服务的初始化和清理
 * 
 * 使用方式：
 * ```typescript
 * import { useCallService } from '@easemob/chat-callkit'
 * 
 * export default {
 *   setup() {
 *     const { 
 *       startCall, 
 *       acceptCall, 
 *       rejectCall, 
 *       endCall,
 *       currentCall,
 *       callState 
 *     } = useCallService()
 *     
 *     // 发起通话
 *     const handleStartCall = async (targetId: string, type: 'audio' | 'video') => {
 *       await startCall(targetId, type)
 *     }
 *     
 *     // 监听通话状态
 *     watch(() => callState.value, (newState) => {
 *       console.log('通话状态变化', newState)
 *     })
 *     
 *     // 获取当前通话信息
 *     const { participants, callType, duration } = currentCall.value
 *   }
 * }
 * ```
 */

import { onMounted, onUnmounted, computed, type Ref } from 'vue'
import type { CallService } from '../services/CallService'
import { useCallStateStore } from '../store/callState'
import type { CallState as CallStateType, CurrentCallInfo } from '../store/types'

export interface UseCallServiceReturn {
  // 通话状态
  callState: CallStateType
  currentCall: Ref<CurrentCallInfo | null>
  callStatus: Ref<string>
  isInCall: Ref<boolean>
  
  // 通话操作方法
  startCall: (targetId: string, callType: 'audio' | 'video') => Promise<string>
  acceptCall: (callId: string) => Promise<void>
  rejectCall: (callId: string) => Promise<void>
  endCall: (callId?: string) => Promise<void>
  
  // 通话控制方法
  toggleAudio: (enabled: boolean) => Promise<void>
  toggleVideo: (enabled: boolean) => Promise<void>
  toggleSpeaker: (enabled: boolean) => Promise<void>
  
  // 参与者管理
  addParticipant: (callId: string, userId: string) => Promise<void>
  removeParticipant: (callId: string, userId: string) => Promise<void>
  
  // 事件监听
  onCallStarted: (callback: () => void) => void
  onCallConnected: (callback: () => void) => void
  onCallEnded: (callback: () => void) => void
  onCallFailed: (callback: () => void) => void
  onIncomingCall: (callback: () => void) => void
  onParticipantJoined: (callback: () => void) => void
  onParticipantLeft: (callback: () => void) => void
  
  // 原始服务实例
  callService: CallService
}

/**
 * 通话服务组合式API - useCallService
 * 
 * 职责：
 * 1. 提供组合式API访问CallService
 * 2. 管理通话相关状态的生命周期
 * 3. 提供类型安全的通话操作接口
 * 4. 自动处理通话服务的初始化和清理
 */
export function useCallService(callService: CallService): UseCallServiceReturn {
  // 获取Pinia store实例
  const store = useCallStateStore()
  
  // 计算属性
  const currentCall = computed(() => store.currentCall)
  const callStatus = computed(() => store.status)
  const isInCall = computed(() => store.isInCall)
  
  // 通话操作方法
  const startCall = async (targetId: string, callType: 'audio' | 'video'): Promise<string> => {
    try {
      // 调用服务层方法
      const callId = await callService.startCall(targetId, callType)
      
      // 更新响应式状态
      store.updateCallState({
        callType,
        isInCall: true,
        status: 'inviting'
      })
      
      return callId
    } catch (error) {
      console.error('发起通话失败:', error)
      store.setCallStatus('idle')
      throw error
    }
  }
  
  const acceptCall = async (callId: string): Promise<void> => {
    try {
      await callService.acceptCall(callId)
      
      // 更新响应式状态
      store.updateCallState({
        status: 'connecting'
      })
    } catch (error) {
      console.error('接受通话失败:', error)
      throw error
    }
  }
  
  const rejectCall = async (callId: string): Promise<void> => {
    try {
      await callService.rejectCall(callId)
      
      // 更新响应式状态
      store.resetCallState()
    } catch (error) {
      console.error('拒绝通话失败:', error)
      throw error
    }
  }
  
  const endCall = async (callId?: string): Promise<void> => {
    try {
      await callService.endCall(callId)
      
      // 更新响应式状态
      store.resetCallState()
    } catch (error) {
      console.error('结束通话失败:', error)
      throw error
    }
  }
  
  // 通话控制方法
  const toggleAudio = async (enabled: boolean): Promise<void> => {
    try {
      await callService.toggleAudio(enabled)
      
      // 更新响应式状态
      store.updateSettings({
        enableAudio: enabled
      })
    } catch (error) {
      console.error('切换音频状态失败:', error)
      throw error
    }
  }
  
  const toggleVideo = async (enabled: boolean): Promise<void> => {
    try {
      await callService.toggleVideo(enabled)
      
      // 更新响应式状态
      store.updateSettings({
        enableVideo: enabled
      })
    } catch (error) {
      console.error('切换视频状态失败:', error)
      throw error
    }
  }
  
  const toggleSpeaker = async (enabled: boolean): Promise<void> => {
    try {
      await callService.toggleSpeaker(enabled)
      
      // 更新响应式状态
      store.updateSettings({
        enableSpeaker: enabled
      })
    } catch (error) {
      console.error('切换扬声器状态失败:', error)
      throw error
    }
  }
  
  // 参与者管理
  const addParticipant = async (callId: string, userId: string): Promise<void> => {
    try {
      await callService.addParticipant(callId, userId)
    } catch (error) {
      console.error('添加参与者失败:', error)
      throw error
    }
  }
  
  const removeParticipant = async (callId: string, userId: string): Promise<void> => {
    try {
      await callService.removeParticipant(callId, userId)
    } catch (error) {
      console.error('移除参与者失败:', error)
      throw error
    }
  }
  
  // 事件监听方法
  const onCallStarted = (callback: () => void): void => {
    callService.on('callStarted', callback)
  }
  
  const onCallConnected = (callback: () => void): void => {
    callService.on('callConnected', callback)
  }
  
  const onCallEnded = (callback: () => void): void => {
    callService.on('callEnded', callback)
  }
  
  const onCallFailed = (callback: () => void): void => {
    callService.on('callFailed', callback)
  }
  
  const onIncomingCall = (callback: () => void): void => {
    callService.on('incomingCall', callback)
  }
  
  const onParticipantJoined = (callback: () => void): void => {
    callService.on('participantJoined', callback)
  }
  
  const onParticipantLeft = (callback: () => void): void => {
    callService.on('participantLeft', callback)
  }
  
  // 生命周期管理
  onMounted(() => {
    // 组件挂载时的初始化逻辑
  })
  
  onUnmounted(() => {
    // 组件卸载时的清理逻辑
    // 注意：这里不应该销毁callService实例，因为它可能被多个组件共享
  })
  
  return {
    // 通话状态
    callState: store, // 返回整个store实例，包含所有状态和方法
    currentCall,
    callStatus,
    isInCall,
    
    // 通话操作方法
    startCall,
    acceptCall,
    rejectCall,
    endCall,
    
    // 通话控制方法
    toggleAudio,
    toggleVideo,
    toggleSpeaker,
    
    // 参与者管理
    addParticipant,
    removeParticipant,
    
    // 事件监听
    onCallStarted,
    onCallConnected,
    onCallEnded,
    onCallFailed,
    onIncomingCall,
    onParticipantJoined,
    onParticipantLeft,
    
    // 原始服务实例
    callService
  }
}