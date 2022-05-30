<!-- SPDX-License-Identifier: BSD-2-Clause
     Copyright (c) 2022, Jari Hämäläinen, Carita Kiili and Julie Coiro -->
<template lang="pug">
.d-flex.top-bar
  .d-flex.flex-column
    .d-flex.toolbar.mb-1
      button.btn.btn-outline-primary.btn-sm.me-1(
        @click='$emit("chart-new")'
      ) {{ tc('btn.chart-new.text') }}
      button.btn.btn-outline-primary.btn-sm.me-1(
        @click='$emit("show-about")'
      ) {{ tc('btn.about.text') }}
    .d-block.toolbar.mb-1
      button.btn.btn-outline-primary.btn-sm.me-1 {{ tc('btn.chart-open.text') }}
    .d-flex.toolbar.mb-1
      button.btn.btn-outline-primary.btn-sm.me-1 {{ tc('btn.chart-save.text') }}
      button.btn.btn-outline-primary.btn-sm(
        @click='$emit("show-instructions")'
      ) {{ tc('btn.instructions.text') }}
  .d-flex.justify-content-center.align-items-center.flex-grow-1
    h1 {{ tc('text.title') }}
  .d-flex.align-items-start
    button.btn.text-primary.btn-lg.px-2.py-1(@click='$emit("show-languages")')
      i.bi.bi-translate
</template>

<script setup lang="ts">
import {useI18n} from 'vue-i18n';

defineEmits<{
  (event: 'chart-new'): void;
  (event: 'show-languages'): void;
  (event: 'show-about'): void;
  (event: 'show-instructions'): void;
}>();

const {t} = useI18n();
const tc = (s: string) => t(`component.top-bar.${s}`);
</script>

<style lang="scss">
.toolbar > button {
  min-width: 25ch;
}
</style>
