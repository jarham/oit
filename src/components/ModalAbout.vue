<!-- SPDX-License-Identifier: BSD-2-Clause
     Copyright (c) 2022, Jari Hämäläinen, Carita Kiili and Julie Coiro -->
<template lang="pug">
ModalBase.modal-about(
  v-bind='bind'
  ref='modal'
)
  template(v-slot:body)
    section.about-license
      h5 {{ tc('heading.license') }}
      MarkdownElement.mx-3(
        :markdown='license'
      )
</template>

<script setup lang="ts">
import {ref} from 'vue';
import {useI18n} from 'vue-i18n';
import MarkdownElement from '@/components/MarkdownElement.vue';
import LICENSE from '../../LICENSE';
import ModalBase from '@/components/ModalBase.vue';
import useModalBase from '@/composition/ModalBase';

const {t} = useI18n();
const tc = (s: string) => t(`component.modal-about.${s}`);

const modal = ref<InstanceType<typeof ModalBase>>();
const {modalInterface, bind} = useModalBase(modal, {
  haveBtnOk: false,
  clsDialog: ['modal-lg'],
  clsBody: ['overflow-auto'],
  txtTitle: 'component.modal-about.text.title',
  txtBtnCancel: 'component.modal-about.btn.close.text',
  ariaBtnClose: 'component.modal-about.btn.close.aria-label',
});

const license = ref(`\`\`\`\n${LICENSE}\n\`\`\``);

defineExpose({...modalInterface});
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
