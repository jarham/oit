<!-- SPDX-License-Identifier: BSD-2-Clause
     Copyright (c) 2022, Jari Hämäläinen, Carita Kiili and Julie Coiro -->
<template lang="pug">
.modal.modal-about(ref='elModal')
  .modal-dialog.modal-lg
    .modal-content
      .modal-header
        h5.modal-title {{ tc('text.title') }}
        button.btn-close(data-bs-dismiss='modal' :aria-label='tc("btn.close.aria-label")')
      .modal-body.overflow-auto
        section.about-license
          h5 {{ tc('heading.license') }}
          MarkdownElemement.mx-3(
            :markdown='license'
          )
      .modal-footer
        button.btn.btn-outline-secondary(data-bs-dismiss='modal') {{ tc('btn.close.text') }}
</template>

<script setup lang="ts">
import {onBeforeUnmount, onMounted, ref} from 'vue';
import {useI18n} from 'vue-i18n';
import {Modal} from 'bootstrap';
import MarkdownElemement from '@/components/MarkdownElement.vue';
import LICENSE from '../../LICENSE';

const {t} = useI18n();
const tc = (s: string) => t(`component.modal-about.${s}`);

const elModal = ref<HTMLDivElement>();
let modal: Modal | null = null;

onMounted(() => {
  if (!elModal.value) return;
  modal = new Modal(elModal.value);
});
onBeforeUnmount(() => {
  if (modal) {
    modal.dispose();
  }
  modal = null;
});

const show = () => modal?.show();
const hide = () => modal?.hide();

const license = ref(`\`\`\`\n${LICENSE}\n\`\`\``);

defineExpose({show, hide});
</script>

<style lang="scss">
.about-license pre {
  white-space: pre-wrap;
  font-size: 85%;
}
.modal-about .modal-content {
  max-height: 94vh;
}
</style>
