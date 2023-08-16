<!-- SPDX-License-Identifier: BSD-2-Clause
     Copyright (c) 2022, Jari Hämäläinen, Carita Kiili and Julie Coiro -->
<template lang="pug">
.modal.modal-base(ref='elModal')
  .modal-dialog(
      :class='clsDialog'
    )
    .modal-content
      .modal-header
        h5.modal-title {{ txtTitle ? t(txtTitle) : '' }}
        button.btn-close(
          v-if='haveBtnClose'
          ref='btnClose'
          data-bs-dismiss='modal'
          :aria-label='ariaBtnClose ? t(ariaBtnClose) : undefined'
          @click='$emit("close")'
        )
      .modal-body(
        :class='clsBody'
      )
        slot(name='body')
      .modal-footer(
        :class='clsFooter'
      )
        slot(name='footer')
          button.btn(
            v-if='haveBtnCancel'
            ref='btnCancel'
            :class='clsBtnCancel'
            data-bs-dismiss='modal'
            @click='$emit("cancel")'
          ) {{ txtBtnCancel ? t(txtBtnCancel) : '' }}
          button.btn.btn-outline-primary(
            v-if='haveBtnOk'
            ref='btnOk'
            :class='haveBtnOk'
            @click='$emit("ok")'
          ) {{ txtBtnOk ? t(txtBtnOk) : '' }}
</template>

<script setup lang="ts">
import {onBeforeUnmount, onMounted, ref} from 'vue';
import {useI18n} from 'vue-i18n';
import {Modal} from 'bootstrap';
import type {ModalBaseOpts} from '@/composition/ModalBase';

const {t} = useI18n();

interface Props extends ModalBaseOpts {
  txtTitle?: string;
  txtBtnOk?: string;
  txtBtnCancel?: string;
  ariaBtnClose?: string;
  haveBtnClose?: boolean;
  haveBtnOk?: boolean;
  haveBtnCancel?: boolean;
  clsBtnOk?: string[];
  clsBtnCancel?: string[];
  clsDialog?: string[];
  clsBody?: string[];
  clsFooter?: string[];
  focusOrder?: ('ok' | 'cancel' | 'close')[];
}
const props = withDefaults(defineProps<Props>(), {
  txtTitle: undefined,
  txtBtnOk: undefined,
  txtBtnCancel: undefined,
  ariaBtnClose: undefined,
  haveBtnClose: true,
  haveBtnOk: true,
  haveBtnCancel: true,
  clsBtnOk: () => ['btn-outline-primary'],
  clsBtnCancel: () => ['btn-outline-secondary'],
  clsDialog: () => [],
  clsBody: () => [],
  clsFooter: () => [],
  focusOrder: () => ['ok', 'cancel', 'close'],
});

const emit = defineEmits(['close', 'cancel', 'ok', 'shown', 'hidden']);

const elModal = ref<HTMLDivElement>();
let modal: Modal | null = null;

const btnCancel = ref<HTMLButtonElement>();
const btnOk = ref<HTMLButtonElement>();
const btnClose = ref<HTMLButtonElement>();

onMounted(() => {
  if (!elModal.value) return;
  modal = new Modal(elModal.value);
  elModal.value.addEventListener('shown.bs.modal', onShown);
  elModal.value.addEventListener('hidden.bs.modal', onHidden);
});
onBeforeUnmount(() => {
  if (modal) {
    modal.dispose();
  }
  if (elModal.value) {
    elModal.value.removeEventListener('shown.bs.modal', onShown);
    elModal.value.removeEventListener('hidden.bs.modal', onHidden);
  }
  modal = null;
});
const doDefaultFocus = () => {
  for (const btn of props.focusOrder) {
    switch (btn) {
      case 'ok':
        if (btnOk.value) return btnOk.value.focus();
        break;
      case 'cancel':
        if (btnCancel.value) return btnCancel.value.focus();
        break;
      case 'close':
        if (btnClose.value) return btnClose.value.focus();
        break;
    }
  }
};
const onShown = () => {
  // Try to focus ok, cancel or close button by default when shown
  doDefaultFocus();

  emit('shown');
};
const onHidden = () => emit('hidden');

const show = () => modal?.show();
const hide = () => modal?.hide();

defineExpose({show, hide});
</script>

<style lang="scss"></style>
