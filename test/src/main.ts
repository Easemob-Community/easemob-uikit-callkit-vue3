import { createApp } from 'vue'
import EasemobChatCallKit from 'easemob-chat-callkit-vue3'
import App from './App.vue'
import 'easemob-chat-callkit-vue3/style.css'

const app = createApp(App)
app.use(EasemobChatCallKit)
app.mount('#app')
