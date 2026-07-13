import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'
import { resolve } from 'path'

export default defineConfig({
  plugins: [
    vue(),
    AutoImport({ resolvers: [ElementPlusResolver()] }),
    Components({ resolvers: [ElementPlusResolver()] }),
  ],
  base: '/scrm-console/',
  build: {
    outDir: resolve(__dirname, '../../dist/console'),
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@scrm/shared': resolve(__dirname, '../../packages/shared/src'),
    },
  },
  server: {
    port: 5174,
    proxy: {
      '/api': 'http://localhost:8000',
      '/broadcasting': 'http://localhost:8000',
    },
  },
})
