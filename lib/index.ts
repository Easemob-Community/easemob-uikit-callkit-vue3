import type { App } from 'vue'
import EasemobChatCallKitProvider from './components/EasemobChatCallKitProvider.vue'
import EasemobChatSingleCall from './components/EasemobChatSingleCall.vue'
import EasemobChatMultiCall from './components/EasemobChatMultiCall.vue'

export { EasemobChatCallKitProvider, EasemobChatSingleCall, EasemobChatMultiCall }

export type { EasemobChatCallKitOptions, EasemobChatCallKitInstance, ProviderConfig } from './types'

export default {
  install(app: App) {
    app.component('EasemobChatCallKitProvider', EasemobChatCallKitProvider)
    app.component('EasemobChatSingleCall', EasemobChatSingleCall)
    app.component('EasemobChatMultiCall', EasemobChatMultiCall)
  }
}
