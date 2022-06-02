// SPDX-License-Identifier: BSD-2-Clause
// Copyright (c) 2022, Jari Hämäläinen, Carita Kiili and Julie Coiro
import {createApp} from 'vue';
import {createI18n} from 'vue-i18n';
import {createPinia} from 'pinia';
import App from './App.vue';
import messages from '@intlify/vite-plugin-vue-i18n/messages';

declare global {
  interface Navigator {
    // ON IE11, which nobody should use, these are "closest available
    // (non-standard) properties": See note on IE at:
    // https://developer.mozilla.org/en-US/docs/Web/API/Navigator/language#browser_compatibility
    userLanguage?: string;
    browserLanguage?: string;
  }
}

const fallbackLocale = 'en';

const getNavigatorLanguage = (): string => {
  if (navigator.languages && navigator.languages[0]) {
    return navigator.languages[0];
  } else {
    return (
      navigator.language ||
      navigator.userLanguage ||
      navigator.browserLanguage ||
      fallbackLocale
    );
  }
};

const getLocale = (): string => {
  const supportedLocales = Object.keys(messages);
  const localeParts = getNavigatorLanguage().toLowerCase().split('-');
  for (let i = localeParts.length - 1; i >= 0; i--) {
    const tryLocale = localeParts.join('-');
    if (supportedLocales.includes(tryLocale)) return tryLocale;
    localeParts.splice(i, 1);
  }

  return fallbackLocale;
};

const i18n = createI18n({
  locale: getLocale(),
  fallbackLocale,
  messages,
});
const pinia = createPinia();

const app = createApp(App);
app.use(i18n).use(pinia).mount('#app');
