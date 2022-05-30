<!-- SPDX-License-Identifier: BSD-2-Clause
     Copyright (c) 2022, Jari Hämäläinen, Carita Kiili and Julie Coiro -->
<template lang="pug">
.modal.modal-confirm(ref='elModal')
  .modal-dialog.modal-lg
    .modal-content
      .modal-header
        h5.modal-title {{ tc('text.title') }}
        button.btn-close(data-bs-dismiss='modal' :aria-label='tc("btn.close.aria-label")')
      .modal-body.overflow-auto
        section.about-license
          MarkdownElemement.mx-3(
            :markdown='tc("text.body")'
          )
      .modal-footer
        button.btn.btn-outline-secondary.me-2(
          data-bs-dismiss='modal'
          ref='btnCancel'
        ) {{ tc('btn.cancel.text') }}
        button.btn.btn-outline-primary(@click='onConfirmed') {{ tc('btn.confirm.text') }}
</template>

<script setup lang="ts">
import {onBeforeUnmount, onMounted, ref} from 'vue';
import {useI18n} from 'vue-i18n';
import {Modal} from 'bootstrap';
import {useConfirmDialog} from '@/vue-plugins/plugin-confirm-dialog';
import MarkdownElemement from '@/components/MarkdownElement.vue';

// Just any existing action by default
const action = ref('chart-new-unsaved');
const {t} = useI18n();
const tc = (s: string) => t(`component.modal-confirm.${action.value}.${s}`);

const elModal = ref<HTMLDivElement>();
let modal: Modal | null = null;

const btnCancel = ref<HTMLButtonElement>();

const confirmed = ref(false);

onMounted(() => {
  if (!elModal.value) return;
  modal = new Modal(elModal.value);
  elModal.value.addEventListener('hidden.bs.modal', onHidden);
  elModal.value.addEventListener('shown.bs.modal', onShown);
});
onBeforeUnmount(() => {
  if (modal) {
    modal.dispose();
  }
  if (elModal.value) {
    elModal.value.removeEventListener('hidden.bs.modal', onHidden);
    elModal.value.removeEventListener('shown.bs.modal', onShown);
  }
  modal = null;
});

const show = () => modal?.show();
const hide = () => modal?.hide();

defineExpose({show, hide});

const onConfirmed = () => {
  confirmed.value = true;
  hide();
};
const onHidden = () => {
  const r = confirmResolve;
  confirmResolve = null;
  if (r) {
    r();
  }
};
const onShown = () => {
  if (!btnCancel.value) return;
  btnCancel.value.focus();
};

let confirmResolve: (() => void) | null = null;
const confirmHandler = async (act: string): Promise<boolean> => {
  if (!elModal.value) return true;
  if (confirmResolve) {
    throw new Error('Double confirm dialog show');
  }
  confirmed.value = false;
  action.value = act;

  const confirmPromise = new Promise<void>((resolve) => {
    if (!modal) {
      confirmed.value = true;
      return resolve();
    }
    confirmResolve = resolve;
    show();
  });
  await confirmPromise;

  return confirmed.value;
};

const dlgConfirm = useConfirmDialog();
dlgConfirm.confirmHandler = confirmHandler;
</script>
