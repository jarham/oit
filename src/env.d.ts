// SPDX-License-Identifier: BSD-2-Clause
// Copyright (c) 2022, Jari Hämäläinen, Carita Kiili and Julie Coiro
/// <reference types="vite/client" />

declare module '*.vue' {
  import type {DefineComponent} from 'vue';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/ban-types
  const component: DefineComponent<{}, {}, any>;
  export default component;
}

declare module '*/LICENSE' {
  const str: string;
  export default str;
}

// For defines in vite.config.js
declare const __APP_VERSION__: string;
declare const __APP_LINK__: string | null;
