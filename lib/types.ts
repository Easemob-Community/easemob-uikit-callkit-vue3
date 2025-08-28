export interface EasemobChatCallKitOptions {
  appKey: string
  userId: string
  accessToken: string
  debug?: boolean
  // 可以根据需要添加更多配置项
}

export interface EasemobChatCallKitInstance {
  // 定义插件实例的方法和属性
  openChat: (targetId: string) => void
  startCall: (targetId: string, type: 'audio' | 'video') => void
  // 可以根据需要添加更多API方法
}