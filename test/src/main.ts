import { createApp } from 'vue'
import App from './App.vue'

// 使用相对路径引入组件
import EasemobChatCallKitProvider from '../../lib/components/EasemobChatCallKitProvider.vue'
import EasemobChatSingleCall from '../../lib/components/EasemobChatSingleCall.vue'
import EasemobChatMultiCall from '../../lib/components/EasemobChatMultiCall.vue'

const app = createApp(App)

// 注册组件
app.component('EasemobChatCallKitProvider', EasemobChatCallKitProvider)
app.component('EasemobChatSingleCall', EasemobChatSingleCall)
app.component('EasemobChatMultiCall', EasemobChatMultiCall)

app.mount('#app')
