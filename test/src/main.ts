import { createApp } from 'vue'
import EasemobChatCallKit from 'easemob-chat-callkit-vue3'
import App from './App.vue'
import router from './router'
import 'easemob-chat-callkit-vue3/style.css'

const app = createApp(App)
app.use(router)
app.use(EasemobChatCallKit)
app.mount('#app')
