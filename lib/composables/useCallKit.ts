import { inject, ref, computed } from 'vue'
import type { EasemobChatCallKitInstance } from '../types'

// 组合式API：useCallKit
export function useCallKit() {
  // 获取CallKit实例
  const callKitRef = inject<EasemobChatCallKitInstance>('easemob-callkit-ref')
  
  // 状态管理
  const isInCall = computed(() => callKitRef?.isInCall || false)
  const callType = computed(() => callKitRef?.callType || null)
  const targetUser = computed(() => callKitRef?.targetUser || '')
  
  // 方法封装
  const startCall = (targetId: string, type: 'audio' | 'video') => {
    if (!callKitRef) {
      console.warn('CallKit未初始化，请确保在Provider内使用')
      return
    }
    callKitRef.startCall(targetId, type)
  }
  
  const endCall = () => {
    if (!callKitRef) {
      console.warn('CallKit未初始化，请确保在Provider内使用')
      return
    }
    callKitRef.endCall()
  }
  
  const startChat = (targetId: string) => {
    if (!callKitRef) {
      console.warn('CallKit未初始化，请确保在Provider内使用')
      return
    }
    callKitRef.startChat(targetId)
  }
  
  return {
    // 状态
    isInCall,
    callType,
    targetUser,
    
    // 方法
    startCall,
    endCall,
    startChat,
    
    // 原始实例
    callKitInstance: callKitRef
  }
}