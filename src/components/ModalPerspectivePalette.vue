<!-- SPDX-License-Identifier: BSD-2-Clause
     Copyright (c) 2022, Jari Hämäläinen, Carita Kiili and Julie Coiro -->
<template lang="pug">
ModalBase.modal-perspective-palette(
  v-bind='bind'
  ref='modal'
)
  template(v-slot:body)
    WordCloud.mx-3(
      :words='tc("text.perspectives")'
      ref='wordCloud'
    )
</template>

<script setup lang="ts">
import {ref} from 'vue';
import {useI18n} from 'vue-i18n';
import WordCloud from '@/components/WordCloud2.vue';
import ModalBase from '@/components/ModalBase.vue';
import useModalBase from '@/composition/ModalBase';

const {t} = useI18n();
const tc = (s: string) => t(`component.modal-perspective-palette.${s}`);

const modal = ref<InstanceType<typeof ModalBase>>();
const {modalInterface, bind} = useModalBase(modal, {
  haveBtnOk: false,
  clsDialog: ['modal-lg'],
  clsBody: ['overflow-auto'],
  txtTitle: 'component.modal-perspective-palette.text.title',
  txtBtnCancel: 'component.modal-perspective-palette.btn.close.text',
  ariaBtnClose: 'component.modal-perspective-palette.btn.close.aria-label',
});
const wordCloud = ref<InstanceType<typeof WordCloud>>();
defineExpose({
  ...modalInterface,
  show: () => {
    modalInterface.show();
    // if (wordCloud.value) wordCloud.value.resizeLayout();
    if (wordCloud.value) {
      wordCloud.value.createCloud();
    }
  },
});
</script>
