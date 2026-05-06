import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'
import { resolve } from 'path'

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'CallKitCore',
      fileName: (format) => `index.${format === 'es' ? 'js' : 'cjs'}`,
      formats: ['es', 'cjs'],
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
  },
  plugins: [
    dts({
      insertTypesEntry: true,
      rollupTypes: true,
    }),
  ],
})
