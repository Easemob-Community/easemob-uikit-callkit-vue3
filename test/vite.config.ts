import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      'easemob-chat-callkit-vue3': resolve(__dirname, '../lib/index.ts')
    }
  },
  root: '.'
})