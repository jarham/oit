<!-- SPDX-License-Identifier: BSD-2-Clause
     Copyright (c) 2022, Jari Hämäläinen, Carita Kiili and Julie Coiro -->
<template lang="pug">
ModalBase.modal-languages(
  v-bind='bind'
  ref='modal'
)
  template(v-slot:body)
    ul.list-group.language-popup
      li.list-group-item.list-group-item-action(
        v-for='l in languages'
        @click='$emit("set-language", l)'
      ) {{ l.name }}
</template>

<script setup lang="ts">
import {ref} from 'vue';
import type {OitLanguage} from '@/composition/ModalLanguages';
import ModalBase from '@/components/ModalBase.vue';
import useModalBase from '@/composition/ModalBase';

interface Props {
  languages: OitLanguage[];
}
defineProps<Props>();
defineEmits<{
  (event: 'set-language', lang: OitLanguage): void;
}>();

const modal = ref<InstanceType<typeof ModalBase>>();
const {modalInterface, bind} = useModalBase(modal, {
  haveBtnOk: false,
  txtTitle: 'component.modal-languages.text.title',
  txtBtnCancel: 'component.modal-languages.btn.cancel.text',
  ariaBtnClose: 'component.modal-languages.btn.close.aria-label',
});
defineExpose({...modalInterface});
</script>
