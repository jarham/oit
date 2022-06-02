import {defineConfig} from 'vite';
import vue from '@vitejs/plugin-vue';
import vueI18n from '@intlify/vite-plugin-vue-i18n';
import * as path from 'path';

// https://vitejs.dev/config/
// https://github.com/intlify/bundle-tools/tree/main/packages/vite-plugin-vue-i18n#vite-config
export default defineConfig({
  plugins: [
    vue(),
    vueI18n({
      include: path.resolve(__dirname, './src/translations/**'),
    }),
  ],
  base: '',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
