import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import dts from 'vite-plugin-dts'
import path from 'path'
import fs from 'fs'

// 自定义插件：构建前清空 release/dist 目录
const cleanReleaseDist = () => {
  return {
    name: 'clean-release-dist',
    buildStart() {
      const releaseDistPath = path.resolve(__dirname, 'release/dist')
      if (fs.existsSync(releaseDistPath)) {
        fs.rmSync(releaseDistPath, { recursive: true, force: true })
        console.log('✓ Cleaned release/dist directory')
      }
      // 重新创建目录
      fs.mkdirSync(releaseDistPath, { recursive: true })
    }
  }
}

export default defineConfig({
  plugins: [
    cleanReleaseDist(),
    vue(),
    dts({
      include: ['lib/**/*'],
      exclude: ['lib/**/*.test.ts', 'lib/**/*.spec.ts'],
      outDir: 'release/dist',
      tsconfigPath: './tsconfig.app.json',
      rollupTypes: true,
      insertTypesEntry: true,
      copyDtsFiles: true
    })
  ],
  build: {
    outDir: 'release/dist',
    lib: {
      entry: path.resolve(__dirname, 'lib/index.ts'),
      name: 'EasemobChatCallKit',
      formats: ['es', 'umd'],
      fileName: (format) => `index.${format === 'es' ? 'js' : 'umd.js'}`
    },
    cssCodeSplit: false,
    rollupOptions: {
      external: ['vue', 'pinia'],
      output: {
        globals: {
          vue: 'Vue',
          pinia: 'Pinia'
        },
        assetFileNames: (assetInfo) => {
          if (assetInfo.name === 'style.css') {
            return 'easemob-chat-callkit-vue3.css';
          }
          return assetInfo.name || '';
        }
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'lib')
    }
  }
})
