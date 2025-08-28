import type { App } from 'vue'
import type { EasemobChatCallKitOptions } from './types'

// 组件导入
import EasemobChatCallKit from './components/EasemobChatCallKit.vue'

// 默认配置
const defaultOptions: EasemobChatCallKitOptions = {
  // 默认配置项
  appKey: '',
  userId: '',
  accessToken: '',
  debug: false
}

// 安装函数
const install = (app: App, options: Partial<EasemobChatCallKitOptions> = {}) => {
  // 合并配置
  const finalOptions = { ...defaultOptions, ...options }
  
  // 全局注册组件
  app.component('EasemobChatCallKit', EasemobChatCallKit)
  
  // 提供全局配置
  app.provide('easemob-chat-callkit-options', finalOptions)
  
  // 可以在这里添加全局方法或属性
  app.config.globalProperties.$easemobChatCallKit = {
    options: finalOptions,
    // 这里可以添加插件的API方法
  }
}

// 导出组件
export { EasemobChatCallKit }

// 导出安装函数和插件对象
export default {
  install
}

// 导出类型
export type { EasemobChatCallKitOptions } from './types'