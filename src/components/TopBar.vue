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
      button.btn.btn-outline-primary.btn-sm.me-1(
        @click='onOpenChart'
      ) {{ tc('btn.chart-open.text') }}
      .d-none.position-relative
        input.d-none.position-absolute(
          type='file'
          ref='elFileInput'
          style='top: -1000px; left: -1000px'
          accept='.html,.htm'
          @change='onFileChange'
        )
    .d-flex.toolbar.mb-1
      button.btn.btn-outline-primary.btn-sm.me-1(
        @click='$emit("chart-save")'
      ) {{ tc('btn.chart-save.text') }}
      button.btn.btn-outline-primary.btn-sm(
        @click='$emit("show-instructions")'
      ) {{ tc('btn.instructions.text') }}
  .d-flex.flex-column.justify-content-center.align-items-center.flex-grow-1
    h1.mb-1 {{ tc('text.title') }}
    small.version-info
      a.link-secondary(v-if='appLink' :href='appLink') {{ version }}
      span.text-secondary(v-else) {{ version }}
  .d-flex.align-items-start
    button.btn.text-primary.btn-lg.px-2.py-1(@click='$emit("show-languages")')
      i.bi.bi-translate
</template>

<script setup lang="ts">
import {ref} from 'vue';
import {useI18n} from 'vue-i18n';
import {useStore} from '@/stores/main';
import {storeToRefs} from 'pinia';
import {useConfirmDialog} from '@/vue-plugins/plugin-confirm-dialog';

const emit = defineEmits<{
  (event: 'chart-new'): void;
  (event: 'chart-save'): void;
  (event: 'chart-open', htmlSource: string): void;
  (event: 'show-languages'): void;
  (event: 'show-about'): void;
  (event: 'show-instructions'): void;
}>();

const {t} = useI18n();
const tc = (s: string) => t(`component.top-bar.${s}`);

const store = useStore();
const {dirty} = storeToRefs(store);
const dlgConfirm = useConfirmDialog();

const elFileInput = ref<HTMLInputElement>();

const version = ref(__APP_VERSION__);
const appLink = ref(__APP_LINK__);

const onOpenChart = async () => {
  if (!elFileInput.value) return;

  if (dirty.value) {
    const confirmed = await dlgConfirm.confirm('chart-open-unsaved');
    if (!confirmed) return;
  }

  elFileInput.value.click();
};
const onFileChange = () => {
  if (!elFileInput.value) return;
  const fileInput = elFileInput.value;
  if (!fileInput.files || !fileInput.files[0]) return;
  const file = fileInput.files[0];

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const contents = e.target?.result;
      if (typeof contents === 'string') {
        emit('chart-open', contents);
      }
    } catch (e) {
      console.error(e);
    }
  };
  reader.onloadend = () => {
    fileInput.value = '';
  };
  reader.readAsText(file, 'utf-8');
};
</script>

<style lang="scss">
.toolbar > button {
  min-width: 25ch;
}
.version-info {
  opacity: 0.7;
  font-size: 80%;
}
</style>
