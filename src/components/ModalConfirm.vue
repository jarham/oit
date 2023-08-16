<!-- SPDX-License-Identifier: BSD-2-Clause
     Copyright (c) 2022, Jari Hämäläinen, Carita Kiili and Julie Coiro -->
<template lang="pug">
ModalBase.modal-confirm(
  v-bind='bind'
  ref='modal'
  @ok='onConfirmed'
  @hidden='onHidden'
)
  template(#body)
    section
      MarkdownElement.mx-3(
        :markdown='tc("text.body")'
      )
</template>

<script setup lang="ts">
import {computed, ref} from 'vue';
import {useI18n} from 'vue-i18n';
import {useConfirmDialog} from '@/vue-plugins/plugin-confirm-dialog';
import MarkdownElement from '@/components/MarkdownElement.vue';
import ModalBase from '@/components/ModalBase.vue';
import useModalBase from '@/composition/ModalBase';

// Just any existing action by default
const action = ref('chart-new-unsaved');
const {t} = useI18n();
const tc = (s: string) => t(`component.modal-confirm.${action.value}.${s}`);

const confirmed = ref(false);

const modal = ref<InstanceType<typeof ModalBase>>();
const {modalInterface, bind} = useModalBase(modal, {
  txtTitle: computed(
    () => `component.modal-confirm.${action.value}.text.title`,
  ),
  txtBtnCancel: computed(
    () => `component.modal-confirm.${action.value}.btn.cancel.text`,
  ),
  txtBtnOk: computed(
    () => `component.modal-confirm.${action.value}.btn.confirm.text`,
  ),
  ariaBtnClose: computed(
    () => `component.modal-confirm.${action.value}.btn.close.aria-label`,
  ),
  focusOrder: ['cancel', 'close', 'ok'],
});

defineExpose({...modalInterface});

const onConfirmed = () => {
  confirmed.value = true;
  modalInterface.hide();
};
const onHidden = () => {
  const r = confirmResolve;
  confirmResolve = null;
  if (r) {
    r();
  }
};

let confirmResolve: (() => void) | null = null;
const confirmHandler = async (act: string): Promise<boolean> => {
  if (!modal.value) return true;
  if (confirmResolve) {
    throw new Error('Double confirm dialog show');
  }
  confirmed.value = false;
  action.value = act;

  const confirmPromise = new Promise<void>((resolve) => {
    if (!modal.value) {
      confirmed.value = true;
      return resolve();
    }
    confirmResolve = resolve;
    modalInterface.show();
  });
  await confirmPromise;

  return confirmed.value;
};

const dlgConfirm = useConfirmDialog();
dlgConfirm.confirmHandler = confirmHandler;
</script>
