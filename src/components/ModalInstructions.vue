<!-- SPDX-License-Identifier: BSD-2-Clause
     Copyright (c) 2022, Jari Hämäläinen, Carita Kiili and Julie Coiro -->
<template lang="pug">
ModalBase.modal-instructions(
  v-bind='bind'
  ref='modal'
)
  template(v-slot:body)
    MarkdownElement.mx-3(
      :markdown='tc("text.instructions")'
    )
</template>

<script setup lang="ts">
import {ref} from 'vue';
import {useI18n} from 'vue-i18n';
import MarkdownElement from '@/components/MarkdownElement.vue';
import ModalBase from '@/components/ModalBase.vue';
import useModalBase from '@/composition/ModalBase';

const {t} = useI18n();
const tc = (s: string) => t(`component.modal-instructions.${s}`);

const modal = ref<InstanceType<typeof ModalBase>>();
const {modalInterface, bind} = useModalBase(modal, {
  haveBtnOk: false,
  clsDialog: ['modal-lg'],
  clsBody: ['overflow-auto'],
  txtTitle: 'component.modal-instructions.text.title',
  txtBtnCancel: 'component.modal-instructions.btn.close.text',
  ariaBtnClose: 'component.modal-instructions.btn.close.aria-label',
});
defineExpose({...modalInterface});
</script>

<style lang="scss">
.modal-instructions .modal-content {
  max-height: 94vh;
}
</style>
