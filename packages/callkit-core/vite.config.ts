import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'
import { resolve } from 'path'

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'CallKitCore',
      fileName: (format) => {
        switch (format) {
          case 'es':
            return 'index.js'
          case 'cjs':
            return 'index.cjs'
          case 'umd':
            return 'index.umd.js'
          case 'iife':
            return 'index.iife.js'
          default:
            return `index.${format}.js`
        }
      },
      formats: ['es', 'cjs', 'umd', 'iife'],
    },
    rollupOptions: {
      // 外部依赖：peerDependencies 和 devDependencies 不打入包内
      external: ['easemob-websdk'],
      output: {
        globals: {
          'easemob-websdk': 'Easemob',
        },
      },
    },
    outDir: 'dist',
    sourcemap: true,
    minify: 'terser',
  },
  plugins: [
    dts({
      insertTypesEntry: true,
      rollupTypes: true,
    }),
  ],
})
