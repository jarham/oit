import {defineConfig, loadEnv} from 'vite';
import vue from '@vitejs/plugin-vue';
import vueI18n from '@intlify/vite-plugin-vue-i18n';
import {string} from 'rollup-plugin-string';
import * as path from 'path';

function getAppVersion(env: Record<string, string>): string {
  // env.APP_VERSION is read from .env.production.local file
  // which is generated at release build time.
  if (env.APP_VERSION) return JSON.stringify(env.APP_VERSION);
  if (env.NODE_ENV !== 'production') {
    return JSON.stringify(`v${env.npm_package_version}-development`);
  }
  return JSON.stringify(`v${env.npm_package_version}`);
}

function getAppLink(env: Record<string, string>): string {
  if (env.NODE_ENV !== 'production') {
    return JSON.stringify(null);
  }
  return env.APP_LINK ? JSON.stringify(env.APP_LINK) : JSON.stringify(null);
}

// https://vitejs.dev/config/
// https://github.com/intlify/bundle-tools/tree/main/packages/vite-plugin-vue-i18n#vite-config
export default defineConfig(({mode}) => {
  const env = loadEnv(mode, process.cwd(), '');
  // Use app version instead of generated hash in filenames
  // when building a release.
  const build =
    env.APP_VERSION && env.APP_IS_RELEASE === 'true'
      ? {
          rollupOptions: {
            output: {
              assetFileNames: `assets/[name]-${env.APP_VERSION}.[ext]`,
              chunkFileNames: `assets/[name]-${env.APP_VERSION}.[ext]`,
              entryFileNames: `assets/[name]-${env.APP_VERSION}.js`,
            },
          },
        }
      : undefined;
  return {
    plugins: [
      vue(),
      vueI18n({
        include: path.resolve(__dirname, './src/translations/**'),
      }),
      string({
        include: ['LICENSE'],
      }),
    ],
    base: '',
    define: {
      __APP_VERSION__: getAppVersion(env),
      __APP_LINK__: getAppLink(env),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    build,
  };
});
