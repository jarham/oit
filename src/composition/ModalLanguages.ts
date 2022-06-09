// SPDX-License-Identifier: BSD-2-Clause
// Copyright (c) 2022, Jari Hämäläinen, Carita Kiili and Julie Coiro
import {computed} from 'vue';

export interface OitLanguage {
  locale: string;
  name: string;
}

export default function useModalLanguages(langs: OitLanguage[]) {
  const languages = computed<OitLanguage[]>(() => langs);

  return {languages};
}
