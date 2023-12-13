import {App, inject} from 'vue';

// Storing suported locales to a plugin since importing
// vue-i18n messages in Vue causde build failures (it's
// ok to import it in main, of course).
const key = Symbol('plugin-supported-locales');

export default {
  install: (app: App, supportedLocales: string[]): void => {
    app.provide(key, supportedLocales);
  },
};

export function useSupportedLocales(): string[] {
  const supportedLocales: string[] | undefined = inject(key);
  if (!supportedLocales) throw new Error('Supported locales not set');
  return supportedLocales;
}
