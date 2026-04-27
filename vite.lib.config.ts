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
      const distPath = path.resolve(__dirname, 'dist')
      if (fs.existsSync(distPath)) {
        fs.rmSync(distPath, { recursive: true, force: true })
        console.log('✓ Cleaned dist directory')
      }
      // 重新创建目录
      fs.mkdirSync(distPath, { recursive: true })
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
      outDir: 'dist',
      tsconfigPath: './tsconfig.app.json',
      rollupTypes: true,
      insertTypesEntry: true,
      copyDtsFiles: true
    })
  ],
  build: {
    outDir: 'dist',
    lib: {
      entry: path.resolve(__dirname, 'lib/index.ts'),
      name: 'EasemobChatCallKit',
      formats: ['es', 'umd'],
      fileName: (format) => `index.${format === 'es' ? 'js' : 'umd.js'}`
    },
    cssCodeSplit: false,
    rollupOptions: {
      external: ['vue', 'agora-rtc-sdk-ng', 'easemob-websdk'],
      output: {
        globals: {
          vue: 'Vue',
          'agora-rtc-sdk-ng': 'AgoraRTC',
          'easemob-websdk': 'WebSDK'
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
