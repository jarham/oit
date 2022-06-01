<!-- SPDX-License-Identifier: BSD-2-Clause
     Copyright (c) 2022, Jari Hämäläinen, Carita Kiili and Julie Coiro -->
<template lang="pug">
.modal.modal-chart-save(ref='elModal')
  .modal-dialog
    .modal-content
      .modal-header
        h5.modal-title {{ tc('text.title') }}
        button.btn-close(data-bs-dismiss='modal' :aria-label='tc("btn.close.aria-label")')
      .modal-body
        .input-group
          .input-group-text {{ tc('input.filename.prompt') }}
          input.form-control(
            type='text'
            :placeholder='tc("input.filename.placeholder")'
            v-model='filename'
          )
          //- '.html' extension is hard coded on purpose
          .input-group-text .html
      .modal-footer
        button.btn.btn-outline-secondary.me-2(
          data-bs-dismiss='modal'
        ) {{ tc('btn.cancel.text') }}
        button.btn.btn-outline-primary(
          @click='onSaveAs'
          ref='btnSave'
        ) {{ tc('btn.save.text') }}
</template>

<script setup lang="ts">
import {onBeforeUnmount, onMounted, ref} from 'vue';
import {useI18n} from 'vue-i18n';
import {Modal} from 'bootstrap';
import {useStore} from '@/stores/main';
import {storeToRefs} from 'pinia';

const emit = defineEmits<{
  (event: 'chart-save-as-cancel'): void;
  (event: 'chart-save-as', filename: string): void;
}>();

const store = useStore();
const {filename} = storeToRefs(store);
const {t} = useI18n();
const tc = (s: string) => t(`component.modal-chart-save.${s}`);

const elModal = ref<HTMLDivElement>();
let modal: Modal | null = null;

const btnSave = ref<HTMLButtonElement>();

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
  if (!btnSave.value) return;
  btnSave.value.focus();
};

const show = () => modal?.show();
const hide = () => modal?.hide();

defineExpose({show, hide});

const onSaveAs = () => {
  emit('chart-save-as', filename.value);
  hide();
};
</script>
