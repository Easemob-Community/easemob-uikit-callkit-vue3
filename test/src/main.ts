import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import 'easemob-chat-callkit-vue3/style.css'

const app = createApp(App)
const pinia = createPinia()
app.use(pinia)
app.mount('#app')
