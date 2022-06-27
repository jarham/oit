// SPDX-License-Identifier: BSD-2-Clause
// Copyright (c) 2022, Jari Hämäläinen, Carita Kiili and Julie Coiro

// i18n config file typing
export interface I18nConfig {
  // From which language to get keys for comparison. This language must also
  // contain keys "language.key*" where "key*" and languages found from translation
  // files have 1 to 1 mapping. Every "language.key*" must have a string value
  // (languages native name).
  referenceLocale: string;
  // Fallback locale config for vue-i18n.
  // See: https://vue-i18n.intlify.dev/guide/essentials/fallback.html
  fallbackLocale?: string | string[] | I18nFallbackMapping;
  fallbackWarn?: boolean;
  missingWarn?: boolean;
}
export interface I18nFallbackMapping {
  [key: string]: string | string[] | undefined;
  default?: string | string[];
}
