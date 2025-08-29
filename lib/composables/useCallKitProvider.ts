import { inject, computed } from 'vue'
import type { ProviderConfig } from '../types'

// 组合式API：useCallKitProvider  
export function useCallKitProvider() {
  // 获取Provider配置
  const config = inject<ProviderConfig>('easemob-callkit-config')
  
  // 计算属性
  const appKey = computed(() => config?.initConfig?.appKey || '')
  const userId = computed(() => config?.initConfig?.userId || '')
  const debug = computed(() => config?.initConfig?.debug || false)
  const enableRingtone = computed(() => config?.enableRingtone || true)
  const resizable = computed(() => config?.resizable || true)
  const draggable = computed(() => config?.draggable || true)
  
  // 验证配置
  const validateConfig = () => {
    if (!config) {
      console.error('Provider配置未找到，请确保使用EasemobChatCallKitProvider包裹组件')
      return false
    }
    if (!config.initConfig?.appKey) {
      console.error('appKey是必填配置项')
      return false
    }
    return true
  }
  
  return {
    // 配置
    appKey,
    userId,
    debug,
    enableRingtone,
    resizable,
    draggable,
    config,
    
    // 方法
    validateConfig
  }
}