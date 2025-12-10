import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';

export default defineConfig({
  // 使用环境变量设置 base 路径，用于 GitHub Pages 部署
  base: process.env.BASE_URL || '/',
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      'vue': resolve(__dirname, 'node_modules/vue'),
      'pinia': resolve(__dirname, 'node_modules/pinia'),
    },
    // 确保依赖去重
    dedupe: ['vue', 'pinia'],
  },
  server: {
    port: 3010,
  },
});
