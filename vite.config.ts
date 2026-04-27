import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: [
      {
        find: /^easemob-chat-callkit-vue3\/style\.css$/,
        replacement: resolve(__dirname, './lib/style.css')
      },
      {
        find: /^easemob-chat-callkit-vue3$/,
        replacement: resolve(__dirname, './lib/index.ts')
      }
    ]
  }
})
