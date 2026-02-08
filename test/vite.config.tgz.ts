import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

// tgz 包模式：使用打包后的 .tgz 文件作为依赖
// 需要在 test 目录下安装 tgz 包：pnpm add ../easemob-chat-callkit-vue3-1.0.0.tgz
export default defineConfig({
  plugins: [vue()],
  root: '.',
  define: {
    'import.meta.env.VITE_IMPORT_MODE': JSON.stringify('tgz')
  },
  resolve: {
    alias: {
      // tgz 模式下不使用别名，直接从 node_modules 中解析包
      // 确保已在 test 目录下执行：pnpm add ../easemob-chat-callkit-vue3-1.0.0.tgz
    }
  }
})
