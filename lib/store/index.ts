import { createPinia } from 'pinia'
import type { App } from 'vue'

// 创建pinia实例
const pinia = createPinia()

// 插件安装函数
export function installPinia(app: App) {
  app.use(pinia)
}

export { pinia }