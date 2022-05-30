<!-- SPDX-License-Identifier: BSD-2-Clause
     Copyright (c) 2022, Jari Hämäläinen, Carita Kiili and Julie Coiro -->
<template lang="pug">
.modal.modal-instructions(ref='elModal')
  .modal-dialog.modal-lg
    .modal-content
      .modal-header
        h5.modal-title {{ tc('text.title') }}
        button.btn-close(data-bs-dismiss='modal' :aria-label='tc("btn.close.aria-label")')
      .modal-body.overflow-auto
        section.about-license
          MarkdownElemement.mx-3(
            :markdown='tc("text.instructions")'
          )
      .modal-footer
        button.btn.btn-outline-secondary(
          data-bs-dismiss='modal'
          ref='btnClose'
        ) {{ tc('btn.close.text') }}
</template>

<script setup lang="ts">
import {onBeforeUnmount, onMounted, ref} from 'vue';
import {useI18n} from 'vue-i18n';
import {Modal} from 'bootstrap';
import MarkdownElemement from '@/components/MarkdownElement.vue';

const {t} = useI18n();
const tc = (s: string) => t(`component.modal-instructions.${s}`);

const elModal = ref<HTMLDivElement>();
let modal: Modal | null = null;

const btnClose = ref<HTMLButtonElement>();

onMounted(() => {
  if (!elModal.value) return;
  modal = new Modal(elModal.value);
  elModal.value.addEventListener('shown.bs.modal', onShown);
});
onBeforeUnmount(() => {
  if (modal) {
    modal.dispose();
  }
  if (elModal.value) {
    elModal.value.removeEventListener('shown.bs.modal', onShown);
  }
  modal = null;
});
const onShown = () => {
  if (!btnClose.value) return;
  btnClose.value.focus();
};

const show = () => modal?.show();
const hide = () => modal?.hide();

defineExpose({show, hide});
</script>

<style lang="scss">
.modal-instructions .modal-content {
  max-height: 94vh;
}
</style>
