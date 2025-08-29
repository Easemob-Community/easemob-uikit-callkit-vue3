import { createApp } from 'vue'
import App from './App.vue'

// 使用全局注册方式引入插件
import EasemobChatCallKitVue3 from '../../lib/index'

const app = createApp(App)

// 使用.use方式注册插件
app.use(EasemobChatCallKitVue3)

app.mount('#app')
